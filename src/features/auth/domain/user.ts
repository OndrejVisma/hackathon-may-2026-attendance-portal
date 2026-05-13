// Domain shape (lowercase enum from API; matches OpenAPI Role).
export type Role = 'employee' | 'manager' | 'hr' | 'admin';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly roles: readonly Role[];
  readonly team_id?: string | null;
  readonly direct_manager_id?: string | null;
  readonly preferred_language: 'sk' | 'en';
  readonly active: boolean;
}

export const hasRole = (user: User, role: Role): boolean => user.roles.includes(role);
export const fullName = (user: User): string => `${user.first_name} ${user.last_name}`;
