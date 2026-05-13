import type { components } from '../../../shared/http/generated/api-schema';

export type Absence = components['schemas']['Absence'];
export type AbsenceType = components['schemas']['AbsenceType'];
export type AbsenceState = components['schemas']['AbsenceState'];
export type AbsenceCreate = components['schemas']['AbsenceCreate'];
export type AbsenceUpdate = components['schemas']['AbsenceUpdate'];
export type HalfDaySlot = components['schemas']['HalfDaySlot'];
export type SoftWarning = NonNullable<Absence['soft_warnings']>[number];

export const ABSENCE_TYPES: readonly AbsenceType[] = [
  'vacation', 'sickday', 'pn', 'paternity', 'paragraph', 'ocr', 'special',
];

// UI label per FE refinement §6 + product-spec §11.1.
export const ABSENCE_LABEL: Record<AbsenceType, { sk: string; en: string }> = {
  vacation:  { sk: 'Dovolenka',                  en: 'Vacation' },
  sickday:   { sk: 'Sickday',                    en: 'Sick day' },
  pn:        { sk: 'PN',                         en: 'Sick leave (PN)' },
  paternity: { sk: 'Otcovská dovolenka',         en: 'Paternity' },
  paragraph: { sk: 'Návšteva lekára',            en: 'Doctor visit' },
  ocr:       { sk: 'Sprevádzanie člena rodiny',  en: 'Family care (OCR)' },
  special:   { sk: 'Špeciálne voľno',            en: 'Special leave' },
};

export const requiresDocument = (t: AbsenceType): boolean =>
  t === 'paragraph' || t === 'ocr' || t === 'special';

export const canHaveHalfDay = (t: AbsenceType): boolean =>
  t === 'vacation' || t === 'paragraph' || t === 'ocr';

export const stateLabel: Record<AbsenceState, string> = {
  draft:     'Draft',
  pending:   'Pending',
  approved:  'Approved',
  rejected:  'Rejected',
  withdrawn: 'Withdrawn',
  cancelled: 'Cancelled',
};

export const stateTone: Record<AbsenceState, 'info' | 'success' | 'error' | 'warning'> = {
  draft:     'info',
  pending:   'warning',
  approved:  'success',
  rejected:  'error',
  withdrawn: 'info',
  cancelled: 'info',
};
