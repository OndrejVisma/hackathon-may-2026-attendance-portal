import type { components } from '../../../shared/http/generated/api-schema';

export type Worktime = components['schemas']['Worktime'];
export type WorktimeCreate = components['schemas']['WorktimeCreate'];
export type WorktimeUpdate = components['schemas']['WorktimeUpdate'];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidTime = (s: string): boolean => HHMM.test(s);

export const minutesBetween = (start: string, end: string): number => {
  if (!isValidTime(start) || !isValidTime(end)) return 0;
  const [sh, sm] = start.split(':').map(Number) as [number, number];
  const [eh, em] = end.split(':').map(Number) as [number, number];
  return (eh * 60 + em) - (sh * 60 + sm);
};

export const hoursBetween = (start: string, end: string): number =>
  Math.max(0, minutesBetween(start, end) / 60);

export const isCrossMidnight = (start: string, end: string): boolean =>
  minutesBetween(start, end) < 0;
