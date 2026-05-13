export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN';

export interface User {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly roles: readonly Role[];
  readonly teamId: string;
  readonly directManagerId: string | null;
  readonly language: 'sk' | 'en';
}

export const hasRole = (user: User, role: Role): boolean => user.roles.includes(role);
export const fullName = (user: User): string => `${user.firstName} ${user.lastName}`;
