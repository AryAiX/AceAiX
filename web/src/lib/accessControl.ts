import type { UserProfile, UserRole } from '../types';

export const RECRUITER_ROLES = ['coach', 'scout', 'club'] as const satisfies readonly UserRole[];
const UNDERAGE_SUSPENSION_REASONS = new Set([
  'underage_account_pending_remediation',
  'under_13',
  'underage',
]);

export function isRecruiterRole(role: UserRole | string | null): boolean {
  return role !== null && RECRUITER_ROLES.some((candidate) => candidate === role);
}

export function canAccessRole(role: UserRole | null, allowedRoles: readonly UserRole[]): boolean {
  return role !== null && allowedRoles.includes(role);
}

export function requiresAgeReview(
  profile: Pick<UserProfile, 'is_suspended' | 'suspended_reason'> | null,
): boolean {
  return Boolean(
    profile?.is_suspended &&
      profile.suspended_reason &&
      UNDERAGE_SUSPENSION_REASONS.has(profile.suspended_reason),
  );
}
