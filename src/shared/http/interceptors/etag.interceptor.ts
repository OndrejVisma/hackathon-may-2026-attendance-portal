import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { EtagCache } from '../etag-cache.service';
import { ToastService } from '../../ui/toast.service';

const MUTATING = new Set(['PATCH', 'PUT', 'POST', 'DELETE']);

export const etagInterceptor: HttpInterceptorFn = (req, next) => {
  const cache = inject(EtagCache);

  // Outbound: stamp If-Match for mutations if caller didn't already.
  let outbound = req;
  if (MUTATING.has(req.method) && !req.headers.has('If-Match')) {
    const etag = cache.get(req.url);
    if (etag) {
      outbound = req.clone({ setHeaders: { 'If-Match': etag } });
    }
  }

  return next(outbound).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const etag = event.headers.get('ETag');
        if (req.method === 'GET') {
          cache.put(req.url, etag);
        } else if (MUTATING.has(req.method)) {
          // Resource has changed — drop the cached tag so next read re-captures.
          cache.invalidate(req.url);
        }
      }
    }),
  );
};

// 409/412 toast handler — separate interceptor so it can be inserted late
// (after error-envelope normalises HttpErrorResponse into ApiError).
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../http-error';

export const conflictInterceptor: HttpInterceptorFn = (req, next) => {
  const toasts = inject(ToastService);
  const cache = inject(EtagCache);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof ApiError && err.isConflict) {
        cache.invalidate(req.url);
        toasts.warn('This entry changed since you opened it. Refreshing latest data.');
      }
      return throwError(() => err);
    }),
  );
};
