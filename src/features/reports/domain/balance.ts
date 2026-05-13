import type { components } from '../../../shared/http/generated/api-schema';

export type BalanceReport = components['schemas']['BalanceReport'];
export type Bucket = components['schemas']['Bucket'];

export const remaining = (b: Bucket | undefined): number => b?.remaining ?? 0;
export const allocated = (b: Bucket | undefined): number => b?.allocated ?? 0;
export const reserved  = (b: Bucket | undefined): number => b?.reserved ?? 0;
export const used      = (b: Bucket | undefined): number => b?.used ?? 0;

// Statutory + bonus split is encoded in the API as a single `vacation` bucket
// with `bonus_withheld` and `carried_over`. The renderer derives the visual split.
export const isVacationBucket = (b: Bucket | undefined): boolean =>
  b !== undefined && b.bonus_withheld !== undefined;
