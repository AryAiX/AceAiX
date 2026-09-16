import { describe, expect, it } from 'vitest';
import {
  RECRUITER_ROLES,
  canAccessRole,
  isRecruiterRole,
  requiresAgeReview,
} from './accessControl';

describe('role access control', () => {
  it('allows a role explicitly listed for a portal', () => {
    expect(canAccessRole('athlete', ['athlete'])).toBe(true);
    expect(canAccessRole('club', ['scout', 'club'])).toBe(true);
  });

  it('rejects roles from a different portal', () => {
    expect(canAccessRole('athlete', ['admin', 'super_admin'])).toBe(false);
    expect(canAccessRole('scout', ['medical_partner'])).toBe(false);
  });

  it('keeps coach, scout and club access aligned across recruiter surfaces', () => {
    expect(RECRUITER_ROLES).toEqual(['coach', 'scout', 'club']);
    expect(isRecruiterRole('coach')).toBe(true);
    expect(isRecruiterRole('scout')).toBe(true);
    expect(isRecruiterRole('club')).toBe(true);
    expect(isRecruiterRole('athlete')).toBe(false);
    expect(canAccessRole('coach', RECRUITER_ROLES)).toBe(true);
  });

  it('fails closed while a signed-in user has no loaded profile role', () => {
    expect(canAccessRole(null, ['admin', 'super_admin'])).toBe(false);
  });

  it('isolates only underage suspension reasons on the age-review route', () => {
    expect(requiresAgeReview({
      is_suspended: true,
      suspended_reason: 'underage_account_pending_remediation',
    })).toBe(true);
    expect(requiresAgeReview({
      is_suspended: true,
      suspended_reason: 'moderation',
    })).toBe(false);
    expect(requiresAgeReview({
      is_suspended: false,
      suspended_reason: 'under_13',
    })).toBe(false);
  });
});
