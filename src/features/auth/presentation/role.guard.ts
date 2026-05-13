import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSession } from '../domain/auth-session';
import { Role, hasRole } from '../domain/user';

export const requireAuth: CanActivateFn = () => {
  const router = inject(Router);
  const session = inject(AuthSession);
  if (session.current()) return true;
  return router.parseUrl('/login');
};

export const requireRole = (role: Role): CanActivateFn => () => {
  const router = inject(Router);
  const session = inject(AuthSession);
  const user = session.current();
  if (!user) return router.parseUrl('/login');
  return hasRole(user, role) ? true : router.parseUrl('/forbidden');
};
