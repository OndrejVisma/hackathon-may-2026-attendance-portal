// Agreed error envelope shape — coordinate with BE early.
// See FE refinement §14 (network error messages) and §29 (resilience).

export interface ApiErrorEnvelope {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly envelope: ApiErrorEnvelope,
    readonly correlationId?: string,
  ) {
    super(envelope.message);
    this.name = 'ApiError';
  }
}
