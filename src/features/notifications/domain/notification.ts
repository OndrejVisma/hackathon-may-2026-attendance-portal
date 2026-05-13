import type { components } from '../../../shared/http/generated/api-schema';

export type Notification = components['schemas']['Notification'];

// Stable event_kind values per OpenAPI Notification.event_kind docstring.
export const KIND_LABEL: Record<string, string> = {
  'absence.submitted':       'Absence submitted',
  'absence.approved':        'Absence approved',
  'absence.rejected':        'Absence rejected',
  'absence.withdrawn':       'Absence withdrawn',
  'absence.cancelled':       'Absence cancelled',
  'document.uploaded':       'Document uploaded',
  'document.validated':      'Document validated',
  'quota.approaching':       'Quota approaching limit',
  'year.rollover_summary':   'Year rollover summary',
};
