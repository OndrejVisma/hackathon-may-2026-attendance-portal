import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSession } from '../../../features/auth/domain/auth-session';

// Stamps the mock-login user id into every API call for Basic.
// Bonus: replace with Bearer token from OIDC flow.

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSession);
  const user = session.current();
  if (!user) return next(req);

  const cloned = req.clone({
    setHeaders: {
      'X-User-Id': user.id,
      'X-User-Role': user.roles.join(','),
    },
  });
  return next(cloned);
};
