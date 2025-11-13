import {
  getAccount,
  getPublicClient,
  getWalletClient,
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
  tokenAddress: `0x${string}`; // ZERO면 네이티브
  tokenSymbol: string; // UI용
  amount: string; // "0.01" 이런 문자열
  orderId: number; // 서버/클라 어디서든 생성
  decimals?: number; // ERC20은 보통 컨피그/메타데이터로 주입
};

export async function payInvoice(inv: PayInvoiceInput) {
  // 0) 체인/계정 준비
  const wallet = await getWalletClient(wagmiConfig, { chainId: inv.chainId });
  if (!wallet) throw new Error('Wallet not connected');

  // 지갑 체인이 다르면 스위치 (유저 확인 팝업 뜸)
  const account = getAccount(wagmiConfig);
  if (!account?.address) throw new Error('No account selected');

  // 일부 지갑은 현재 체인을 wallet 객체가 아닌 글로벌로 들고 있으므로 명시 스위치 권장
  await switchChain(wagmiConfig, { chainId: inv.chainId }).catch(() => {
    // 사용자가 거절할 수 있음
    throw new Error('Please switch to the correct network');
  });

  const publicClient = getPublicClient(wagmiConfig, { chainId: inv.chainId });
  const gateway = addresses.PaymentGateway as `0x${string}`;
  const isNative = inv.tokenAddress === ZERO;
  const decimals = inv.decimals ?? 18; // 네이티브 기본 18
  const amount = parseUnits(inv.amount, decimals);

  // 1) (ERC20) allowance 확인 → 부족하면 approve
  if (!isNative) {
    const allowance = (await readContract(wagmiConfig, {
      address: inv.tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address as `0x${string}`, gateway],
      chainId: inv.chainId,
    })) as bigint;

    if (allowance < amount) {
      // 가스/리버트 미리 확인 (시뮬레이션)
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
        args: [gateway, amount], // 필요시 최대치(BigInt 최대값)로도 가능
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

  // 2) pay() 사전 시뮬레이션 → 실패 사유를 UX에서 곧장 표출
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

  // 4) (보수적) 컨펌 대기 후 백엔드에 제출
  const rcpt = await waitForTransactionReceipt(wagmiConfig, { hash: payTx, chainId: inv.chainId });
  if (rcpt.status !== 'success') {
    // EIP-1559 가진 지갑/네트워크에서 가스부족/리버트 등 케이스
    throw new Error('Payment transaction reverted');
  }

  // 5) 백엔드 confirm (타임아웃/리트라이 방어)
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
    if (!res.ok) throw new Error(backend?.message || 'confirm failed');
  } finally {
    clearTimeout(timer);
  }

  return {
    txHash: payTx,
    backend,
  };
}
