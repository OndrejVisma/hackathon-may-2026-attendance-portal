import type { FastifyPluginAsync } from "fastify";
import { audit, newId, notify, now, state } from "../store/state.js";
import { hasRole } from "../middleware/auth.js";
import { sendProblem } from "../middleware/errors.js";
import type { Document } from "../store/types.js";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "application/pdf"]);

const documentsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/absences/:absence_id/documents", async (req, reply) => {
    const absence = state.absences.get((req.params as { absence_id: string }).absence_id);
    if (!absence) return sendProblem(reply, { type: "about:blank", title: "Absence not found", status: 404 });
    const viewer = req.currentUser!;
    const isOwner = absence.user_id === viewer.id;
    const isHR = hasRole(viewer, "hr");
    if (!isOwner && !isHR) {
      return sendProblem(reply, { type: "about:blank", title: "Forbidden", status: 403 });
    }
    const part = await req.file();
    if (!part) {
      return sendProblem(reply, { type: "about:blank", title: "file is required", status: 400 });
    }
    if (!ALLOWED_MIME.has(part.mimetype)) {
      return sendProblem(reply, {
        type: "about:blank",
        title: `Unsupported MIME: ${part.mimetype}`,
        status: 400,
      });
    }
    // Read into memory (mock — content is discarded, only metadata kept)
    const buf = await part.toBuffer();
    const doc: Document = {
      id: newId(),
      absence_id: absence.id,
      filename: part.filename,
      mime_type: part.mimetype as Document["mime_type"],
      size_bytes: buf.length,
      state: "pending_validation",
      uploaded_by: viewer.id,
      uploaded_at: now(),
      validated_by: null,
      validated_at: null,
    };
    state.documents.set(doc.id, doc);
    absence.document_ids.push(doc.id);
    return reply.code(201).send(doc);
  });

  app.get("/documents/:id", async (req, reply) => {
    const doc = state.documents.get((req.params as { id: string }).id);
    if (!doc) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    const viewer = req.currentUser!;
    const absence = state.absences.get(doc.absence_id);
    const isOwner = absence?.user_id === viewer.id;
    const isHR = hasRole(viewer, "hr");
    if (!isOwner && !isHR) {
      return sendProblem(reply, { type: "about:blank", title: "Forbidden", status: 403 });
    }
    return doc; // Mock: returns metadata only (no file content stored)
  });

  app.post("/documents/:id/validate", async (req, reply) => {
    const doc = state.documents.get((req.params as { id: string }).id);
    if (!doc) return sendProblem(reply, { type: "about:blank", title: "Not found", status: 404 });
    const viewer = req.currentUser!;
    if (!hasRole(viewer, "hr")) {
      return sendProblem(reply, { type: "about:blank", title: "HR only", status: 403 });
    }
    const body = req.body as { decision?: "approved" | "rejected"; reason?: string };
    if (!body?.decision) {
      return sendProblem(reply, { type: "about:blank", title: "decision required", status: 400 });
    }
    if (body.decision === "rejected" && !body.reason?.trim()) {
      return sendProblem(reply, { type: "about:blank", title: "reason required when rejecting", status: 400 });
    }
    const before = { ...doc };
    doc.state = body.decision;
    doc.reject_reason = body.decision === "rejected" ? body.reason : undefined;
    doc.validated_by = viewer.id;
    doc.validated_at = now();
    audit({
      actor_id: viewer.id,
      kind: body.decision === "approved" ? "Document-Approve" : "Document-Reject",
      entity: "document",
      entity_id: doc.id,
      before,
      after: doc,
      reason: body.reason,
    });
    const absence = state.absences.get(doc.absence_id);
    if (absence) {
      notify({
        recipient_id: absence.user_id,
        event_kind: "document.validated",
        subject: `Document for ${absence.type} ${body.decision}`,
        body: body.reason ?? "",
        absence_id: absence.id,
      });
      if (body.decision === "rejected" && (absence.state === "pending" || absence.state === "approved")) {
        const before = { ...absence };
        absence.state = "rejected";
        absence.reject_reason = body.reason;
        audit({
          actor_id: viewer.id,
          kind: "HR-Override",
          entity: "absence",
          entity_id: absence.id,
          before,
          after: absence,
          reason: body.reason,
        });
      }
    }
    return doc;
  });
};

export default documentsRoutes;
