import type { UserRole } from '../types';

export function canAccessRole(role: UserRole | null, allowedRoles: readonly UserRole[]): boolean {
  return role !== null && allowedRoles.includes(role);
}
