import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';

import { supabase, Buckets, publicUrl } from './supabase';
import { AppError } from './errors';
import { setDateOfBirth } from './api';

/**
 * Network calls that belong to sign-up, onboarding and password recovery.
 *
 * Everything else lives in lib/api.ts. Same rules apply: a screen never touches
 * `supabase` directly, and every failure comes back as an AppError with a
 * message worth putting on screen.
 */

// ── Date of birth handed over from sign-up ───────────────────────────────────
//
// The date of birth is collected during sign-up but can only be written once
// the account exists AND a session is active — `user_private` is behind RLS,
// and when e-mail confirmation is switched on there is no session at all until
// the person clicks the link in their inbox, possibly days later.
//
// So sign-up parks the date on the device and onboarding writes it. The e-mail
// address is stored alongside it so a date typed by one person can never be
// applied to a different account on a shared phone.

const PENDING_DOB_KEY = 'aceaix.pending-date-of-birth';

interface PendingDob {
  email: string;
  /** ISO yyyy-mm-dd. */
  date: string;
}

export async function stashPendingDateOfBirth(email: string, isoDate: string): Promise<void> {
  const payload: PendingDob = {
    email: email.trim().toLowerCase(),
    date: isoDate,
  };
  try {
    await AsyncStorage.setItem(PENDING_DOB_KEY, JSON.stringify(payload));
  } catch {
    /* Storage is unavailable (private browsing). Onboarding will ask again. */
  }
}

export async function clearPendingDateOfBirth(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_DOB_KEY);
  } catch {
    /* nothing to clean up */
  }
}

async function readPendingDateOfBirth(): Promise<PendingDob | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_DOB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingDob>;
    if (typeof parsed.email !== 'string' || typeof parsed.date !== 'string') return null;
    return { email: parsed.email, date: parsed.date };
  } catch {
    return null;
  }
}

/**
 * Write the parked date of birth for the person who is signed in now.
 *
 * Returns the date that was written, or null when there was nothing to do. The
 * caller reloads the profile afterwards: `is_minor` and `age_band` are set by a
 * database trigger, and the guardian step depends on them.
 */
export async function applyPendingDateOfBirth(): Promise<string | null> {
  const pending = await readPendingDateOfBirth();
  if (!pending) return null;

  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email?.trim().toLowerCase();
  if (!auth.user || !email) return null;

  // A date typed on this device belongs to one account and one account only.
  if (email !== pending.email) {
    await clearPendingDateOfBirth();
    return null;
  }

  await setDateOfBirth(pending.date);
  await clearPendingDateOfBirth();
  return pending.date;
}

// ── E-mail confirmation ──────────────────────────────────────────────────────
export async function resendSignupConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
  });
  if (error) throw new AppError(error);
}

// ── Password recovery ────────────────────────────────────────────────────────
export interface RecoveryLinkParams {
  code?: string;
  token_hash?: string;
  access_token?: string;
  refresh_token?: string;
}

/**
 * Turn the parameters of an `aceaix://reset-password` link into a session.
 *
 * Called at submit time rather than on mount: the routing gate sends any signed
 * in account straight into the app, so establishing the session before the new
 * password has been typed would bounce the person off this screen.
 *
 * Supabase has shipped three shapes of recovery link over the years and old
 * e-mails stay in inboxes, so all three are handled.
 */
export async function beginPasswordRecovery(params: RecoveryLinkParams): Promise<void> {
  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw new AppError(error);
    return;
  }

  if (params.token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: params.token_hash,
    });
    if (error) throw new AppError(error);
    return;
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw new AppError(error);
    return;
  }

  // No link parameters: the caller must already hold a session.
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new AppError('This link has expired. Ask for a new one and try again.');
  }
}

// ── Recruiter profiles ───────────────────────────────────────────────────────
export interface CoachUpdate {
  specialty?: string | null;
  current_club?: string | null;
  country?: string | null;
  years_experience?: number | null;
}

/** Coaches get a `coach_profiles` row from the signup trigger. */
export async function updateCoachProfile(patch: CoachUpdate): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { error } = await supabase
    .from('coach_profiles')
    .upsert({ ...patch, user_id: auth.user.id }, { onConflict: 'user_id' });
  if (error) throw new AppError(error);
}

export interface ScoutUpdate {
  credentials?: string | null;
  organization_id?: string | null;
}

/**
 * Clubs and academies get a `scout_profiles` row from the signup trigger. It is
 * the only place their own free-text description of themselves fits until an
 * `organizations` record is created for them by the AceAiX team.
 */
export async function updateScoutProfile(patch: ScoutUpdate): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');
  const { error } = await supabase
    .from('scout_profiles')
    .upsert({ ...patch, user_id: auth.user.id }, { onConflict: 'user_id' });
  if (error) throw new AppError(error);
}

// ── Avatar upload ────────────────────────────────────────────────────────────
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function extensionFor(fileName: string | null | undefined, contentType: string): string {
  const fromName = (fileName ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(fromName))
    return fromName === 'jpeg' ? 'jpg' : fromName;
  return MIME_EXTENSIONS[contentType] ?? 'jpg';
}

export interface AvatarUploadInput {
  /** Base64 body, as returned by expo-image-picker with `base64: true`. */
  base64: string;
  fileName?: string | null;
  mimeType?: string | null;
}

/**
 * Upload a profile photo to the public `avatars` bucket.
 *
 * The storage policy only lets someone write inside a folder named after their
 * own user id, so the path is always `<user id>/<file>`. The file name carries
 * a timestamp so a replaced photo is never served from a stale cache.
 */
export async function uploadAvatar(input: AvatarUploadInput): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');

  const declared = (input.mimeType ?? '').toLowerCase();
  const contentType = MIME_EXTENSIONS[declared] ? declared : 'image/jpeg';
  const path = `${auth.user.id}/${Date.now()}.${extensionFor(input.fileName, contentType)}`;

  const { error } = await supabase.storage
    .from(Buckets.avatars)
    .upload(path, decode(input.base64), { contentType, upsert: true });
  if (error) throw new AppError(error);

  const url = publicUrl(Buckets.avatars, path);
  if (!url) throw new AppError('The photo uploaded but we could not read it back.');
  return url;
}
