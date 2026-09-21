import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';

import { registerPushToken } from '@/lib/api';
import {
  coldStartTap,
  configureForeground,
  ensureAndroidChannel,
  getExpoToken,
  getPermission,
  onNotificationTap,
  pushSupported,
  requestPermission,
  type PushPayload,
} from '@/lib/push';
import { notificationTarget } from '@/lib/routes';
import type { AppNotification, NotificationType } from '@/types/models';

/**
 * Push notifications.
 *
 * Three rules shape this file.
 *
 * 1. We never ask for permission on first launch. A prompt shown before a
 *    person understands what AceAiX sends gets declined once and forever, and
 *    iOS reviewers treat a cold-start prompt as a smell. `requestPushPermission`
 *    is exported so the settings screen and the moment right after onboarding
 *    can ask when the answer means something.
 * 2. Nothing here may throw into the app. Simulators have no push token, a
 *    development build may have no EAS project id, and Expo Go on Android has
 *    no remote push at all — every one of those degrades to "no push", never
 *    to a red screen.
 * 3. `expo-notifications` is reached only through `@/lib/push`, never imported
 *    here. That module has a `.web.ts` twin, and importing the real one on web
 *    warns from module scope before any guard in this file could run. See the
 *    header of `lib/push.ts`.
 */

configureForeground();

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const id = extra?.eas?.projectId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** Fetch the Expo token and hand it to the server. Never throws. */
async function syncPushToken(): Promise<boolean> {
  if (!pushSupported) return false;

  const id = projectId();
  // Without a project id Expo cannot mint a token; that is a build-config
  // situation, not a user-facing error.
  if (!id) return false;

  const token = await getExpoToken(id);
  if (!token) return false;

  try {
    await registerPushToken(token, Platform.OS);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ask for permission, and register the device on a yes.
 *
 * Call this from a moment that earns it — finishing onboarding, turning
 * notifications on in settings — never on launch. Resolves false when the
 * person declines or when push is unavailable here.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!pushSupported) return false;

  await ensureAndroidChannel();

  const state = await getPermission();
  if (state === 'granted') {
    await syncPushToken();
    return true;
  }
  // iOS only ever shows the system prompt once; asking again when it cannot be
  // asked would silently resolve false and look like a bug.
  if (state === 'blocked') return false;

  if (!(await requestPermission())) return false;

  await syncPushToken();
  return true;
}

/** True when this device is already allowed to show notifications. */
export async function hasPushPermission(): Promise<boolean> {
  if (!pushSupported) return false;
  return (await getPermission()) === 'granted';
}

/**
 * Where a tapped push should land.
 *
 * The payload carries the same typed target the notifications row uses
 * (`entity_type` / `entity_id` / `type`), so it is routed through the very
 * same function — which is what stops a "new message" push from opening a
 * profile, the way it used to.
 */
export function targetFromPushData(
  data: Record<string, unknown> | null | undefined,
): Href | null {
  if (!data) return null;

  const asString = (value: unknown): string | null =>
    typeof value === 'string' && value.length > 0
      ? value
      : typeof value === 'number'
        ? String(value)
        : null;

  const shaped: AppNotification = {
    id: asString(data.id) ?? '',
    type: (asString(data.type) as NotificationType) ?? 'follow',
    title: asString(data.title) ?? '',
    body: asString(data.body),
    is_read: false,
    actor_id: asString(data.actor_id),
    entity_type: asString(data.entity_type) as AppNotification['entity_type'],
    entity_id: asString(data.entity_id),
    actor_count: 1,
    data: {},
    created_at: new Date().toISOString(),
  };

  return notificationTarget(shaped);
}

/**
 * Mount once, near the root. Sets up the Android channel, routes taps, and
 * quietly refreshes the push token for anyone who has already opted in
 * (tokens rotate, and a stale one is the classic "notifications stopped
 * arriving" bug).
 */
export function usePushNotifications() {
  const router = useRouter();
  const coldStartHandled = useRef(false);

  useEffect(() => {
    if (!pushSupported) return;

    let cancelled = false;

    const navigate = (data: PushPayload) => {
      const target = targetFromPushData(data);
      if (!target || cancelled) return;
      try {
        router.push(target);
      } catch {
        /* The navigator was not ready; the tap is simply not honoured. */
      }
    };

    void ensureAndroidChannel();

    // Re-register silently when permission is already granted. `registerPushToken`
    // no-ops when nobody is signed in, so this is safe on the auth screens too.
    void hasPushPermission().then((allowed) => {
      if (allowed && !cancelled) void syncPushToken();
    });

    const unsubscribe = onNotificationTap(navigate);

    void coldStartTap().then((data) => {
      if (!data || coldStartHandled.current || cancelled) return;
      coldStartHandled.current = true;
      navigate(data);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  return { requestPushPermission, hasPushPermission };
}
