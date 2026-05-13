import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { seed } from "./store/seed.js";
import { problem } from "./middleware/errors.js";
import { authPlugin } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import meRoutes from "./routes/me.js";
import absencesRoutes from "./routes/absences.js";
import approvalsRoutes from "./routes/approvals.js";
import worktimeRoutes from "./routes/worktime.js";
import documentsRoutes from "./routes/documents.js";
import calendarRoutes from "./routes/calendar.js";
import reportsRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "info" },
});

await app.register(cors, { origin: true, credentials: true });
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

seed();

app.setErrorHandler((err, _req, reply) => {
  if ((err as any).statusCode && (err as any).statusCode < 500) {
    return reply.code((err as any).statusCode).send(
      problem({
        status: (err as any).statusCode,
        title: err.message,
        type: "about:blank",
      }),
    );
  }
  app.log.error(err);
  return reply.code(500).send(problem({ status: 500, title: "Internal Server Error", type: "about:blank" }));
});

await app.register(authPlugin);

const apiPrefix = { prefix: "/api/v1" };
await app.register(authRoutes, apiPrefix);
await app.register(meRoutes, apiPrefix);
await app.register(absencesRoutes, apiPrefix);
await app.register(approvalsRoutes, apiPrefix);
await app.register(worktimeRoutes, apiPrefix);
await app.register(documentsRoutes, apiPrefix);
await app.register(calendarRoutes, apiPrefix);
await app.register(reportsRoutes, apiPrefix);
await app.register(adminRoutes, apiPrefix);

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 4010);
await app.listen({ port, host: "0.0.0.0" });
app.log.info(`Mock server up at http://localhost:${port}/api/v1`);
