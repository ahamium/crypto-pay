export const STATUSES = ['pending', 'paid', 'expired', 'failed'] as const;

/** 상태값 타입: 'pending' | 'paid' | 'expired' | 'failed' */
export type Status = (typeof STATUSES)[number];

/** 문자열을 안전하게 Status 타입으로 변환 */
export function toStatus(s: string): Status {
  if ((STATUSES as readonly string[]).includes(s)) {
    return s as Status;
  }
  throw new Error(`Invalid status in DB: ${s}`);
}
