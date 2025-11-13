import { Decimal } from '@prisma/client/runtime/library';

/** 소수 문자열/Decimal을 지정 decimals로 wei(BigInt) 변환 */
export function toUnits(amount: string | Decimal, decimals: number): bigint {
  const s = amount.toString();
  const [i, f = ''] = s.split('.');
  const frac = (f + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(i + frac);
}
