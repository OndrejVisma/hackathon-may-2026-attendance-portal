import { state } from "./state.js";
import type { AbsenceType, QuotaDefaults } from "./types.js";

export interface Bucket {
  allocated: number;
  reserved: number;
  used: number;
  used_realised: number;
  used_planned: number;
  remaining: number;
  carried_over: number;
  bonus_withheld: boolean;
}

const VACATION_TYPES: AbsenceType[] = ["vacation"];

type LeaveKind = "vacation" | "sickday" | "paragraph" | "ocr" | "special";

function allocatedFor(user_id: string, kind: LeaveKind): number {
  const defaults = state.quota_defaults;
  const override = state.quota_overrides.get(user_id);
  if (kind === "vacation") {
    const stat = override?.statutory_vacation ?? defaults.statutory_vacation;
    const bonus = override?.bonus_vacation ?? defaults.bonus_vacation;
    return stat + bonus;
  }
  return (override?.[kind] ?? defaults[kind]) as number;
}

export function buildBucket(
  user_id: string,
  year: number,
  types: AbsenceType[],
  allocated: number,
): Bucket {
  const today = new Date().toISOString().slice(0, 10);
  let reserved = 0;
  let used_realised = 0;
  let used_planned = 0;
  for (const a of state.absences.values()) {
    if (a.user_id !== user_id) continue;
    if (!types.includes(a.type)) continue;
    if (a.date_from.slice(0, 4) !== String(year)) continue;
    if (a.state === "pending") reserved += a.working_days;
    if (a.state === "approved") {
      if (a.date_to < today) used_realised += a.working_days;
      else used_planned += a.working_days;
    }
  }
  const used = used_realised + used_planned;
  return {
    allocated,
    reserved,
    used,
    used_realised,
    used_planned,
    remaining: allocated - reserved - used,
    carried_over: 0,
    bonus_withheld: false,
  };
}

export function balanceReport(user_id: string, year: number) {
  return {
    user_id,
    year,
    buckets: {
      vacation: buildBucket(user_id, year, VACATION_TYPES, allocatedFor(user_id, "vacation")),
      sickday: buildBucket(user_id, year, ["sickday"], allocatedFor(user_id, "sickday")),
      paragraph: buildBucket(user_id, year, ["paragraph"], allocatedFor(user_id, "paragraph")),
      ocr: buildBucket(user_id, year, ["ocr"], allocatedFor(user_id, "ocr")),
      special: buildBucket(user_id, year, ["special"], allocatedFor(user_id, "special")),
    },
  };
}
