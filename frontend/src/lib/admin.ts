const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchPayments(params: Record<string, any>) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')),
  ).toString();
  const res = await fetch(`${API}/admin/payments?${qs}`, { headers: { ...authHeaders() } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'failed');
  return data as { items: any[]; total: number; page: number; pageSize: number };
}

export function exportCsvUrl(params: Record<string, any>) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')),
  ).toString();
  return `${API}/admin/payments/export.csv?${qs}`;
}
