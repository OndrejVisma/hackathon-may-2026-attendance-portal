import { randomUUID } from "node:crypto";
import type {
  Absence,
  AuditEntry,
  Document,
  Holiday,
  Notification,
  QuotaDefaults,
  QuotaOverride,
  Session,
  Team,
  User,
  Worktime,
} from "./types.js";

interface State {
  users: Map<string, User>;
  teams: Map<string, Team>;
  holidays: Map<string, Holiday>;
  absences: Map<string, Absence>;
  worktime: Map<string, Worktime>;
  documents: Map<string, Document>;
  notifications: Map<string, Notification>;
  audit: AuditEntry[];
  sessions: Map<string, Session>;
  quota_defaults: QuotaDefaults;
  quota_overrides: Map<string, QuotaOverride>;
}

export const state: State = {
  users: new Map(),
  teams: new Map(),
  holidays: new Map(),
  absences: new Map(),
  worktime: new Map(),
  documents: new Map(),
  notifications: new Map(),
  audit: [],
  sessions: new Map(),
  quota_defaults: {
    statutory_vacation: 20,
    bonus_vacation: 3,
    sickday: 3,
    paragraph: 7,
    ocr: 7,
    special: 5,
    carry_over_limit: 5,
  },
  quota_overrides: new Map(),
};

export const newId = () => randomUUID();
export const now = () => new Date().toISOString();

export function audit(entry: Omit<AuditEntry, "id" | "at">): void {
  state.audit.push({ id: newId(), at: now(), ...entry });
}

export function notify(args: {
  recipient_id: string;
  event_kind: string;
  subject: string;
  body: string;
  absence_id?: string | null;
}): void {
  const recipients = new Set([args.recipient_id]);
  for (const id of recipients) {
    const n: Notification = {
      id: newId(),
      recipient_id: id,
      event_kind: args.event_kind,
      subject: args.subject,
      body: args.body,
      absence_id: args.absence_id ?? null,
      created_at: now(),
      read: false,
      read_at: null,
    };
    state.notifications.set(n.id, n);
  }
}

export function notifyMany(args: {
  recipient_ids: string[];
  event_kind: string;
  subject: string;
  body: string;
  absence_id?: string | null;
}): void {
  const unique = new Set(args.recipient_ids);
  for (const id of unique)
    notify({
      recipient_id: id,
      event_kind: args.event_kind,
      subject: args.subject,
      body: args.body,
      absence_id: args.absence_id ?? null,
    });
}
