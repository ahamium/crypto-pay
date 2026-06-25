'use client';

import Link from 'next/link';
import { InvoiceResponse } from '@/types/payments';
import { useEffect, useState } from 'react';
import { payInvoice } from '@/lib/pay';
import { sepolia } from 'wagmi/chains';
import { useAccount } from 'wagmi';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const ZERO = '0x0000000000000000000000000000000000000000';

function isAddressLike(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export default function PayPage() {
  const { address, chainId, isConnected } = useAccount();

  const [jwt, setJwt] = useState<string | null>(null);

  const [chainIdInput, setChainIdInput] = useState(11155111);
  const [tokenAddress, setTokenAddress] = useState(ZERO);
  const [amount, setAmount] = useState('0.0001');
  const [toAddress, setToAddress] = useState('');
  const [description, setDescription] = useState('Test payment');

  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [backendResult, setBackendResult] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJwt(localStorage.getItem('jwt'));
    }
  }, []);

  async function createInvoice() {
    setPageError(null);

    if (!jwt) {
      setPageError('Please sign in with Ethereum first.');
      return;
    }

    if (chainIdInput !== sepolia.id) {
      setPageError('Only Sepolia is supported in this demo.');
      return;
    }

    if (!isAddressLike(tokenAddress)) {
      setPageError('Invalid token address. Use the zero address for native ETH.');
      return;
    }

    if (!isAddressLike(toAddress)) {
      setPageError('Invalid receiver address. Paste a full 0x wallet address.');
      return;
    }

    if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) {
      setPageError('Invalid amount.');
      return;
    }

    setLoading(true);
    setPaying(false);
    setPayError(null);
    setTxHash(null);
    setBackendResult(null);

    try {
      const res = await fetch(`${API}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          chainId: chainIdInput,
          tokenAddress,
          amount,
          toAddress,
          description,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create invoice.');
      }

      setInvoice(data);
    } catch (e: any) {
      setPageError(e.message || 'Failed to create invoice.');
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
      const r = await payInvoice({
        invoiceId: invoice.invoiceId,
        chainId: toSupportedChainId(invoice.chainId),
        tokenAddress: invoice.tokenAddress as `0x${string}`,
        tokenSymbol: invoice.tokenSymbol ?? 'TOKEN',
        amount: invoice.amount,
        orderId: Date.now(),
        decimals: invoice.decimals ?? 18,
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
    <main style={{ padding: 24, maxWidth: 760 }}>
      <h1>Create Payment</h1>

      <section
        style={{
          padding: 16,
          border: '1px solid #ddd',
          borderRadius: 8,
          background: '#fafafa',
          marginBottom: 20,
        }}
      >
        <p style={{ lineHeight: 1.6, marginTop: 0 }}>
          Demo flow: sign in with Ethereum, create an invoice, then confirm the Sepolia transaction
          in MetaMask.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/login">Go to Login</Link>
          <Link href="/admin">Go to Admin Dashboard</Link>
        </div>

        <div style={{ marginTop: 12, fontSize: 14, color: '#555' }}>
          Wallet:{' '}
          {isConnected && address ? (
            <strong>
              {address.slice(0, 6)}…{address.slice(-4)}
            </strong>
          ) : (
            'Not connected'
          )}
          {' · '}
          Network:{' '}
          <strong style={{ color: chainId === sepolia.id ? 'green' : 'crimson' }}>
            {chainId === sepolia.id ? 'Sepolia' : chainId ? `Wrong network (${chainId})` : 'N/A'}
          </strong>
          {' · '}
          Login:{' '}
          <strong style={{ color: jwt ? 'green' : 'crimson' }}>
            {jwt ? 'Signed in' : 'Required'}
          </strong>
        </div>
      </section>

      {!jwt && (
        <section
          style={{
            padding: 16,
            border: '1px solid #ffd591',
            background: '#fff7e6',
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <strong>Login required.</strong>
          <p style={{ lineHeight: 1.6 }}>
            Please sign in with Ethereum first. After login, come back to this payment page.
          </p>
          <Link href="/login">Sign in now</Link>
        </section>
      )}

      <section style={{ display: 'grid', gap: 10 }}>
        <label>Chain ID</label>
        <input value={chainIdInput} onChange={(e) => setChainIdInput(Number(e.target.value))} />

        <label>Token Address</label>
        <input value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} />
        <small>Use {ZERO} for native Sepolia ETH.</small>

        <label>Amount</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        <small>Use a tiny amount for testing, for example 0.0001.</small>

        <label>Receiver Wallet Address</label>
        <input value={toAddress} onChange={(e) => setToAddress(e.target.value)} />

        {address && (
          <button type="button" onClick={() => setToAddress(address)}>
            Use my connected wallet as receiver
          </button>
        )}

        <label>Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </section>

      {pageError && (
        <p
          style={{
            color: 'crimson',
            background: '#fff1f0',
            border: '1px solid #ffccc7',
            padding: 12,
            borderRadius: 8,
            marginTop: 16,
          }}
        >
          {pageError}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={createInvoice} disabled={loading || !jwt}>
          {loading ? 'Creating…' : 'Create Invoice'}
        </button>
      </div>

      {invoice && (
        <section
          style={{
            marginTop: 24,
            padding: 16,
            border: '1px solid #ddd',
            borderRadius: 8,
          }}
        >
          <h2>Invoice Created</h2>
          <pre style={{ overflowX: 'auto' }}>{JSON.stringify(invoice, null, 2)}</pre>

          <button onClick={handlePay} disabled={paying}>
            {paying ? 'Paying…' : 'Pay on-chain with MetaMask'}
          </button>

          {txHash && (
            <p style={{ marginTop: 12 }}>
              Tx submitted:{' '}
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {txHash}
              </a>
            </p>
          )}

          {backendResult && (
            <pre style={{ marginTop: 12, overflowX: 'auto' }}>
              {JSON.stringify(backendResult, null, 2)}
            </pre>
          )}

          {payError && <p style={{ color: 'crimson', marginTop: 12 }}>{payError}</p>}
        </section>
      )}
    </main>
  );
}
