import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { randomBytes } from 'crypto';
import { toStatus } from 'src/common/constants/invoice-status';
import { envUrl } from 'src/utils/env';
import { parseUnits } from 'viem';
import { ethers, JsonRpcProvider } from 'ethers';

@Injectable()
export class PaymentsService {
  private readonly provider: JsonRpcProvider;

  constructor(private prisma: PrismaService) {
    const rpcUrl = envUrl('RPC_URL');
    // 실패 시 provider에 에러를 대입하지 말고 throw로만 전파
    this.provider = new JsonRpcProvider(rpcUrl);
  }

  async createInvoice(dto: CreateInvoiceDto, forUserId?: number) {
    const tokenAddr = dto.tokenAddress.toLowerCase();

    // 1) whitelist check
    const token = await this.prisma.tokenWhitelist.findUnique({
      where: {
        chainId_tokenAddress: { chainId: dto.chainId, tokenAddress: tokenAddr },
      },
    });
    if (!token || !token.enabled)
      throw new BadRequestException('Token not allowed');

    // 2) amount validate: must be positive decimal string
    if (!/^\d+(\.\d+)?$/.test(dto.amount))
      throw new BadRequestException('Invalid amount');

    // 3) generate invoiceId (short, unique)
    const invoiceId = randomBytes(8).toString('hex');

    // 4) expiry
    const expiresAt = dto.expireSeconds
      ? new Date(Date.now() + dto.expireSeconds * 1000)
      : undefined;

    // 5) persist
    const inv = await this.prisma.invoice.create({
      data: {
        invoiceId,
        status: 'pending',
        chainId: dto.chainId,
        tokenAddress: tokenAddr,
        tokenSymbol: token.tokenSymbol,
        amount: dto.amount,
        toAddress: dto.toAddress,
        forUserId,
        expiresAt,
        metaJson: dto.description
          ? { description: dto.description }
          : undefined,
      },
    });

    return {
      invoiceId: inv.invoiceId,
      status: toStatus(inv.status),
      chainId: inv.chainId,
      tokenAddress: inv.tokenAddress,
      tokenSymbol: inv.tokenSymbol,
      amount: inv.amount,
      toAddress: inv.toAddress,
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt?.toISOString(),
    };
  }

  async getInvoice(invoiceId: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { invoiceId } });
    if (!inv) throw new BadRequestException('invoice not found');
    return {
      invoiceId: inv.invoiceId,
      status: toStatus(inv.status),
      chainId: inv.chainId,
      tokenAddress: inv.tokenAddress,
      tokenSymbol: inv.tokenSymbol,
      amount: inv.amount,
      toAddress: inv.toAddress,
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt?.toISOString(),
      txHash: inv.txHash ?? undefined,
      payerAddress: inv.payerAddress ?? undefined,
    };
  }

  // 문자열 금액 → on-chain 정수(BigInt)
  private async toUnits(
    amountStr: string,
    chainId: number,
    tokenAddress: string,
  ): Promise<bigint> {
    if (!/^\d+(\.\d+)?$/.test(amountStr)) {
      throw new BadRequestException('Invalid amount format');
    }
    const ZERO = '0x0000000000000000000000000000000000000000';

    let decimals = 18;
    if (tokenAddress.toLowerCase() !== ZERO) {
      const t = await this.prisma.tokenWhitelist.findUnique({
        where: {
          chainId_tokenAddress: {
            chainId,
            tokenAddress: tokenAddress.toLowerCase(),
          },
        },
        select: { decimals: true },
      });
      if (typeof t?.decimals === 'number') decimals = t.decimals;
    }

    const v = parseUnits(amountStr, decimals);
    return v;
  }

  // 결제 확인
  async confirmPayment(invoiceId: string, txHash: string) {
    if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      throw new BadRequestException('invalid txHash');
    }

    // 1) 인보이스 조회
    const inv = await this.prisma.invoice.findUnique({ where: { invoiceId } });
    if (!inv) throw new BadRequestException('invoice not found');
    if (inv.status !== 'pending') throw new BadRequestException('not pending');

    const chainIdEnv = Number(process.env.CHAIN_ID);
    if (inv.chainId !== chainIdEnv)
      throw new BadRequestException('wrong chain');

    // 2) 트랜잭션 조회
    const tx = await this.provider.getTransaction(txHash);
    if (!tx) throw new BadRequestException('tx not found');
    if (tx.chainId && Number(tx.chainId) !== inv.chainId) {
      throw new BadRequestException('chain mismatch');
    }

    // 3) 수신 주소: gateway 확인
    const gateway = (process.env.CONTRACT_ADDRESS || '').toLowerCase();
    if (!gateway) throw new Error('CONTRACT_ADDRESS missing');
    if ((tx.to ?? '').toLowerCase() !== gateway) {
      throw new BadRequestException('tx.to not gateway');
    }

    // 4) 영수증
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      await this.prisma.invoice.update({
        where: { invoiceId },
        data: {
          txHash,
          status: 'submitted',
          payerAddress: tx.from?.toLowerCase(),
        },
      });
      return { status: 'submitted', txHash };
    }

    // 5) 금액 검증
    const ZERO = '0x0000000000000000000000000000000000000000';
    const wantNative = inv.tokenAddress.toLowerCase() === ZERO;
    const expected = await this.toUnits(
      inv.amount,
      inv.chainId,
      inv.tokenAddress,
    );
    const feeRecipient = (process.env.FEE_RECIPIENT || gateway).toLowerCase();

    let okAmount = false;

    if (wantNative) {
      const sent = tx.value ?? 0n;
      okAmount = sent === expected;
    } else {
      const iface = new ethers.Interface([
        'event Transfer(address indexed from,address indexed to,uint256 value)',
      ]);
      const tokenAddrLower = inv.tokenAddress.toLowerCase();
      const tokenLogs = receipt.logs.filter(
        (l) => l.address.toLowerCase() === tokenAddrLower,
      );
      for (const l of tokenLogs) {
        try {
          const parsed = iface.parseLog({
            topics: l.topics as string[],
            data: l.data,
          });
          if (!parsed || !parsed.args) continue;
          const to = (parsed.args[1] as string).toLowerCase();
          const v = parsed.args[2] as bigint;
          if (to === feeRecipient || to === gateway) {
            if (v === expected) {
              okAmount = true;
              break;
            }
          }
        } catch {
          /* empty */
        }
      }
    }

    // 6) 상태 업데이트
    const newStatus = okAmount ? 'paid' : 'failed';
    await this.prisma.invoice.update({
      where: { invoiceId },
      data: {
        status: newStatus,
        txHash,
        payerAddress: tx.from?.toLowerCase(),
      },
    });

    return { status: newStatus, txHash, payer: tx.from };
  }
}
