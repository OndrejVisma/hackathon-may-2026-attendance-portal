import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSession } from '../../../features/auth/domain/auth-session';

// Adds Bearer token to all API calls (Basic = mock-login token, Bonus = OIDC token).
// Mock-login endpoint itself is unauthenticated, so we skip it.

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/auth/mock-login')) return next(req);

  const session = inject(AuthSession);
  const token = session.accessToken();
  if (!token) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
