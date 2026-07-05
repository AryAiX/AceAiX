import { describe, expect, it } from 'vitest';
import { buildSportsOverviewRows, canPromoteUserToAdmin, summarizeSubscriptionTiers } from './admin';

describe('admin API mappers', () => {
  it('summarizes subscription tiers from user profiles', () => {
    expect(
      summarizeSubscriptionTiers([
        { subscription_tier: 'pro' },
        { subscription_tier: 'free' },
        { subscription_tier: 'pro' },
        { subscription_tier: 'elite' },
      ]),
    ).toEqual([
      { tier: 'elite', users: 1 },
      { tier: 'free', users: 1 },
      { tier: 'pro', users: 2 },
    ]);
  });

  it('builds sports rows from catalog plus app data', () => {
    expect(
      buildSportsOverviewRows(
        [{ name: 'Football', status: 'active' }],
        [{ sport: 'Football' }, { sport: 'Basketball' }, { sport: null }],
        [{ sport: 'Football' }],
      ),
    ).toEqual([
      { name: 'Football', count: 2, source: 'sports_catalog', status: 'active' },
      { name: 'Basketball', count: 1, source: 'app data', status: 'active' },
    ]);
  });

  it('only allows super admins to promote non-admin users', () => {
    expect(canPromoteUserToAdmin({ id: 'super-1', role: 'super_admin' }, { id: 'user-1', role: 'athlete' })).toBe(true);
    expect(canPromoteUserToAdmin({ id: 'admin-1', role: 'admin' }, { id: 'user-1', role: 'athlete' })).toBe(false);
    expect(canPromoteUserToAdmin({ id: 'super-1', role: 'super_admin' }, { id: 'admin-1', role: 'admin' })).toBe(false);
    expect(canPromoteUserToAdmin({ id: 'super-1', role: 'super_admin' }, { id: 'super-1', role: 'super_admin' })).toBe(false);
  });
});
