import { state } from "./state.js";

function parseDate(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function isHoliday(iso: string): boolean {
  return state.holidays.has(iso);
}

export function workingDays(from: string, to: string, halfDay = false): number {
  if (halfDay) return 0.5;
  const start = parseDate(from);
  const end = parseDate(to);
  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    const iso = cur.toISOString().slice(0, 10);
    if (!isWeekend(cur) && !isHoliday(iso)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export function* daysInRange(from: string, to: string): Generator<string> {
  const start = parseDate(from);
  const end = parseDate(to);
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    yield cur.toISOString().slice(0, 10);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

export function classifyDate(iso: string): "workday" | "weekend" | "holiday" {
  const d = parseDate(iso);
  if (isHoliday(iso)) return "holiday";
  if (isWeekend(d)) return "weekend";
  return "workday";
}
