import { describe, expect, it } from 'vitest';
import { canAccessRole } from './accessControl';

describe('role access control', () => {
  it('allows a role explicitly listed for a portal', () => {
    expect(canAccessRole('athlete', ['athlete'])).toBe(true);
    expect(canAccessRole('club', ['scout', 'club'])).toBe(true);
  });

  it('rejects roles from a different portal', () => {
    expect(canAccessRole('athlete', ['admin', 'super_admin'])).toBe(false);
    expect(canAccessRole('scout', ['medical_partner'])).toBe(false);
  });

  it('fails closed while a signed-in user has no loaded profile role', () => {
    expect(canAccessRole(null, ['admin', 'super_admin'])).toBe(false);
  });
});
