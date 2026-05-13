import type { FastifyPluginAsync } from "fastify";
import { now, state } from "../store/state.js";
import { balanceReport } from "../store/quotas.js";
import { sendProblem } from "../middleware/errors.js";

const meRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", async (req) => req.currentUser);

  app.get("/me/balances", async (req) => {
    const year = Number((req.query as any)?.year) || new Date().getUTCFullYear();
    return balanceReport(req.currentUser!.id, year);
  });

  app.get("/me/notifications", async (req) => {
    const q = req.query as { cursor?: string; limit?: string; unread_only?: string };
    const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
    const unreadOnly = q.unread_only === "true";
    let items = [...state.notifications.values()]
      .filter((n) => n.recipient_id === req.currentUser!.id)
      .filter((n) => (unreadOnly ? !n.read : true))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const cursorIdx = q.cursor ? items.findIndex((n) => n.id === q.cursor) + 1 : 0;
    const page = items.slice(cursorIdx, cursorIdx + limit);
    const next = items[cursorIdx + limit] ? page[page.length - 1].id : null;
    return { items: page, next_cursor: next };
  });

  app.post("/me/notifications/:id/read", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const n = state.notifications.get(id);
    if (!n || n.recipient_id !== req.currentUser!.id) {
      return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    }
    n.read = true;
    n.read_at = now();
    return reply.code(204).send();
  });

  app.get("/me/data-export", async (req) => {
    const user = req.currentUser!;
    const year = new Date().getUTCFullYear();
    return {
      user,
      absences: [...state.absences.values()].filter((a) => a.user_id === user.id),
      worktime: [...state.worktime.values()].filter((w) => w.user_id === user.id),
      documents_metadata: [...state.documents.values()].filter((d) =>
        [...state.absences.values()].some((a) => a.user_id === user.id && d.absence_id === a.id),
      ),
      balances: [balanceReport(user.id, year)],
      audit_log_entries: state.audit.filter((e) => e.actor_id === user.id || e.entity_id === user.id),
      generated_at: now(),
    };
  });

  app.post("/me/deletion-request", async (_req, reply) => {
    return reply.code(202).send({ status: "received" });
  });
};

export default meRoutes;
