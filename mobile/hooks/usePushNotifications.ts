import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';

import { registerPushToken } from '@/lib/api';
import { notificationTarget } from '@/lib/routes';
import { Brand } from '@/theme/tokens';
import type { AppNotification, NotificationType } from '@/types/models';

/**
 * Push notifications.
 *
 * Two rules shape this file.
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
 */

// ── Foreground presentation ──────────────────────────────────────────────────
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  /* Not available on this platform. Notifications simply will not present. */
}

const ANDROID_CHANNEL_ID = 'default';

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const id = extra?.eas?.projectId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** Android will not display anything without a channel. Safe to call repeatedly. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'AceAiX',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: Brand.orange,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  } catch {
    /* Older Android, or the module is unavailable in this runtime. */
  }
}

/** Fetch the Expo token and hand it to the server. Never throws. */
async function syncPushToken(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const id = projectId();
  // Without a project id Expo cannot mint a token; that is a build-config
  // situation, not a user-facing error.
  if (!id) return false;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId: id });
    if (!token?.data) return false;
    await registerPushToken(token.data, Platform.OS);
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
  if (Platform.OS === 'web') return false;

  try {
    await ensureAndroidChannel();

    const current = await Notifications.getPermissionsAsync();
    const alreadyAllowed =
      current.granted ||
      current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (alreadyAllowed) {
      await syncPushToken();
      return true;
    }

    // iOS only ever shows the system prompt once; asking again when it cannot
    // be asked would silently resolve false and look like a bug.
    if (current.canAskAgain === false) return false;

    const next = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });

    const granted =
      next.granted ||
      next.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!granted) return false;

    await syncPushToken();
    return true;
  } catch {
    return false;
  }
}

/** True when this device is already allowed to show notifications. */
export async function hasPushPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    return (
      current.granted ||
      current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
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
    if (Platform.OS === 'web') return;

    let cancelled = false;

    const navigate = (data: Record<string, unknown> | null | undefined) => {
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

    let subscription: { remove: () => void } | undefined;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        navigate(
          response.notification.request.content.data as Record<string, unknown> | undefined,
        );
      });
    } catch {
      /* No notification module in this runtime. */
    }

    // A tap that launched the app from cold has no live listener to catch it.
    try {
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (!response || coldStartHandled.current || cancelled) return;
          coldStartHandled.current = true;
          navigate(
            response.notification.request.content.data as Record<string, unknown> | undefined,
          );
        })
        .catch(() => {
          /* Nothing was tapped. */
        });
    } catch {
      /* The module is unavailable in this runtime. */
    }

    return () => {
      cancelled = true;
      try {
        subscription?.remove();
      } catch {
        /* Already torn down. */
      }
    };
  }, [router]);

  return { requestPushPermission, hasPushPermission };
}
