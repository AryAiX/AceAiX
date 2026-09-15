import { Platform, Share } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

import { supabase } from './supabase';
import { AppError } from './errors';
import { exportMyData } from './api';
import type { GuardianConsent, UserRole } from '@/types/models';

/**
 * Calls that only the settings and legal surface needs.
 *
 * `lib/api.ts` is shared by every screen in the app and is owned elsewhere, so
 * anything specific to settings lives here instead.
 */

// ── Verification requests ────────────────────────────────────────────────────
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | string;

export interface VerificationRequest {
  id: string;
  type: string;
  status: VerificationStatus;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** The kind of check that applies to a role, matching verification_requests.type. */
export function verificationTypeFor(role: UserRole | null | undefined): string {
  switch (role) {
    case 'coach':
    case 'scout':
      return 'recruiter';
    case 'club':
      return 'club';
    case 'federation':
      return 'federation';
    case 'medical_partner':
      return 'medical_partner';
    default:
      return 'athlete_id';
  }
}

/** The most recent request this account made, or null if it never asked. */
export async function getMyVerificationRequest(): Promise<VerificationRequest | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from('verification_requests')
    .select('id, type, status, decision_reason, created_at, updated_at')
    .eq('subject_user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new AppError(error);
  return (data as VerificationRequest | null) ?? null;
}

/**
 * Ask a human to check this account.
 *
 * RLS only lets a person insert a row for themselves, and only an admin can
 * change its status — so this is a request, never a grant.
 */
export async function requestVerification(role: UserRole | null | undefined) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');

  const { data, error } = await supabase
    .from('verification_requests')
    .insert({
      subject_user_id: auth.user.id,
      type: verificationTypeFor(role),
      status: 'pending',
      documents: [],
    })
    .select('id, type, status, decision_reason, created_at, updated_at')
    .single();

  if (error) throw new AppError(error);
  return data as VerificationRequest;
}

// ── Guardian consent extras ──────────────────────────────────────────────────
export interface GuardianLink extends GuardianConsent {
  minor: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    is_suspended: boolean;
    is_discoverable: boolean;
  } | null;
}

/**
 * The children linked to a guardian account.
 *
 * A minor reads their own consents through `getGuardianConsents()`. Guardian
 * identity comes from the SECURITY DEFINER RPC instead of a nested profile
 * join, because hidden-minor RLS correctly blocks that direct join.
 */
export async function getGuardianLinks(): Promise<GuardianLink[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const [consents, minors] = await Promise.all([
    supabase
      .from('guardian_consents')
      .select(
        'id, minor_user_id, guardian_user_id, guardian_name, guardian_email, relationship, status, allow_discovery, allow_messaging, allow_media, granted_at, revoked_at, created_at, updated_at',
      )
      .eq('guardian_user_id', auth.user.id)
      .order('created_at', { ascending: false }),
    supabase.rpc('my_linked_minors'),
  ]);

  if (consents.error) throw new AppError(consents.error);
  if (minors.error) throw new AppError(minors.error);

  type LinkedMinor = NonNullable<GuardianLink['minor']>;
  const linkedRows = (minors.data ?? []) as Array<{
    minor_user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    is_suspended: boolean;
    is_discoverable: boolean;
  }>;
  const minorById = new Map<string, LinkedMinor>(
    linkedRows.map((row) => [
      row.minor_user_id as string,
      {
        id: row.minor_user_id as string,
        full_name: row.full_name as string | null,
        avatar_url: row.avatar_url as string | null,
        is_suspended: Boolean(row.is_suspended),
        is_discoverable: Boolean(row.is_discoverable),
      },
    ]),
  );

  return (consents.data ?? []).map(
    (row): GuardianLink => ({
      ...(row as GuardianConsent),
      minor: minorById.get(row.minor_user_id) ?? null,
    }),
  );
}

/**
 * Send the consent email again.
 *
 * The request row itself already exists and stays valid — this only re-triggers
 * delivery, so a bounced or lost email is recoverable without starting over.
 */
export async function resendGuardianConsentEmail(consentId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('guardian-consent', {
    body: { consent_id: consentId, resend: true },
  });
  if (error) throw new AppError(error);
  if (data?.sent !== true) {
    if (data?.code === 'cooldown') {
      throw new AppError('Please wait a minute before sending that email again.');
    }
    if (data?.code === 'daily_cap') {
      throw new AppError('That email has reached today’s resend limit. Try again tomorrow.');
    }
    throw new AppError('We could not email your guardian. Please try again later.');
  }
}

/** Record an age-correction appeal. This never changes a date of birth. */
export async function requestUnderageAgeAppeal(userId?: string): Promise<void> {
  const { data, error } = await supabase.rpc('request_underage_age_appeal', {
    p_user: userId ?? null,
  });
  if (error) throw new AppError(error);
  if (data?.ok !== true) throw new AppError('We could not request an age review.');
}

// ── Data export (GDPR, and a Play Store expectation) ─────────────────────────
export interface ExportedFile {
  uri: string;
  name: string;
  bytes: number;
  /** The JSON itself, kept so Android can write the copy the user picks. */
  contents: string;
}

function exportFileName(): string {
  // Local date, not ISO-UTC: the file name should match the day the person
  // pressed the button, wherever they are.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `aceaix-my-data-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/** Fetch the documented account-data scope and write it to a JSON file. */
export async function writeMyDataExport(): Promise<ExportedFile> {
  const payload = await exportMyData();
  const json = JSON.stringify(payload, null, 2);
  const name = exportFileName();

  if (Platform.OS === 'web') {
    const uri = URL.createObjectURL(
      new Blob([json], { type: 'application/json;charset=utf-8' }),
    );
    return { uri, name, bytes: new TextEncoder().encode(json).length, contents: json };
  }

  const folder = new Directory(Paths.document, 'exports');
  if (!folder.exists) folder.create({ intermediates: true });

  const file = new File(folder, name);
  file.create({ overwrite: true });
  file.write(json);

  return { uri: file.uri, name: file.name, bytes: json.length, contents: json };
}

/**
 * Hand the export to the operating system so the person can actually keep it.
 *
 * iOS takes a file URL in the share sheet directly. Android's share sheet does
 * not accept an app-private file URI, so we ask for a folder through the
 * Storage Access Framework and write the copy the user chose — which is what
 * "download my data" means to them.
 *
 * Returns false when the person backed out, so the caller can stay quiet
 * instead of claiming success.
 */
export async function shareDataExport(file: ExportedFile): Promise<boolean> {
  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.href = file.uri;
    link.download = file.name;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Safari and Firefox may not begin reading the Blob until a later task.
    // Revoking synchronously can cancel an otherwise successful download.
    setTimeout(() => URL.revokeObjectURL(file.uri), 10_000);
    return true;
  }

  if (Platform.OS === 'android') {
    const legacy = await import('expo-file-system/legacy');
    const permission =
      await legacy.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) return false;

    const target = await legacy.StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      file.name,
      'application/json',
    );
    await legacy.writeAsStringAsync(target, file.contents);
    return true;
  }

  const result = await Share.share({
    url: file.uri,
    title: file.name,
  });
  return result.action !== Share.dismissedAction;
}

// ── Push permission ──────────────────────────────────────────────────────────
/*
 * These used to be a bridge: a `require` of the notifications hook with a
 * fallback that imported `expo-notifications` directly, written while the hook
 * was still being built. The hook exists now, and the fallback had become the
 * second copy of the rules — it read permission with a different failure
 * default from the hook's, and its dynamic import pulled the notifications
 * module into the web bundle, where merely loading it prints a warning about
 * push token listeners (see `lib/push.ts`).
 *
 * One implementation, re-exported so the settings screen keeps its import.
 */
export {
  requestPushPermission as requestPushPermissionSafely,
  hasPushPermission,
} from '@/hooks/usePushNotifications';

export { pushSupported, getPermission as getPushPermissionState } from '@/lib/push';
