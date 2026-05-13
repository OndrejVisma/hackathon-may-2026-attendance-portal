import type { FastifyPluginAsync } from "fastify";
import { state } from "../store/state.js";
import { classifyDate, daysInRange } from "../store/working-days.js";
import { hasRole } from "../middleware/auth.js";
import { sendProblem } from "../middleware/errors.js";

const calendarRoutes: FastifyPluginAsync = async (app) => {
  app.get("/calendar", async (req, reply) => {
    const viewer = req.currentUser!;
    const q = req.query as { team_id?: string; from?: string; to?: string };
    if (!q.from || !q.to) {
      return sendProblem(reply, { type: "about:blank", title: "from and to are required", status: 400 });
    }
    const isManagerOrHR = hasRole(viewer, "manager") || hasRole(viewer, "hr") || hasRole(viewer, "admin");
    let memberIds: string[];
    if (isManagerOrHR && q.team_id) {
      const team = state.teams.get(q.team_id);
      if (!team) {
        return sendProblem(reply, { type: "about:blank", title: "Team not found", status: 404 });
      }
      memberIds = team.member_ids;
    } else {
      memberIds = [viewer.id];
    }
    const members = memberIds.map((uid) => {
      const user = state.users.get(uid);
      const cells = [...daysInRange(q.from!, q.to!)].map((date) => {
        const dayKind = classifyDate(date);
        const absence = [...state.absences.values()].find(
          (a) => a.user_id === uid && a.state === "approved" && a.date_from <= date && a.date_to >= date,
        );
        const pendingForManager = [...state.absences.values()].find(
          (a) => a.user_id === uid && a.state === "pending" && a.date_from <= date && a.date_to >= date,
        );
        const worktimes = [...state.worktime.values()].filter((w) => w.user_id === uid && w.date === date);
        const workHours = worktimes.reduce((sum, w) => {
          const [sh, sm] = w.start_time.split(":").map(Number);
          const [eh, em] = w.end_time.split(":").map(Number);
          return sum + (eh + em / 60) - (sh + sm / 60);
        }, 0);
        const bt = worktimes.some((w) => w.business_trip);
        let kind: string = dayKind;
        if (absence) kind = "absence";
        else if (workHours > 0) kind = "work";
        else if (dayKind === "weekend") kind = "weekend";
        else if (dayKind === "holiday") kind = "holiday";
        else kind = "empty";
        return {
          date,
          kind,
          absence_type: absence?.type,
          absence_state: absence?.state,
          worktime_hours: workHours,
          business_trip: bt,
          pending_approval: Boolean(pendingForManager),
        };
      });
      return { user, cells };
    });
    return { team_id: q.team_id ?? null, from: q.from, to: q.to, members };
  });
};

export default calendarRoutes;
