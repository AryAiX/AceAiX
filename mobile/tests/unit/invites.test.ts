import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  INVITE_ALPHABET,
  inviteCodeFromPath,
  inviteLink,
  isInviteCode,
  normalizeInviteCode,
  tokenProgress,
} from '@/lib/invites/code';
import { notificationTarget, routeDecision, Routes } from '@/lib/routes';
import type { AppNotification } from '@/types/models';

/**
 * Invites: the client and the migration must agree on what a code looks like,
 * and an invite link must open before there is an account.
 */
const MIGRATION = fs.readFileSync(
  path.resolve(__dirname, '../../../supabase/migrations/20261023000001_referrals.sql'),
  'utf8',
);

describe('invite codes', () => {
  it('uses the same alphabet as the server, with no look-alikes', () => {
    expect(MIGRATION).toContain(`'${INVITE_ALPHABET}'`);
    expect(INVITE_ALPHABET).not.toMatch(/[01IO]/);
  });

  it('reads codes the way people type them', () => {
    expect(normalizeInviteCode(' abcd-2345 ')).toBe('ABCD2345');
    expect(isInviteCode('ABCD2345')).toBe(true);
    expect(isInviteCode('ABCD1234')).toBe(false); // 1 is not in the alphabet
    expect(isInviteCode('ABC2345')).toBe(false);
  });

  it('finds the code in every shape of invite link', () => {
    expect(inviteCodeFromPath(inviteLink('ABCD2345'))).toBe('ABCD2345');
    expect(inviteCodeFromPath('aceaix://i/ABCD2345')).toBe('ABCD2345');
    expect(inviteCodeFromPath('/app/i/abcd2345?x=1')).toBe('ABCD2345');
    expect(inviteCodeFromPath('/i/ABCD2345')).toBe('ABCD2345');
    expect(inviteCodeFromPath('/u/ABCD2345')).toBeNull();
    expect(inviteCodeFromPath('/i/NOTACODE1')).toBeNull();
  });

  it('fills the ring toward the next token', () => {
    expect(tokenProgress(0, 10)).toBe(0);
    expect(tokenProgress(7, 10)).toBeCloseTo(0.7);
    expect(tokenProgress(10, 10)).toBe(0);
    expect(tokenProgress(23, 10)).toBeCloseTo(0.3);
  });

  it('counts ten invites to a token, on both sides', () => {
    expect(MIGRATION).toMatch(/referral_per_token\(\)\s*returns integer language sql immutable set search_path = public, pg_temp as \$\$ select 10 \$\$/);
  });
});

describe('invite routing', () => {
  it('lets an invite link open without an account', () => {
    expect(routeDecision({ hasSession: false, profile: null, segments: ['i', '[code]'] })).toBeNull();
  });

  it('sends invite notifications to the circle', () => {
    const n = { entity_type: 'referral', entity_id: null, type: 'referral_token' } as unknown as AppNotification;
    expect(notificationTarget(n)).toBe(Routes.invite);
  });
});
