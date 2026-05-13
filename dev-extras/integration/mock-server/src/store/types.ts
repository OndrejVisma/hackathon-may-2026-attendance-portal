export type Role = "employee" | "manager" | "hr" | "admin";

export type AbsenceType =
  | "vacation"
  | "sickday"
  | "pn"
  | "paternity"
  | "paragraph"
  | "ocr"
  | "special";

export type AbsenceState =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "cancelled";

export type HalfDaySlot = "morning" | "afternoon";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: Role[];
  team_id: string | null;
  direct_manager_id: string | null;
  preferred_language: "sk" | "en";
  active: boolean;
}

export interface Team {
  id: string;
  name: string;
  member_ids: string[];
}

export interface Holiday {
  date: string;
  name: string;
}

export interface SoftWarning {
  rule_id: string;
  message: string;
}

export interface Document {
  id: string;
  absence_id: string;
  filename: string;
  mime_type: "image/png" | "image/jpeg" | "application/pdf";
  size_bytes: number;
  state: "pending_validation" | "approved" | "rejected";
  reject_reason?: string;
  uploaded_by: string;
  uploaded_at: string;
  validated_by: string | null;
  validated_at: string | null;
}

export interface Absence {
  id: string;
  user_id: string;
  type: AbsenceType;
  state: AbsenceState;
  date_from: string;
  date_to: string;
  half_day: boolean;
  half_day_slot?: HalfDaySlot;
  working_days: number;
  document_ids: string[];
  comment?: string;
  reject_reason?: string;
  soft_warnings: SoftWarning[];
  created_at: string;
  submitted_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
}

export interface Worktime {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  project_code: string;
  business_trip: boolean;
  overtime: boolean;
  note?: string;
  soft_warnings: SoftWarning[];
  created_at: string;
}

export interface QuotaDefaults {
  statutory_vacation: number;
  bonus_vacation: number;
  sickday: number;
  paragraph: number;
  ocr: number;
  special: number;
  carry_over_limit: number;
}

export interface QuotaOverride {
  user_id: string;
  statutory_vacation?: number;
  bonus_vacation?: number;
  sickday?: number;
  paragraph?: number;
  ocr?: number;
  special?: number;
}

export interface Notification {
  id: string;
  recipient_id: string;
  event_kind: string;
  subject: string;
  body: string;
  absence_id: string | null;
  created_at: string;
  read: boolean;
  read_at: string | null;
}

export interface AuditEntry {
  id: string;
  actor_id: string;
  kind: string;
  entity: string;
  entity_id: string;
  before: unknown;
  after: unknown;
  at: string;
  reason?: string;
}

export interface Session {
  token: string;
  user_id: string;
  expires_at: string;
}
