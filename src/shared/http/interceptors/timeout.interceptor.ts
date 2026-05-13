import { HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs/operators';

// 10s default per FE refinement §29.
// Upload requests opt into 60s by setting an Http context flag (see upload feature).
const DEFAULT_TIMEOUT_MS = 10_000;

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(timeout(DEFAULT_TIMEOUT_MS));
};
