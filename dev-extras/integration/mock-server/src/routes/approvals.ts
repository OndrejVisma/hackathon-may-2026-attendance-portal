import type { FastifyPluginAsync } from "fastify";
import { audit, notify, now, state } from "../store/state.js";
import { hasRole } from "../middleware/auth.js";
import { sendProblem } from "../middleware/errors.js";
import { balanceReport } from "../store/quotas.js";
import type { Absence, AbsenceType, User } from "../store/types.js";

function isAncestor(ancestorId: string, userId: string): boolean {
  let cur: string | null = userId;
  while (cur) {
    const u = state.users.get(cur);
    if (!u) return false;
    if (u.direct_manager_id === ancestorId) return true;
    cur = u.direct_manager_id;
  }
  return false;
}

function routingFor(viewer: User, a: Absence): "direct" | "chain" | "hr" | null {
  const owner = state.users.get(a.user_id);
  if (!owner) return null;
  if (owner.direct_manager_id === viewer.id) return "direct";
  if (isAncestor(viewer.id, owner.id)) return "chain";
  if (hasRole(viewer, "hr")) return "hr";
  return null;
}

function bucketKey(type: AbsenceType): "vacation" | "sickday" | "paragraph" | "ocr" | "special" | null {
  if (type === "vacation") return "vacation";
  if (type === "sickday") return "sickday";
  if (type === "paragraph") return "paragraph";
  if (type === "ocr") return "ocr";
  if (type === "special") return "special";
  return null;
}

const approvalsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/approvals", async (req, reply) => {
    const viewer = req.currentUser!;
    const q = req.query as { scope?: string; cursor?: string; limit?: string; type?: string };
    const scope = q.scope ?? "routed";
    const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
    const types = q.type ? (q.type.split(",") as AbsenceType[]) : null;
    if (scope === "hr" && !hasRole(viewer, "hr")) {
      return sendProblem(reply, { type: "about:blank", title: "HR only", status: 403 });
    }
    const items = [...state.absences.values()]
      .filter((a) => a.state === "pending")
      .filter((a) => (types ? types.includes(a.type) : true))
      .filter((a) => {
        const r = routingFor(viewer, a);
        if (!r) return false;
        if (scope === "routed") return r === "direct";
        if (scope === "chain") return r === "direct" || r === "chain";
        if (scope === "hr") return true;
        return false;
      })
      .sort((a, b) => (a.submitted_at ?? "").localeCompare(b.submitted_at ?? ""));
    const cursorIdx = q.cursor ? items.findIndex((a) => a.id === q.cursor) + 1 : 0;
    const page = items.slice(cursorIdx, cursorIdx + limit).map((a) => {
      const requester = state.users.get(a.user_id)!;
      const year = Number(a.date_from.slice(0, 4));
      const bk = bucketKey(a.type);
      const remaining = bk ? (balanceReport(a.user_id, year).buckets as any)[bk]?.remaining : null;
      return {
        absence_id: a.id,
        requester,
        type: a.type,
        date_from: a.date_from,
        date_to: a.date_to,
        half_day: a.half_day,
        working_days: a.working_days,
        requester_remaining: remaining,
        soft_warnings: a.soft_warnings,
        has_document: a.document_ids.length > 0,
        routing: routingFor(viewer, a),
        submitted_at: a.submitted_at,
      };
    });
    const next = items[cursorIdx + limit] ? page[page.length - 1].absence_id : null;
    return { items: page, next_cursor: next };
  });

  app.post("/approvals/:absence_id/approve", async (req, reply) => {
    const a = state.absences.get((req.params as { absence_id: string }).absence_id);
    if (!a) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    const viewer = req.currentUser!;
    const route = routingFor(viewer, a);
    if (!route) return sendProblem(reply, { type: "about:blank", title: "Forbidden", status: 403 });
    if (a.state !== "pending") {
      return sendProblem(reply, { type: "about:blank", title: "Not in Pending", status: 409 });
    }
    const before = { ...a };
    a.state = "approved";
    a.decided_at = now();
    a.decided_by = viewer.id;
    audit({ actor_id: viewer.id, kind: "Approve", entity: "absence", entity_id: a.id, before, after: a });
    notify({
      recipient_id: a.user_id,
      event_kind: "absence.approved",
      subject: `Your ${a.type} request was approved`,
      body: `Approved for ${a.date_from} → ${a.date_to}`,
      absence_id: a.id,
    });
    return a;
  });

  app.post("/approvals/:absence_id/reject", async (req, reply) => {
    const a = state.absences.get((req.params as { absence_id: string }).absence_id);
    if (!a) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    const body = req.body as { reason?: string } | undefined;
    if (!body?.reason || !body.reason.trim()) {
      return sendProblem(reply, { type: "about:blank", title: "reason is required", status: 400 });
    }
    const viewer = req.currentUser!;
    const route = routingFor(viewer, a);
    if (!route) return sendProblem(reply, { type: "about:blank", title: "Forbidden", status: 403 });
    if (a.state !== "pending") {
      return sendProblem(reply, { type: "about:blank", title: "Not in Pending", status: 409 });
    }
    const before = { ...a };
    a.state = "rejected";
    a.reject_reason = body.reason;
    a.decided_at = now();
    a.decided_by = viewer.id;
    audit({ actor_id: viewer.id, kind: "Reject", entity: "absence", entity_id: a.id, before, after: a, reason: body.reason });
    notify({
      recipient_id: a.user_id,
      event_kind: "absence.rejected",
      subject: `Your ${a.type} request was rejected`,
      body: `Reason: ${body.reason}`,
      absence_id: a.id,
    });
    return a;
  });
};

export default approvalsRoutes;
