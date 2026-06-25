const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export type AdminPaymentParams = {
  status?: string;
  chainId?: number | '';
  from?: string;
  to?: string;
  q?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
};

function getJwt() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jwt');
}

function buildQuery(params: AdminPaymentParams) {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    qs.set(key, String(value));
  });

  return qs.toString();
}

export async function fetchPayments(params: AdminPaymentParams) {
  const jwt = getJwt();

  if (!jwt) {
    throw new Error('LOGIN_REQUIRED');
  }

  const query = buildQuery(params);

  const res = await fetch(`${API}/admin/payments?${query}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function downloadPaymentsCsv(params: AdminPaymentParams) {
  const jwt = getJwt();

  if (!jwt) {
    throw new Error('LOGIN_REQUIRED');
  }

  const query = buildQuery(params);

  const res = await fetch(`${API}/admin/payments/export.csv?${query}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `payments-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}
