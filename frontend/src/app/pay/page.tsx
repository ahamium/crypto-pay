'use client';

import { InvoiceResponse } from '@/types/payments';
import { useState } from 'react';
import { payInvoice } from '@/lib/pay';
import { sepolia } from 'wagmi/chains';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export default function PayPage() {
  const [chainId, setChainId] = useState(11155111);
  const [tokenAddress, setTokenAddress] = useState('0x0000000000000000000000000000000000000000'); // native
  const [amount, setAmount] = useState('0.01');
  const [toAddress, setToAddress] = useState('0xYourMerchantOrContract'); // fill yours
  const [description, setDescription] = useState('Test payment');
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [backendResult, setBackendResult] = useState<any | null>(null);

  async function createInvoice() {
    setLoading(true);
    // 새 인보이스 만들 때, 이전 결제 상태 리셋
    setPaying(false);
    setPayError(null);
    setTxHash(null);
    setBackendResult(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
      const res = await fetch(`${API}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ chainId, tokenAddress, amount, toAddress, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed');
      setInvoice(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePay() {
    if (!invoice) return;

    setPaying(true);
    setPayError(null);
    setTxHash(null);
    setBackendResult(null);

    try {
      // 백엔드가 내려준 필드명에 맞춰 사용 (필요 시 아래 매핑 수정)
      const r = await payInvoice({
        invoiceId: invoice.invoiceId, // string
        chainId: toSupportedChainId(invoice.chainId), // number
        tokenAddress: invoice.tokenAddress as `0x${string}`, // "0x0..." 문자열
        tokenSymbol: invoice.tokenSymbol ?? 'TOKEN', // 없으면 표시용 기본값
        amount: invoice.amount, // "0.01" 같은 문자열
        orderId: Date.now(), // 데모용(서버 생성도 가능)
        decimals: invoice.decimals ?? 18, // 네이티브 18, 토큰은 Week6에 정확화
      });

      setTxHash(r.txHash);
      setBackendResult(r.backend);
    } catch (e: any) {
      setPayError(e?.message ?? 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  const toSupportedChainId = (id: number) => {
    if (id !== sepolia.id) throw new Error(`Unsupported chain: ${id}`);
    return id as typeof sepolia.id;
  };

  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>Create Payment (Pending)</h1>

      <label>Chain ID</label>
      <input value={chainId} onChange={(e) => setChainId(Number(e.target.value))} />

      <label style={{ marginTop: 12 }}>Token Address ("0x0" for native ETH)</label>
      <input value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} />

      <label style={{ marginTop: 12 }}>Amount</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} />

      <label style={{ marginTop: 12 }}>Receiver (toAddress)</label>
      <input value={toAddress} onChange={(e) => setToAddress(e.target.value)} />

      <label style={{ marginTop: 12 }}>Description</label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} />

      <div style={{ marginTop: 16 }}>
        <button onClick={createInvoice} disabled={loading}>
          {loading ? 'Creating…' : 'Create Invoice'}
        </button>
      </div>

      {invoice && (
        <section style={{ marginTop: 24 }}>
          <h2>Pending Created</h2>
          <pre>{JSON.stringify(invoice, null, 2)}</pre>

          <button onClick={handlePay} disabled={paying}>
            {paying ? 'Paying…' : 'Pay on-chain'}
          </button>

          {txHash && <p style={{ marginTop: 12 }}>Tx submitted: {txHash}</p>}

          {backendResult && (
            <pre style={{ marginTop: 12 }}>{JSON.stringify(backendResult, null, 2)}</pre>
          )}

          {payError && <p style={{ color: 'crimson', marginTop: 12 }}>{payError}</p>}
        </section>
      )}
    </main>
  );
}
