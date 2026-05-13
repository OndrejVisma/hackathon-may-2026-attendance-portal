// Public barrel — other features import from here only, never from internals.
export type { User, Role } from './domain/user';
export { hasRole, fullName } from './domain/user';
export { AuthSession } from './domain/auth-session';
export { requireAuth, requireRole } from './presentation/role.guard';
export { MockLoginPage } from './presentation/mock-login.page';
