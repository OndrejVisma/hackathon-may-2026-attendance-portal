import type { FastifyReply } from "fastify";
import type { SoftWarning } from "../store/types.js";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  rule_id?: string;
  errors?: Array<{ field: string; code: string; message: string }>;
  soft_warnings?: SoftWarning[];
}

export function problem(p: ProblemDetails): ProblemDetails {
  return p;
}

export function sendProblem(reply: FastifyReply, p: ProblemDetails): FastifyReply {
  return reply.code(p.status).send(p);
}
