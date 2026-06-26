const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toQueryString(params: Record<string, any>) {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')),
  ).toString();
}

async function readJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Public read-only dashboard.
// If user has JWT, we still attach it, but login is no longer required for viewing.
export async function fetchPayments(params: Record<string, any>) {
  const qs = toQueryString(params);

  const res = await fetch(`${API}/admin/payments?${qs}`, {
    headers: { ...authHeaders() },
  });

  const data = await readJsonSafe(res);

  if (!res.ok) {
    throw new Error(data?.message || 'failed');
  }

  return data as { items: any[]; total: number; page: number; pageSize: number };
}

// Protected admin action.
// CSV export requires Authorization header, so <a href="..."> 방식 말고 fetch로 받아야 함.
export async function downloadPaymentsCsv(params: Record<string, any>) {
  const token = getToken();

  if (!token) {
    throw new Error('CSV export requires admin wallet login.');
  }

  const qs = toQueryString(params);

  const res = await fetch(`${API}/admin/payments/export.csv?${qs}`, {
    headers: { ...authHeaders() },
  });

  if (!res.ok) {
    const data = await readJsonSafe(res);

    if (res.status === 401 || res.status === 403) {
      throw new Error('CSV export requires admin wallet login.');
    }

    throw new Error(data?.message || 'CSV export failed.');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `payments-${Date.now()}.csv`;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
