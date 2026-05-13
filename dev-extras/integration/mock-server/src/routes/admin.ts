import type { FastifyPluginAsync } from "fastify";
import { newId, state } from "../store/state.js";
import { hasRole } from "../middleware/auth.js";
import { sendProblem } from "../middleware/errors.js";
import type { Team, User } from "../store/types.js";

function requireAdmin(user: User) {
  if (!hasRole(user, "admin")) {
    const err: any = new Error("Admin only");
    err.statusCode = 403;
    throw err;
  }
}

function requireHRorAdmin(user: User) {
  if (!hasRole(user, "admin") && !hasRole(user, "hr")) {
    const err: any = new Error("HR or Admin only");
    err.statusCode = 403;
    throw err;
  }
}

function wouldCreateCycle(userId: string, newManagerId: string | null | undefined): boolean {
  if (!newManagerId) return false;
  if (newManagerId === userId) return true;
  let cur: string | null = newManagerId;
  const visited = new Set<string>();
  while (cur) {
    if (visited.has(cur)) return true;
    if (cur === userId) return true;
    visited.add(cur);
    cur = state.users.get(cur)?.direct_manager_id ?? null;
  }
  return false;
}

const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/admin/users", async (req) => {
    requireAdmin(req.currentUser!);
    const q = req.query as { cursor?: string; limit?: string };
    const limit = Math.min(Math.max(Number(q.limit) || 100, 1), 200);
    let items = [...state.users.values()].sort((a, b) => a.last_name.localeCompare(b.last_name));
    const cursorIdx = q.cursor ? items.findIndex((u) => u.id === q.cursor) + 1 : 0;
    const page = items.slice(cursorIdx, cursorIdx + limit);
    const next = items[cursorIdx + limit] ? page[page.length - 1].id : null;
    return { items: page, next_cursor: next };
  });

  app.post("/admin/users", async (req, reply) => {
    requireAdmin(req.currentUser!);
    const body = req.body as Partial<User>;
    if (!body.email || !body.first_name || !body.last_name || !body.roles) {
      return sendProblem(reply, {
        type: "about:blank",
        title: "email, first_name, last_name, roles are required",
        status: 400,
      });
    }
    const u: User = {
      id: newId(),
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      roles: body.roles,
      team_id: body.team_id ?? null,
      direct_manager_id: body.direct_manager_id ?? null,
      preferred_language: body.preferred_language ?? "sk",
      active: true,
    };
    state.users.set(u.id, u);
    return reply.code(201).send(u);
  });

  app.patch("/admin/users/:id", async (req, reply) => {
    requireAdmin(req.currentUser!);
    const u = state.users.get((req.params as { id: string }).id);
    if (!u) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    const body = req.body as Partial<User>;
    if (body.direct_manager_id !== undefined && wouldCreateCycle(u.id, body.direct_manager_id)) {
      return sendProblem(reply, {
        type: "about:blank",
        title: `Would create a cycle in the org tree`,
        status: 400,
      });
    }
    Object.assign(u, body);
    return u;
  });

  app.get("/admin/teams", async (req) => {
    requireAdmin(req.currentUser!);
    return [...state.teams.values()];
  });

  app.post("/admin/teams", async (req, reply) => {
    requireAdmin(req.currentUser!);
    const body = req.body as { name?: string };
    if (!body.name) {
      return sendProblem(reply, { type: "about:blank", title: "name required", status: 400 });
    }
    const t: Team = { id: `team-${newId().slice(0, 8)}`, name: body.name, member_ids: [] };
    state.teams.set(t.id, t);
    return reply.code(201).send(t);
  });

  app.patch("/admin/teams/:id", async (req, reply) => {
    requireAdmin(req.currentUser!);
    const t = state.teams.get((req.params as { id: string }).id);
    if (!t) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    const body = req.body as Partial<Team>;
    if (body.name) t.name = body.name;
    if (body.member_ids) {
      // Sync user.team_id pointers
      const oldMembers = new Set(t.member_ids);
      const newMembers = new Set(body.member_ids);
      t.member_ids = body.member_ids;
      for (const id of oldMembers) {
        if (!newMembers.has(id)) {
          const u = state.users.get(id);
          if (u && u.team_id === t.id) u.team_id = null;
        }
      }
      for (const id of newMembers) {
        const u = state.users.get(id);
        if (u) u.team_id = t.id;
      }
    }
    return t;
  });

  app.get("/admin/holidays", async (req) => {
    const q = req.query as { year?: string };
    let items = [...state.holidays.values()];
    if (q.year) items = items.filter((h) => h.date.startsWith(q.year!));
    return items.sort((a, b) => a.date.localeCompare(b.date));
  });

  app.post("/admin/holidays", async (req, reply) => {
    requireAdmin(req.currentUser!);
    const body = req.body as { date?: string; name?: string };
    if (!body.date || !body.name) {
      return sendProblem(reply, { type: "about:blank", title: "date and name required", status: 400 });
    }
    state.holidays.set(body.date, { date: body.date, name: body.name });
    return reply.code(201).send({ date: body.date, name: body.name });
  });

  app.delete("/admin/holidays/:date", async (req, reply) => {
    requireAdmin(req.currentUser!);
    const date = (req.params as { date: string }).date;
    state.holidays.delete(date);
    return reply.code(204).send();
  });

  app.get("/admin/quota-config", async (req, reply) => {
    requireHRorAdmin(req.currentUser!);
    const q = req.query as { year?: string };
    if (!q.year) {
      return sendProblem(reply, { type: "about:blank", title: "year required", status: 400 });
    }
    return {
      year: Number(q.year),
      defaults: state.quota_defaults,
      overrides: [...state.quota_overrides.values()],
    };
  });

  app.patch("/admin/quota-config", async (req, reply) => {
    requireHRorAdmin(req.currentUser!);
    const body = req.body as { defaults?: typeof state.quota_defaults; overrides?: Array<typeof state.quota_defaults & { user_id: string }> };
    if (body.defaults) Object.assign(state.quota_defaults, body.defaults);
    if (body.overrides) {
      for (const o of body.overrides) {
        state.quota_overrides.set(o.user_id, o);
      }
    }
    return reply.code(200).send({ ok: true });
  });

  app.post("/admin/year-rollover/preview", async (req) => {
    requireHRorAdmin(req.currentUser!);
    const body = req.body as { from_year: number; to_year: number };
    const per_user = [...state.users.values()].map((u) => {
      const limit = state.quota_defaults.carry_over_limit;
      const stat = state.quota_overrides.get(u.id)?.statutory_vacation ?? state.quota_defaults.statutory_vacation;
      const bonus = state.quota_overrides.get(u.id)?.bonus_vacation ?? state.quota_defaults.bonus_vacation;
      // Mock — assume 4 days leftover everywhere
      const leftover = 4;
      const bonusWithheld = leftover > limit;
      return {
        user_id: u.id,
        leftover_statutory: leftover,
        leftover_bonus: 0,
        carry_over: leftover,
        bonus_withheld: bonusWithheld,
        new_year_statutory: stat,
        new_year_bonus: bonusWithheld ? 0 : bonus,
      };
    });
    return { to_year: body.to_year, per_user };
  });

  app.post("/admin/year-rollover/apply", async (req, reply) => {
    requireHRorAdmin(req.currentUser!);
    return reply.code(200).send({ ok: true, applied_at: new Date().toISOString() });
  });
};

export default adminRoutes;
