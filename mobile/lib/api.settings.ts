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
  minor: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

/**
 * The children linked to a guardian account.
 *
 * A minor reads their own consents through `getGuardianConsents()`; a guardian
 * needs the child's name alongside the record, which means a join.
 */
export async function getGuardianLinks(): Promise<GuardianLink[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from('guardian_consents')
    .select(
      '*, minor:user_profiles!guardian_consents_minor_user_id_fkey(id, full_name, avatar_url)',
    )
    .eq('guardian_user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(error);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const joined = r.minor;
    return {
      ...(r as unknown as GuardianConsent),
      minor: (Array.isArray(joined) ? joined[0] : joined) as GuardianLink['minor'],
    };
  });
}

/**
 * Send the consent email again.
 *
 * The request row itself already exists and stays valid — this only re-triggers
 * delivery, so a bounced or lost email is recoverable without starting over.
 */
export async function resendGuardianConsentEmail(consentId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('guardian-consent', {
    body: { consent_id: consentId, resend: true },
  });
  if (error) throw new AppError(error);
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

/** Fetch everything we hold and write it to a JSON file on the device. */
export async function writeMyDataExport(): Promise<ExportedFile> {
  const payload = await exportMyData();
  const json = JSON.stringify(payload, null, 2);

  const folder = new Directory(Paths.document, 'exports');
  if (!folder.exists) folder.create({ intermediates: true });

  const file = new File(folder, exportFileName());
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

// ── Push permission bridge ───────────────────────────────────────────────────
interface PushModule {
  requestPushPermission?: () => Promise<boolean>;
}

/**
 * Ask for push permission through the notifications hook when it is available.
 *
 * That hook is owned by another part of the app and registers the device token
 * as well as asking the OS, so we prefer it. When it is missing we fall back to
 * asking expo-notifications directly rather than doing nothing.
 *
 * `require` rather than `import` on purpose: an ES import of a module that does
 * not exist yet fails to compile, and this screen must keep working while the
 * hook is still being written.
 */
export async function requestPushPermissionSafely(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/hooks/usePushNotifications') as PushModule;
    if (typeof mod?.requestPushPermission === 'function') {
      return await mod.requestPushPermission();
    }
  } catch {
    /* the hook is not in the bundle yet — fall through */
  }

  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Whether the OS has already granted permission to show notifications. */
export async function hasPushPermission(): Promise<boolean> {
  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    // Permission state is unknowable on web and in Expo Go on some platforms;
    // treat that as "granted" so we never nag with a card that cannot help.
    return true;
  }
}
