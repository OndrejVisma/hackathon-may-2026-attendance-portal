import type { FastifyPluginAsync } from "fastify";
import { audit, newId, notify, notifyMany, now, state } from "../store/state.js";
import { workingDays } from "../store/working-days.js";
import { sendProblem } from "../middleware/errors.js";
import { hasRole } from "../middleware/auth.js";
import type { Absence, AbsenceState, AbsenceType, HalfDaySlot } from "../store/types.js";

const AUTO_APPROVED_TYPES: AbsenceType[] = ["sickday", "pn", "paternity"];

function canRead(viewerId: string, absence: Absence): boolean {
  const viewer = state.users.get(viewerId);
  if (!viewer) return false;
  if (absence.user_id === viewerId) return true;
  if (hasRole(viewer, "hr") || hasRole(viewer, "admin")) return true;
  // Manager: ancestor chain
  let cur: string | null = absence.user_id;
  while (cur) {
    const owner = state.users.get(cur);
    if (!owner) break;
    if (owner.direct_manager_id === viewerId) return true;
    cur = owner.direct_manager_id;
  }
  return false;
}

function teamMembers(team_id: string | null, exclude_id: string): string[] {
  if (!team_id) return [];
  const team = state.teams.get(team_id);
  return team ? team.member_ids.filter((id) => id !== exclude_id) : [];
}

function hrUsers(): string[] {
  return [...state.users.values()].filter((u) => hasRole(u, "hr")).map((u) => u.id);
}

function fanoutSubmitted(a: Absence): void {
  const owner = state.users.get(a.user_id);
  if (!owner) return;
  if (AUTO_APPROVED_TYPES.includes(a.type)) {
    notifyMany({
      recipient_ids: [
        owner.direct_manager_id ?? "",
        ...teamMembers(owner.team_id, owner.id),
        ...hrUsers(),
      ].filter(Boolean),
      event_kind: a.type === "sickday" ? "absence.sickday" : "absence.pn",
      subject: `${owner.first_name} ${owner.last_name}: ${a.type} ${a.date_from}`,
      body: `Absence type ${a.type} logged for ${a.date_from} → ${a.date_to}`,
      absence_id: a.id,
    });
  } else {
    if (owner.direct_manager_id) {
      notify({
        recipient_id: owner.direct_manager_id,
        event_kind: "absence.submitted",
        subject: `Approval needed: ${owner.first_name} ${owner.last_name} ${a.type}`,
        body: `${a.type} requested for ${a.date_from} → ${a.date_to}`,
        absence_id: a.id,
      });
    } else {
      notifyMany({
        recipient_ids: hrUsers(),
        event_kind: "absence.submitted",
        subject: `Approval needed (escalated): ${owner.first_name} ${owner.last_name} ${a.type}`,
        body: `${a.type} requested for ${a.date_from} → ${a.date_to}`,
        absence_id: a.id,
      });
    }
  }
}

const absencesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/absences", async (req) => {
    const user = req.currentUser!;
    const q = req.query as {
      user_id?: string;
      state?: string;
      type?: string;
      from?: string;
      to?: string;
      cursor?: string;
      limit?: string;
    };
    const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
    const states = q.state ? (q.state.split(",") as AbsenceState[]) : null;
    const types = q.type ? (q.type.split(",") as AbsenceType[]) : null;
    const targetUserId = q.user_id ?? user.id;
    let items = [...state.absences.values()].filter((a) => {
      if (a.user_id !== targetUserId) return false;
      if (!canRead(user.id, a)) return false;
      if (states && !states.includes(a.state)) return false;
      if (types && !types.includes(a.type)) return false;
      if (q.from && a.date_to < q.from) return false;
      if (q.to && a.date_from > q.to) return false;
      return true;
    }).sort((a, b) => b.date_from.localeCompare(a.date_from));
    const cursorIdx = q.cursor ? items.findIndex((a) => a.id === q.cursor) + 1 : 0;
    const page = items.slice(cursorIdx, cursorIdx + limit);
    const next = items[cursorIdx + limit] ? page[page.length - 1].id : null;
    return { items: page, next_cursor: next };
  });

  app.post("/absences", async (req, reply) => {
    const body = req.body as Partial<Absence>;
    if (!body.type || !body.date_from || !body.date_to) {
      return sendProblem(reply, {
        type: "about:blank",
        title: "type, date_from and date_to are required",
        status: 400,
      });
    }
    if (body.date_from > body.date_to) {
      return sendProblem(reply, { type: "about:blank", title: "date_from must be ≤ date_to", status: 400 });
    }
    if (body.type === "sickday" && body.half_day) {
      return sendProblem(reply, {
        type: "about:blank",
        title: "Sickday cannot be half-day (H2)",
        status: 422,
        rule_id: "H2",
      });
    }
    const a: Absence = {
      id: newId(),
      user_id: req.currentUser!.id,
      type: body.type as AbsenceType,
      state: "draft",
      date_from: body.date_from,
      date_to: body.date_to,
      half_day: body.half_day ?? false,
      half_day_slot: body.half_day_slot as HalfDaySlot | undefined,
      working_days: workingDays(body.date_from, body.date_to, body.half_day ?? false),
      document_ids: [],
      comment: body.comment,
      soft_warnings: [],
      created_at: now(),
      submitted_at: null,
      decided_at: null,
      decided_by: null,
    };
    state.absences.set(a.id, a);
    audit({ actor_id: req.currentUser!.id, kind: "Submit", entity: "absence", entity_id: a.id, before: null, after: a });
    reply.header("ETag", a.id);
    return reply.code(201).send(a);
  });

  app.get("/absences/:id", async (req, reply) => {
    const a = state.absences.get((req.params as { id: string }).id);
    if (!a) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    if (!canRead(req.currentUser!.id, a)) {
      return sendProblem(reply, { type: "about:blank", title: "Forbidden", status: 403 });
    }
    reply.header("ETag", a.id);
    return a;
  });

  app.patch("/absences/:id", async (req, reply) => {
    const a = state.absences.get((req.params as { id: string }).id);
    if (!a) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    if (a.user_id !== req.currentUser!.id || a.state !== "draft") {
      return sendProblem(reply, {
        type: "about:blank",
        title: "Only Draft absences can be edited by their owner",
        status: 409,
      });
    }
    const body = req.body as Partial<Absence>;
    if (body.date_from) a.date_from = body.date_from;
    if (body.date_to) a.date_to = body.date_to;
    if (typeof body.half_day === "boolean") a.half_day = body.half_day;
    if (body.half_day_slot) a.half_day_slot = body.half_day_slot as HalfDaySlot;
    if (body.comment !== undefined) a.comment = body.comment;
    a.working_days = workingDays(a.date_from, a.date_to, a.half_day);
    return a;
  });

  app.delete("/absences/:id", async (req, reply) => {
    const a = state.absences.get((req.params as { id: string }).id);
    if (!a) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    if (a.user_id !== req.currentUser!.id || a.state !== "draft") {
      return sendProblem(reply, { type: "about:blank", title: "Only owner may delete a Draft", status: 409 });
    }
    state.absences.delete(a.id);
    return reply.code(204).send();
  });

  app.post("/absences/:id/submit", async (req, reply) => {
    const a = state.absences.get((req.params as { id: string }).id);
    if (!a) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    if (a.user_id !== req.currentUser!.id || a.state !== "draft") {
      return sendProblem(reply, { type: "about:blank", title: "Not in Draft", status: 409 });
    }
    const before = { ...a };
    a.submitted_at = now();
    if (AUTO_APPROVED_TYPES.includes(a.type)) {
      a.state = "approved";
      a.decided_at = now();
      a.decided_by = req.currentUser!.id;
    } else {
      a.state = "pending";
    }
    audit({ actor_id: req.currentUser!.id, kind: "Submit", entity: "absence", entity_id: a.id, before, after: a });
    fanoutSubmitted(a);
    return a;
  });

  app.post("/absences/:id/withdraw", async (req, reply) => {
    const a = state.absences.get((req.params as { id: string }).id);
    if (!a) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    if (a.user_id !== req.currentUser!.id || a.state !== "pending") {
      return sendProblem(reply, { type: "about:blank", title: "Only Pending entries by owner can be withdrawn", status: 409 });
    }
    const before = { ...a };
    a.state = "withdrawn";
    audit({ actor_id: req.currentUser!.id, kind: "Withdraw", entity: "absence", entity_id: a.id, before, after: a });
    const owner = state.users.get(a.user_id);
    if (owner?.direct_manager_id) {
      notify({
        recipient_id: owner.direct_manager_id,
        event_kind: "absence.withdrawn",
        subject: `${owner.first_name} ${owner.last_name} withdrew ${a.type}`,
        body: `Withdrew ${a.type} for ${a.date_from} → ${a.date_to}`,
        absence_id: a.id,
      });
    }
    return a;
  });

  app.post("/absences/:id/cancel", async (req, reply) => {
    const a = state.absences.get((req.params as { id: string }).id);
    if (!a) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    if (a.state !== "approved") {
      return sendProblem(reply, { type: "about:blank", title: "Only Approved entries can be cancelled", status: 409 });
    }
    const viewer = req.currentUser!;
    const isOwner = a.user_id === viewer.id;
    const isHR = hasRole(viewer, "hr");
    const today = new Date().toISOString().slice(0, 10);
    if (!isHR && (!isOwner || a.date_from <= today)) {
      return sendProblem(reply, {
        type: "about:blank",
        title: "Cancellation on/after the absence date requires HR",
        status: 403,
      });
    }
    const before = { ...a };
    a.state = "cancelled";
    audit({ actor_id: viewer.id, kind: "Cancel", entity: "absence", entity_id: a.id, before, after: a });
    const owner = state.users.get(a.user_id);
    if (owner?.direct_manager_id) {
      notifyMany({
        recipient_ids: [owner.direct_manager_id, ...hrUsers()],
        event_kind: "absence.cancelled",
        subject: `${owner.first_name} ${owner.last_name} cancelled ${a.type}`,
        body: `Cancelled ${a.type} for ${a.date_from} → ${a.date_to}`,
        absence_id: a.id,
      });
    }
    return a;
  });
};

export default absencesRoutes;
