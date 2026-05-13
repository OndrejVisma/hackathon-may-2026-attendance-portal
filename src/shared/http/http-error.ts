// RFC 7807 Problem envelope (matches OpenAPI spec /components/schemas/Problem).
// Hard rules emit `rule_id` (H1–H10); even success bodies may include `soft_warnings`.

export interface SoftWarning {
  readonly rule_id?: string;   // e.g. S1, S5
  readonly message?: string;
}

export interface FieldError {
  readonly field?: string;
  readonly code?: string;
  readonly message?: string;
}

export interface Problem {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly errors?: readonly FieldError[];
  readonly rule_id?: string;         // H1–H10 on 422
  readonly soft_warnings?: readonly SoftWarning[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Problem,
    readonly correlationId?: string,
  ) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
  }

  get ruleId(): string | undefined { return this.problem.rule_id; }
  get isSemantic(): boolean { return this.status === 422; }
  get isConflict(): boolean { return this.status === 409 || this.status === 412; }
  get isValidation(): boolean { return this.status === 400; }
  get isUnauthorised(): boolean { return this.status === 401; }
  get isForbidden(): boolean { return this.status === 403; }
  get isNotFound(): boolean { return this.status === 404; }
}
