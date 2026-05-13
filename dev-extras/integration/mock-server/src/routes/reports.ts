import type { FastifyPluginAsync } from "fastify";
import { state } from "../store/state.js";
import { hasRole } from "../middleware/auth.js";
import { sendProblem } from "../middleware/errors.js";
import { balanceReport } from "../store/quotas.js";

const reportsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/users/:user_id/balances", async (req, reply) => {
    const viewer = req.currentUser!;
    const target = (req.params as { user_id: string }).user_id;
    const targetUser = state.users.get(target);
    if (!targetUser) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    const isSelf = target === viewer.id;
    const isManagerOfTarget = targetUser.direct_manager_id === viewer.id;
    const isHRAdmin = hasRole(viewer, "hr") || hasRole(viewer, "admin");
    if (!isSelf && !isManagerOfTarget && !isHRAdmin) {
      return sendProblem(reply, { type: "about:blank", title: "Forbidden", status: 403 });
    }
    const year = Number((req.query as any)?.year) || new Date().getUTCFullYear();
    return balanceReport(target, year);
  });

  app.get("/reports/monthly-export", async (req, reply) => {
    if (!hasRole(req.currentUser!, "hr") && !hasRole(req.currentUser!, "admin")) {
      return sendProblem(reply, { type: "about:blank", title: "HR/Admin only", status: 403 });
    }
    return sendProblem(reply, {
      type: "about:blank",
      title: "XLSX export not implemented in mock server",
      status: 501,
      detail: "Stub. Implement in your real backend per product-spec §11.1 + DEC-034.",
    });
  });

  app.get("/reports/audit-log", async (req, reply) => {
    if (!hasRole(req.currentUser!, "hr") && !hasRole(req.currentUser!, "admin")) {
      return sendProblem(reply, { type: "about:blank", title: "HR/Admin only", status: 403 });
    }
    const q = req.query as {
      cursor?: string;
      limit?: string;
      actor?: string;
      entity?: string;
      kind?: string;
      from?: string;
      to?: string;
    };
    const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
    let items = state.audit
      .filter((e) => (q.actor ? e.actor_id === q.actor : true))
      .filter((e) => (q.entity ? e.entity === q.entity : true))
      .filter((e) => (q.kind ? e.kind === q.kind : true))
      .filter((e) => (q.from ? e.at >= q.from : true))
      .filter((e) => (q.to ? e.at <= q.to : true))
      .sort((a, b) => b.at.localeCompare(a.at));
    const cursorIdx = q.cursor ? items.findIndex((e) => e.id === q.cursor) + 1 : 0;
    const page = items.slice(cursorIdx, cursorIdx + limit);
    const next = items[cursorIdx + limit] ? page[page.length - 1].id : null;
    return { items: page, next_cursor: next };
  });
};

export default reportsRoutes;
