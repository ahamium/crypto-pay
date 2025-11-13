export function env(name: string): string {
  const v = process.env[name];
  if (typeof v !== 'string' || v.trim() === '') {
    throw new Error(`Missing or empty env: ${name}`);
  }
  return v;
}

export function envUrl(name: string): string {
  const v = process.env[name];
  if (typeof v !== 'string' || v.trim() === '') {
    throw new Error(`Missing or empty env: ${name}`);
  }
  // 유효성까지 체크(선택)
  new URL(v);
  return v;
}
