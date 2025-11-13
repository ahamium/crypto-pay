import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { ethers, Log } from 'ethers';
import { toUnits } from '../payments/amount.util';

const ZERO = '0x0000000000000000000000000000000000000000';

/**
pending : 인보이스 생성 직후
submitted: tx가 네트워크에 제출되어(혹은 receipt 대기 중) “진행 중”
paid : 검증 OK + 컨펌 수 >= minConf
failed : 리버트/검증불일치/재시도초과
 */
@Injectable()
export class VerifierService {
  private readonly log = new Logger(VerifierService.name);
  private readonly provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  private readonly minConf = Number(process.env.MIN_CONFIRMATIONS ?? 2);
  private readonly maxRetries = Number(process.env.MAX_VERIFY_RETRIES ?? 30);

  constructor(private prisma: PrismaService) {}

  // 폴링 주기
  @Cron(`*/${process.env.POLL_INTERVAL_SEC ?? 20} * * * * *`)
  async tick() {
    const list = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['pending', 'submitted'] },
        txHash: { not: null },
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    for (const inv of list) {
      try {
        await this.processOne(inv.id);
      } catch (e) {
        this.log.warn(`verify invoice ${inv.invoiceId}: ${String(e)}`);
      }
    }
  }

  private async processOne(id: number) {
    const inv = await this.prisma.invoice.findUniqueOrThrow({ where: { id } });

    // 재시도 한도
    if (inv.verifyRetries >= this.maxRetries) {
      await this.prisma.invoice.update({
        where: { id: inv.id },
        data: { status: 'failed', lastCheckedAt: new Date() },
      });
      // 웹훅 제거: 로그만
      this.log.warn(`invoice.failed (max_retries): ${inv.invoiceId}`);
      return;
    }

    if (!inv.txHash) {
      await this.prisma.invoice.update({
        where: { id: inv.id },
        data: { verifyRetries: { increment: 1 }, lastCheckedAt: new Date() },
      });
      return;
    }

    const tx = await this.provider.getTransaction(inv.txHash);
    if (!tx) {
      // 아직 네트워크에 없음
      await this.bumpRetry(inv.id);
      return;
    }

    const rc = await this.provider.getTransactionReceipt(inv.txHash);
    if (!rc) {
      // 미채굴
      await this.markSubmitted(inv.id, tx.from ?? undefined);
      return;
    }

    if (rc.status === 0) {
      await this.prisma.invoice.update({
        where: { id: inv.id },
        data: {
          status: 'failed',
          lastCheckedAt: new Date(),
          confirmations: 0,
          payerAddress: tx.from?.toLowerCase(),
        },
      });
      this.log.warn(
        `invoice.failed (reverted): ${inv.invoiceId} tx=${inv.txHash}`,
      );
      return;
    }

    // 컨펌 수 계산
    const latest = await this.provider.getBlockNumber();
    const conf = Math.max(0, latest - (rc.blockNumber ?? latest) + 1);

    // 금액/수신자 검증
    const isOk = await this.basicValidate(inv, tx, rc);
    if (!isOk) {
      await this.prisma.invoice.update({
        where: { id: inv.id },
        data: {
          status: 'failed',
          confirmations: conf,
          lastCheckedAt: new Date(),
          payerAddress: tx.from?.toLowerCase(),
        },
      });
      this.log.warn(
        `invoice.failed (amount_or_to_mismatch): ${inv.invoiceId} tx=${inv.txHash}`,
      );
      return;
    }

    if (conf >= this.minConf) {
      await this.prisma.invoice.update({
        where: { id: inv.id },
        data: {
          status: 'paid',
          confirmations: conf,
          confirmedAt: new Date(),
          lastCheckedAt: new Date(),
          payerAddress: tx.from?.toLowerCase(),
        },
      });
      this.log.log(`invoice.paid: ${inv.invoiceId} tx=${inv.txHash}`);
    } else {
      await this.prisma.invoice.update({
        where: { id: inv.id },
        data: {
          status: 'submitted',
          confirmations: conf,
          lastCheckedAt: new Date(),
          payerAddress: tx.from?.toLowerCase(),
        },
      });
    }
  }

  private async bumpRetry(id: number) {
    await this.prisma.invoice.update({
      where: { id },
      data: { verifyRetries: { increment: 1 }, lastCheckedAt: new Date() },
    });
  }

  private async markSubmitted(id: number, from?: string) {
    await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'submitted',
        lastCheckedAt: new Date(),
        payerAddress: from?.toLowerCase(),
      },
    });
  }

  // 금액/수신자 검증(1차)
  private async basicValidate(inv: any, tx: any, rc: any): Promise<boolean> {
    // 체인 / 수신 컨트랙트
    const gateway = (process.env.CONTRACT_ADDRESS || '').toLowerCase();
    if (!gateway || (tx.to ?? '').toLowerCase() !== gateway) return false;

    // 화이트리스트에서 decimals 가져오기
    const token = await this.prisma.tokenWhitelist.findUnique({
      where: {
        chainId_tokenAddress: {
          chainId: inv.chainId as number,
          tokenAddress: String(inv.tokenAddress).toLowerCase(),
        },
      },
    });
    const decimals = token?.decimals ?? 18;

    // native vs erc20
    if (inv.tokenAddress.toLowerCase() === ZERO) {
      const want = toUnits(inv.amount as string, 18);
      return (tx.value ?? 0n) === want;
    } else {
      const iface = new ethers.Interface([
        'event Transfer(address indexed from,address indexed to,uint256 value)',
      ]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const logs: Log[] = rc.logs.filter(
        (l: Log) => l.address?.toLowerCase() === inv.tokenAddress.toLowerCase(),
      );
      const want = toUnits(String(inv.amount), decimals);
      for (const l of logs) {
        try {
          const parsed = iface.parseLog({
            topics: l.topics as string[],
            data: l.data,
          });
          if (!parsed) continue;
          const to = (parsed.args[1] as string).toLowerCase();
          const v = parsed.args[2] as bigint;
          if (to === gateway && v === want) return true;
        } catch {
          /* empty */
        }
      }
      return false;
    }
  }
}
