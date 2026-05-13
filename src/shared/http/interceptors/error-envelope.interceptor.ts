import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError, Problem } from '../http-error';
import { log } from '../../logging/logger';

const isProblem = (body: unknown): body is Problem => {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b['type'] === 'string' && typeof b['title'] === 'string' && typeof b['status'] === 'number';
};

const fallback = (status: number, message: string): Problem => ({
  type: `urn:http:${status}`,
  title: message,
  status,
});

export const errorEnvelopeInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const problem = isProblem(err.error) ? err.error : fallback(err.status, err.message);
        const correlationId = err.headers.get('X-Correlation-Id') ?? undefined;
        log.warn('http.error', {
          url: req.url,
          status: err.status,
          title: problem.title,
          rule: problem.rule_id,
        });
        return throwError(() => new ApiError(err.status, problem, correlationId));
      }
      return throwError(() => err);
    }),
  );
};
