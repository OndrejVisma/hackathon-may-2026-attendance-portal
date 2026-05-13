import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { state } from "../store/state.js";
import type { Role, User } from "../store/types.js";
import { sendProblem } from "./errors.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: User;
  }
}

const PUBLIC_PATHS = new Set([
  "/api/v1/auth/mock-login",
  "/api/v1/auth/refresh",
  "/health",
]);

export const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook("onRequest", async (req, reply) => {
    if (PUBLIC_PATHS.has(req.routeOptions.url ?? req.url)) return;
    if (req.url === "/health" || req.url.startsWith("/api/v1/auth/")) return;
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return sendProblem(reply, {
        type: "about:blank",
        title: "Missing or invalid Authorization header",
        status: 401,
      });
    }
    const token = header.slice("Bearer ".length).trim();
    const session = state.sessions.get(token);
    if (!session) {
      return sendProblem(reply, { type: "about:blank", title: "Invalid token", status: 401 });
    }
    const user = state.users.get(session.user_id);
    if (!user || !user.active) {
      return sendProblem(reply, { type: "about:blank", title: "User not found", status: 401 });
    }
    req.currentUser = user;
  });
});

export function hasRole(user: User, role: Role): boolean {
  return user.roles.includes(role);
}

export function requireRole(user: User | undefined, role: Role): asserts user is User {
  if (!user || !hasRole(user, role)) {
    const err: any = new Error(`Requires role: ${role}`);
    err.statusCode = 403;
    throw err;
  }
}
