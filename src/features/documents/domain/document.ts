import type { components } from '../../../shared/http/generated/api-schema';

export type Document = components['schemas']['Document'];
export type DocumentState = components['schemas']['DocumentState'];

export const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'application/pdf'] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;  // 10 MB per FE refinement §9
export const MAX_FILES = 5;

export const isAcceptedMime = (m: string): m is (typeof ACCEPTED_MIME)[number] =>
  (ACCEPTED_MIME as readonly string[]).includes(m);
