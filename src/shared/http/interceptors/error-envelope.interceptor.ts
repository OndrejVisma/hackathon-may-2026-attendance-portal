import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError, ApiErrorEnvelope } from '../http-error';
import { log } from '../../logging/logger';

const isEnvelope = (body: unknown): body is ApiErrorEnvelope => {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>)['code'] === 'string' &&
    typeof (body as Record<string, unknown>)['message'] === 'string'
  );
};

export const errorEnvelopeInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const envelope: ApiErrorEnvelope = isEnvelope(err.error)
          ? err.error
          : { code: `HTTP_${err.status}`, message: err.message };
        const correlationId = err.headers.get('X-Correlation-Id') ?? undefined;
        log.warn('http.error', { url: req.url, status: err.status, code: envelope.code });
        return throwError(() => new ApiError(err.status, envelope, correlationId));
      }
      return throwError(() => err);
    }),
  );
};
