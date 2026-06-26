'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchPayments, downloadPaymentsCsv } from '@/lib/admin';

type Status = 'pending' | 'submitted' | 'paid' | 'failed' | 'expired' | '';

export default function AdminPage() {
  const [status, setStatus] = useState<Status>('');
  const [chainId, setChainId] = useState<number | ''>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'status' | 'amount' | 'chainId'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [data, setData] = useState<{ items: any[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [jwt, setJwt] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const params = useMemo(
    () => ({ status, chainId, from, to, q, sortBy, sortDir, page, pageSize }),
    [status, chainId, from, to, q, sortBy, sortDir, page, pageSize],
  );

  async function load() {
    setLoading(true);

    try {
      const d = await fetchPayments(params);
      setData({ items: d.items, total: d.total });
    } catch (e: any) {
      alert(e.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  async function handleCsvExport() {
    setCsvLoading(true);

    try {
      await downloadPaymentsCsv(params);
    } catch (e: any) {
      alert(e.message || 'CSV export failed');
    } finally {
      setCsvLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [params]); // 필터 바뀌면 자동 로드

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJwt(localStorage.getItem('jwt'));
    }
  }, []);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin · Payments</h1>
      <section
        style={{
          marginTop: 12,
          marginBottom: 16,
          padding: 16,
          border: '1px solid #ffd591',
          background: '#fff7e6',
          borderRadius: 8,
          maxWidth: 760,
          lineHeight: 1.6,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Read-only Demo Mode</h2>

        <p>
          This dashboard is publicly viewable for portfolio/demo purposes. Visitors can inspect
          payment records, statuses, and transaction hashes, but operational actions are restricted
          to the admin wallet.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              padding: '10px 14px',
              border: '1px solid #ccc',
              borderRadius: 6,
              textDecoration: 'none',
              color: 'black',
              background: 'white',
            }}
          >
            Admin Login
          </Link>

          <Link
            href="/pay"
            style={{
              display: 'inline-block',
              padding: '10px 14px',
              border: '1px solid #ccc',
              borderRadius: 6,
              textDecoration: 'none',
              color: 'black',
              background: 'white',
            }}
          >
            Create Demo Payment
          </Link>
        </div>
      </section>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginTop: 12,
          maxWidth: 1200,
        }}
      >
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as Status);
          }}
        >
          <option value="">status: all</option>
          {['pending', 'submitted', 'paid', 'failed', 'expired'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          placeholder="chainId"
          value={chainId}
          onChange={(e) => {
            setPage(1);
            setChainId(e.target.value ? Number(e.target.value) : '');
          }}
        />
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setPage(1);
            setFrom(e.target.value);
          }}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setPage(1);
            setTo(e.target.value);
          }}
        />
        <input
          placeholder="search (invoice/payer/to/symbol)"
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
        />
        <div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="createdAt">createdAt</option>
            <option value="status">status</option>
            <option value="amount">amount</option>
            <option value="chainId">chainId</option>
          </select>
          <select value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
            <option value="desc">desc</option>
            <option value="asc">asc</option>
          </select>
        </div>
      </section>

      <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => load()} disabled={loading}>
          {loading ? 'Loading…' : 'Reload'}
        </button>
        <label>
          pageSize:
          <select
            value={pageSize}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handleCsvExport} disabled={csvLoading}>
          {csvLoading ? 'Exporting…' : 'Export CSV'}
        </button>
        {!jwt && (
          <span style={{ color: '#666', fontSize: 13 }}>
            CSV export requires admin wallet login.
          </span>
        )}
      </div>

      <section style={{ marginTop: 16, overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[
                'createdAt',
                'invoiceId',
                'status',
                'chainId',
                'token',
                'amount',
                'payer',
                'to',
                'tx',
                'conf',
              ].map((h) => (
                <th
                  key={h}
                  style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                  {row.invoiceId}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{row.status}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{row.chainId}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                  {row.tokenSymbol}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{row.amount}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                  {row.payerAddress ?? '-'}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                  {row.toAddress}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                  {row.txHash ? (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${row.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.txHash.slice(0, 10)}…
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                  {row.confirmations ?? 0}
                </td>
              </tr>
            ))}
            {!data?.items?.length && (
              <tr>
                <td colSpan={10} style={{ padding: 16, textAlign: 'center', color: '#666' }}>
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <span>
          Page {page} / {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </main>
  );
}
