import {
  getAccount,
  switchChain,
  writeContract,
  waitForTransactionReceipt,
  readContract,
  simulateContract,
} from 'wagmi/actions';
import { erc20Abi, parseUnits } from 'viem';
import gatewayAbi from '@/contracts/PaymentGateway.abi.json';
import addresses from '@/contracts/addresses.json';
import { wagmiConfig } from '@/lib/wagmiConfig';
import { sepolia } from 'wagmi/chains';

type ChainId = (typeof sepolia)['id'];

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const ZERO: `0x${string}` = '0x0000000000000000000000000000000000000000';

export type PayInvoiceInput = {
  invoiceId: string;
  chainId: ChainId;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  amount: string;
  orderId: number;
  decimals?: number;
};

function getGatewayAddress(chainId: number): `0x${string}` {
  const a = addresses as any;

  const gateway =
    a.PaymentGateway ?? a[String(chainId)]?.PaymentGateway ?? a[chainId]?.PaymentGateway;

  if (!gateway || typeof gateway !== 'string') {
    throw new Error(`PaymentGateway address not found for chain ${chainId}`);
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(gateway)) {
    throw new Error(`Invalid PaymentGateway address: ${gateway}`);
  }

  return gateway as `0x${string}`;
}

function getAbiFunctionNames() {
  const abi = gatewayAbi as any[];

  return abi
    .filter((x) => x?.type === 'function')
    .map((x) => x.name)
    .filter(Boolean);
}

export async function payInvoice(inv: PayInvoiceInput) {
  const functionNames = getAbiFunctionNames();

  if (!functionNames.includes('pay')) {
    throw new Error(
      `Function "pay" not found on ABI. Available functions: ${functionNames.join(', ')}`,
    );
  }

  // 0) 계정/체인 준비
  const account = getAccount(wagmiConfig);

  if (!account?.address) {
    throw new Error('Wallet not connected. Please connect your wallet on the login page first.');
  }

  if (account.chainId !== inv.chainId) {
    await switchChain(wagmiConfig, { chainId: inv.chainId }).catch(() => {
      throw new Error('Please switch your wallet network to Sepolia.');
    });
  }

  const gateway = getGatewayAddress(inv.chainId);
  const isNative = inv.tokenAddress.toLowerCase() === ZERO.toLowerCase();
  const decimals = inv.decimals ?? 18;
  const amount = parseUnits(inv.amount, decimals);

  // 1) ERC20이면 allowance 확인 → 부족하면 approve
  if (!isNative) {
    const allowance = (await readContract(wagmiConfig, {
      address: inv.tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address as `0x${string}`, gateway],
      chainId: inv.chainId,
    })) as bigint;

    if (allowance < amount) {
      await simulateContract(wagmiConfig, {
        address: inv.tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [gateway, amount],
        chainId: inv.chainId,
        account: account.address as `0x${string}`,
      });

      const approveTx = await writeContract(wagmiConfig, {
        address: inv.tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [gateway, amount],
        chainId: inv.chainId,
      });

      const approveRcpt = await waitForTransactionReceipt(wagmiConfig, {
        hash: approveTx,
        chainId: inv.chainId,
      });

      if (approveRcpt.status !== 'success') {
        throw new Error('Approve failed. Please try again.');
      }
    }
  }

  // 2) pay() 사전 시뮬레이션
  await simulateContract(wagmiConfig, {
    address: gateway,
    abi: gatewayAbi as any,
    functionName: 'pay',
    args: [inv.tokenAddress, amount, BigInt(inv.orderId), inv.invoiceId],
    chainId: inv.chainId,
    account: account.address as `0x${string}`,
    ...(isNative ? { value: amount } : {}),
  });

  // 3) pay() 실제 호출
  const payTx = await writeContract(wagmiConfig, {
    address: gateway,
    abi: gatewayAbi as any,
    functionName: 'pay',
    args: [inv.tokenAddress, amount, BigInt(inv.orderId), inv.invoiceId],
    chainId: inv.chainId,
    ...(isNative ? { value: amount } : {}),
  });

  // 4) 컨펌 대기
  const rcpt = await waitForTransactionReceipt(wagmiConfig, {
    hash: payTx,
    chainId: inv.chainId,
  });

  if (rcpt.status !== 'success') {
    throw new Error('Payment transaction reverted');
  }

  // 5) 백엔드 confirm
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  let backend: any;

  try {
    const res = await fetch(`${API}/api/payments/${inv.invoiceId}/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash: payTx }),
      signal: controller.signal,
    });

    backend = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(backend?.message || 'confirm failed');
    }
  } finally {
    clearTimeout(timer);
  }

  return {
    txHash: payTx,
    backend,
  };
}
