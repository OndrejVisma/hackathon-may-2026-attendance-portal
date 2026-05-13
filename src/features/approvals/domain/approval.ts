import type { components } from '../../../shared/http/generated/api-schema';

export type ApprovalQueueItem = components['schemas']['ApprovalQueueItem'];
export type ApprovalRouting = NonNullable<ApprovalQueueItem['routing']>;

export const ROUTING_LABEL: Record<ApprovalRouting, string> = {
  direct: 'Routed to me',
  chain:  'Via chain',
  hr:     'HR fallback',
};
