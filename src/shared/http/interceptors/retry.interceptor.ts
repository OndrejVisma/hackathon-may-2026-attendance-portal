import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { mergeMap, retry } from 'rxjs/operators';

// Per FE refinement §29:
// - Idempotent (GET/HEAD/OPTIONS or anything with Idempotency-Key/If-Match): retry up to 3
// - Backoff: 400ms / 1s / 2.5s with jitter
// - Retriable codes: 408, 425, 429 (respect Retry-After), 500, 502, 503, 504
// - Non-idempotent POST without idempotency key: never retry

const MAX_RETRIES = 3;
const BACKOFFS_MS = [400, 1000, 2500];
const RETRIABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const isIdempotent = (req: { method: string; headers: { has: (name: string) => boolean } }): boolean => {
  if (IDEMPOTENT_METHODS.has(req.method)) return true;
  if (req.headers.has('Idempotency-Key')) return true;
  if (req.headers.has('If-Match')) return true;
  return false;
};

const backoffWithJitter = (attempt: number, retryAfterHeader: string | null): number => {
  if (retryAfterHeader) {
    const parsed = Number(retryAfterHeader);
    if (Number.isFinite(parsed) && parsed > 0) return parsed * 1000;
  }
  const base = BACKOFFS_MS[Math.min(attempt, BACKOFFS_MS.length - 1)] ?? 2500;
  const jitter = Math.random() * 0.3 * base;
  return base + jitter;
};

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isIdempotent(req)) return next(req);

  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error: unknown, retryCount: number): Observable<number> => {
        if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
        if (!RETRIABLE_STATUS.has(error.status)) return throwError(() => error);
        const retryAfter = error.headers.get('Retry-After');
        return timer(backoffWithJitter(retryCount - 1, retryAfter));
      },
    }),
    mergeMap((response) => [response]),
  );
};
