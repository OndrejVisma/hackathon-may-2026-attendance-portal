import type { FastifyPluginAsync } from "fastify";
import { newId, state } from "../store/state.js";
import { sendProblem } from "../middleware/errors.js";

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/mock-login", async (req, reply) => {
    const body = req.body as { user_id?: string } | undefined;
    if (!body?.user_id) {
      return sendProblem(reply, { type: "about:blank", title: "user_id is required", status: 400 });
    }
    const user = state.users.get(body.user_id);
    if (!user) {
      return sendProblem(reply, { type: "about:blank", title: "User not found", status: 404 });
    }
    const token = `mock-${newId()}`;
    state.sessions.set(token, {
      token,
      user_id: user.id,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });
    return { access_token: token, token_type: "Bearer", expires_in: 86400 };
  });

  app.post("/auth/refresh", async (req, reply) => {
    const body = req.body as { refresh_token?: string } | undefined;
    if (!body?.refresh_token) {
      return sendProblem(reply, { type: "about:blank", title: "refresh_token is required", status: 401 });
    }
    const session = state.sessions.get(body.refresh_token);
    if (!session) {
      return sendProblem(reply, { type: "about:blank", title: "Invalid refresh token", status: 401 });
    }
    return { access_token: session.token, token_type: "Bearer", expires_in: 86400 };
  });

  app.post("/auth/logout", async (req, reply) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    state.sessions.delete(token);
    return reply.code(204).send();
  });
};

export default authRoutes;
