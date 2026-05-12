import { newId, now, state } from "./state.js";
import type { Absence, Holiday, Team, User, Worktime } from "./types.js";
import { workingDays } from "./working-days.js";

const SK_HOLIDAYS_2026: Holiday[] = [
  { date: "2026-01-01", name: "Deň vzniku Slovenskej republiky" },
  { date: "2026-01-06", name: "Zjavenie Pána" },
  { date: "2026-04-03", name: "Veľký piatok" },
  { date: "2026-04-06", name: "Veľkonočný pondelok" },
  { date: "2026-05-01", name: "Sviatok práce" },
  { date: "2026-05-08", name: "Deň víťazstva nad fašizmom" },
  { date: "2026-07-05", name: "Sviatok svätého Cyrila a Metoda" },
  { date: "2026-08-29", name: "Výročie SNP" },
  { date: "2026-09-01", name: "Deň Ústavy SR" },
  { date: "2026-09-15", name: "Sedembolestná Panna Mária" },
  { date: "2026-11-01", name: "Sviatok všetkých svätých" },
  { date: "2026-11-17", name: "Deň boja za slobodu a demokraciu" },
  { date: "2026-12-24", name: "Štedrý deň" },
  { date: "2026-12-25", name: "Prvý sviatok vianočný" },
  { date: "2026-12-26", name: "Druhý sviatok vianočný" },
];

interface SeedUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: User["roles"];
  team_id: string | null;
  direct_manager_id: string | null;
}

const TEAMS: Team[] = [
  { id: "team-platform", name: "Platform", member_ids: [] },
  { id: "team-apps", name: "Apps", member_ids: [] },
  { id: "team-data", name: "Data", member_ids: [] },
];

const USERS: SeedUser[] = [
  { id: "u-ceo", email: "ceo@visma.local", first_name: "Eva", last_name: "Krajčíková", roles: ["employee", "manager", "admin"], team_id: null, direct_manager_id: null },
  { id: "u-head-platform", email: "head.platform@visma.local", first_name: "Tomáš", last_name: "Horváth", roles: ["employee", "manager"], team_id: "team-platform", direct_manager_id: "u-ceo" },
  { id: "u-head-apps", email: "head.apps@visma.local", first_name: "Mária", last_name: "Novotná", roles: ["employee", "manager"], team_id: "team-apps", direct_manager_id: "u-ceo" },
  { id: "u-lead-platform", email: "lead.platform@visma.local", first_name: "Peter", last_name: "Kováč", roles: ["employee", "manager"], team_id: "team-platform", direct_manager_id: "u-head-platform" },
  { id: "u-lead-data", email: "lead.data@visma.local", first_name: "Anna", last_name: "Bieliková", roles: ["employee", "manager"], team_id: "team-data", direct_manager_id: "u-head-platform" },
  { id: "u-ic-anna", email: "anna@visma.local", first_name: "Anna", last_name: "Mrkvička", roles: ["employee"], team_id: "team-platform", direct_manager_id: "u-lead-platform" },
  { id: "u-ic-peter", email: "peter@visma.local", first_name: "Peter", last_name: "Ušatý", roles: ["employee"], team_id: "team-platform", direct_manager_id: "u-lead-platform" },
  { id: "u-ic-maria", email: "maria@visma.local", first_name: "Mária", last_name: "Robotová", roles: ["employee"], team_id: "team-apps", direct_manager_id: "u-head-apps" },
  { id: "u-ic-jozko", email: "jozko@visma.local", first_name: "Jožko", last_name: "Múdry", roles: ["employee"], team_id: "team-apps", direct_manager_id: "u-head-apps" },
  { id: "u-ic-janka", email: "janka@visma.local", first_name: "Janka", last_name: "Veselá", roles: ["employee"], team_id: "team-data", direct_manager_id: "u-lead-data" },
  { id: "u-hr", email: "hr@visma.local", first_name: "Lucia", last_name: "Tichá", roles: ["employee", "hr"], team_id: null, direct_manager_id: null },
  { id: "u-admin", email: "admin@visma.local", first_name: "Karol", last_name: "Veľký", roles: ["employee", "admin"], team_id: null, direct_manager_id: null },
];

function buildAbsence(args: {
  id: string;
  user_id: string;
  type: Absence["type"];
  state: Absence["state"];
  date_from: string;
  date_to: string;
  half_day?: boolean;
  half_day_slot?: Absence["half_day_slot"];
}): Absence {
  return {
    id: args.id,
    user_id: args.user_id,
    type: args.type,
    state: args.state,
    date_from: args.date_from,
    date_to: args.date_to,
    half_day: args.half_day ?? false,
    half_day_slot: args.half_day_slot,
    working_days: workingDays(args.date_from, args.date_to, args.half_day ?? false),
    document_ids: [],
    soft_warnings: [],
    created_at: now(),
    submitted_at: args.state === "draft" ? null : now(),
    decided_at: args.state === "approved" || args.state === "rejected" ? now() : null,
    decided_by: args.state === "approved" || args.state === "rejected" ? "u-lead-platform" : null,
  };
}

function buildWorktime(args: {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
}): Worktime {
  return {
    id: args.id,
    user_id: args.user_id,
    date: args.date,
    start_time: args.start_time,
    end_time: args.end_time,
    project_code: "GENERAL",
    business_trip: false,
    overtime: false,
    soft_warnings: [],
    created_at: now(),
  };
}

export function seed(): void {
  for (const h of SK_HOLIDAYS_2026) state.holidays.set(h.date, h);

  for (const t of TEAMS) state.teams.set(t.id, { ...t });

  for (const u of USERS) {
    const user: User = {
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      roles: u.roles,
      team_id: u.team_id,
      direct_manager_id: u.direct_manager_id,
      preferred_language: "sk",
      active: true,
    };
    state.users.set(u.id, user);
    if (u.team_id) {
      const t = state.teams.get(u.team_id);
      if (t && !t.member_ids.includes(u.id)) t.member_ids.push(u.id);
    }
  }

  state.quota_overrides.set("u-ic-anna", { user_id: "u-ic-anna", statutory_vacation: 23, bonus_vacation: 3 });

  const aSeeds: Parameters<typeof buildAbsence>[0][] = [
    { id: "a-1", user_id: "u-ic-anna", type: "vacation", state: "approved", date_from: "2026-03-09", date_to: "2026-03-13" },
    { id: "a-2", user_id: "u-ic-peter", type: "sickday", state: "approved", date_from: "2026-03-04", date_to: "2026-03-04" },
    { id: "a-3", user_id: "u-ic-maria", type: "pn", state: "approved", date_from: "2026-04-20", date_to: "2026-04-30" },
    { id: "a-4", user_id: "u-ic-janka", type: "paragraph", state: "pending", date_from: "2026-05-14", date_to: "2026-05-14", half_day: true, half_day_slot: "morning" },
    { id: "a-5", user_id: "u-ic-anna", type: "vacation", state: "pending", date_from: "2026-07-13", date_to: "2026-07-17" },
    { id: "a-6", user_id: "u-ic-jozko", type: "ocr", state: "pending", date_from: "2026-05-18", date_to: "2026-05-18" },
  ];
  for (const a of aSeeds) state.absences.set(a.id, buildAbsence(a));

  const ic = ["u-ic-anna", "u-ic-peter", "u-ic-maria", "u-ic-jozko", "u-ic-janka"];
  for (let day = 11; day <= 12; day++) {
    const date = `2026-05-${String(day).padStart(2, "0")}`;
    for (const uid of ic) {
      const id = `w-${uid}-${date}`;
      state.worktime.set(id, buildWorktime({ id, user_id: uid, date, start_time: "08:00", end_time: "16:30" }));
    }
  }

  // Seeded demo sessions — FE devs can use these tokens directly.
  const demoTokens: Array<[string, string]> = [
    ["dev-employee", "u-ic-anna"],
    ["dev-manager", "u-lead-platform"],
    ["dev-hr", "u-hr"],
    ["dev-admin", "u-admin"],
  ];
  for (const [token, uid] of demoTokens) {
    state.sessions.set(token, {
      token,
      user_id: uid,
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    });
  }
}
