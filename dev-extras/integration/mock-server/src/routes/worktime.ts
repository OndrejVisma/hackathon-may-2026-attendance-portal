import type { FastifyPluginAsync } from "fastify";
import { newId, now, state } from "../store/state.js";
import { sendProblem } from "../middleware/errors.js";
import type { SoftWarning, Worktime } from "../store/types.js";

function totalHoursOnDay(user_id: string, date: string, excludeId?: string): number {
  let total = 0;
  for (const w of state.worktime.values()) {
    if (w.user_id !== user_id || w.date !== date || w.id === excludeId) continue;
    total += diffHours(w.start_time, w.end_time);
  }
  return total;
}

function diffHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh + em / 60) - (sh + sm / 60);
}

function detectSoftWarnings(w: Pick<Worktime, "start_time" | "end_time" | "user_id" | "date" | "id">): SoftWarning[] {
  const warnings: SoftWarning[] = [];
  if (w.start_time < "08:00" || w.end_time > "16:30") {
    warnings.push({ rule_id: "S2", message: "Worktime outside working window" });
  }
  if (w.start_time < "06:00" || w.end_time > "22:00") {
    warnings.push({ rule_id: "S3", message: "Night-time work between 22:00 and 06:00" });
  }
  const hours = diffHours(w.start_time, w.end_time);
  if (hours > 8) warnings.push({ rule_id: "S4", message: "Single worktime entry exceeds 8 hours" });
  return warnings;
}

const worktimeRoutes: FastifyPluginAsync = async (app) => {
  app.get("/worktime", async (req) => {
    const viewer = req.currentUser!;
    const q = req.query as { user_id?: string; from?: string; to?: string; cursor?: string; limit?: string };
    const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
    const targetUserId = q.user_id ?? viewer.id;
    let items = [...state.worktime.values()]
      .filter((w) => w.user_id === targetUserId)
      .filter((w) => (q.from ? w.date >= q.from : true))
      .filter((w) => (q.to ? w.date <= q.to : true))
      .sort((a, b) => b.date.localeCompare(a.date));
    const cursorIdx = q.cursor ? items.findIndex((w) => w.id === q.cursor) + 1 : 0;
    const page = items.slice(cursorIdx, cursorIdx + limit);
    const next = items[cursorIdx + limit] ? page[page.length - 1].id : null;
    return { items: page, next_cursor: next };
  });

  app.post("/worktime", async (req, reply) => {
    const body = req.body as Partial<Worktime>;
    if (!body.date || !body.start_time || !body.end_time) {
      return sendProblem(reply, { type: "about:blank", title: "date, start_time, end_time required", status: 400 });
    }
    if (body.start_time >= body.end_time) {
      return sendProblem(reply, { type: "about:blank", title: "start_time must be < end_time", status: 400 });
    }
    const w: Worktime = {
      id: newId(),
      user_id: req.currentUser!.id,
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      project_code: body.project_code ?? "GENERAL",
      business_trip: body.business_trip ?? false,
      overtime: false,
      note: body.note,
      soft_warnings: [],
      created_at: now(),
    };
    w.soft_warnings = detectSoftWarnings(w);
    const dayTotal = totalHoursOnDay(w.user_id, w.date) + diffHours(w.start_time, w.end_time);
    if (dayTotal > 8) w.overtime = true;
    state.worktime.set(w.id, w);
    return reply.code(201).send(w);
  });

  app.patch("/worktime/:id", async (req, reply) => {
    const w = state.worktime.get((req.params as { id: string }).id);
    if (!w) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    if (w.user_id !== req.currentUser!.id) {
      return sendProblem(reply, { type: "about:blank", title: "Forbidden", status: 403 });
    }
    const body = req.body as Partial<Worktime>;
    if (body.start_time) w.start_time = body.start_time;
    if (body.end_time) w.end_time = body.end_time;
    if (body.project_code !== undefined) w.project_code = body.project_code;
    if (typeof body.business_trip === "boolean") w.business_trip = body.business_trip;
    if (body.note !== undefined) w.note = body.note;
    w.soft_warnings = detectSoftWarnings(w);
    const dayTotal = totalHoursOnDay(w.user_id, w.date, w.id) + diffHours(w.start_time, w.end_time);
    w.overtime = dayTotal > 8;
    return w;
  });

  app.delete("/worktime/:id", async (req, reply) => {
    const w = state.worktime.get((req.params as { id: string }).id);
    if (!w) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    if (w.user_id !== req.currentUser!.id) {
      return sendProblem(reply, { type: "about:blank", title: "Forbidden", status: 403 });
    }
    state.worktime.delete(w.id);
    return reply.code(204).send();
  });
};

export default worktimeRoutes;
