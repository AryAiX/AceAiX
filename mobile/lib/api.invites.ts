import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import { isInviteCode, normalizeInviteCode } from '@/lib/invites/code';

/**
 * Invites — a personal link, the circle it builds, and tokens.
 *
 * Every rule lives in `20261023000001_referrals.sql`: who can invite (athletes
 * and coaches), when an invite counts (the friend finished onboarding, and a
 * guardian approved a minor), 10 invites that count = 1 token, and what anyone
 * may see of anyone else. The client asks and renders.
 */

export type InviteStatus = 'pending' | 'qualified';

export interface InvitePerson {
  first_name: string | null;
  avatar_url: string | null;
  role: string;
}

export interface CircleMember extends InvitePerson {
  status: InviteStatus;
  joined_at: string;
  qualified_at: string | null;
}

export interface MyCircle {
  can_invite: boolean;
  code: string | null;
  per_token: number;
  qualified: number;
  pending: number;
  progress: number;
  tokens: number;
  members: CircleMember[];
  invited_by: InvitePerson | null;
  can_enter_code: boolean;
  ledger: { amount: number; reason: string; note: string | null; created_at: string }[];
}

export async function getMyCircle(): Promise<MyCircle> {
  const { data, error } = await supabase.rpc('referral_my_circle');
  if (error) throw new AppError(error);
  return data as MyCircle;
}

/** Who sent a code — for the landing screen, before or after signing in. */
export async function getInviter(code: string): Promise<InvitePerson | null> {
  const { data, error } = await supabase.rpc('referral_inviter', { p_code: normalizeInviteCode(code) });
  if (error) throw new AppError(error);
  return (data ?? null) as InvitePerson | null;
}

export async function claimInvite(code: string): Promise<{ inviter: InvitePerson; status: InviteStatus }> {
  const { data, error } = await supabase.rpc('referral_claim', { p_code: normalizeInviteCode(code) });
  if (error) throw new AppError(error);
  return data as { inviter: InvitePerson; status: InviteStatus };
}

/** A tier ("10+") for someone else's profile, or null. */
export async function getInviteBadge(userId: string): Promise<{ tier: number } | null> {
  const { data, error } = await supabase.rpc('referral_badge', { p_user: userId });
  if (error) throw new AppError(error);
  return (data ?? null) as { tier: number } | null;
}

// ── A code that arrived before the account did ───────────────────────────────
/*
 * Opening an invite link before onboarding finishes keeps the code here; once
 * the new account has finished onboarding, `useClaimPendingInvite` hands it to
 * the server and forgets it. Thirty days, then it is ignored. Continue and
 * sign-out drop it without claiming.
 */
const PENDING_KEY = 'aceaix.pending-invite';
const PENDING_DAYS = 30;

export async function savePendingInvite(code: string): Promise<void> {
  const normalized = normalizeInviteCode(code);
  if (!isInviteCode(normalized)) return;
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ code: normalized, at: Date.now() })).catch(() => {});
}

/** Drops a kept code. Used when Continue, sign-out, or the wrong account should not claim it. */
export async function clearPendingInvite(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
}

export async function takePendingInvite(): Promise<{ code: string; at: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    await AsyncStorage.removeItem(PENDING_KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw) as { code?: string; at?: number };
    if (typeof code !== 'string' || typeof at !== 'number' || !Number.isFinite(at)) return null;
    if (Date.now() - at > PENDING_DAYS * 86400000) return null;
    return isInviteCode(code) ? { code, at } : null;
  } catch {
    return null;
  }
}

export async function peekPendingInvite(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const { code } = JSON.parse(raw) as { code: string };
    return isInviteCode(code) ? code : null;
  } catch {
    return null;
  }
}
