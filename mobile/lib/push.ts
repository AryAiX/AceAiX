import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Brand } from '@/theme/tokens';

/**
 * Everything in the app that touches `expo-notifications`, in one file.
 *
 * There is a `push.web.ts` beside this one, and the split is the whole point.
 * Importing `expo-notifications` at all runs a module-scope side effect —
 * `DevicePushTokenAutoRegistration.fx` subscribes to device push token changes
 * as soon as the module is evaluated — and on web that subscription is a stub
 * whose only behaviour is to warn:
 *
 *     [expo-notifications] Listening to push token changes is not yet fully
 *     supported on web. Adding a listener will have no effect.
 *
 * No `Platform.OS === 'web'` check inside a function can prevent that, because
 * the import has already happened by the time any function runs. The only fix
 * is not to import the module on web, which is what the platform-suffixed file
 * does — Metro resolves `push.web.ts` first and this file is never bundled
 * there. It takes the abort-controller polyfill and the rest of the
 * notifications module out of the web build with it, none of which could ever
 * have worked in a browser.
 *
 * So: nothing outside these two files may import `expo-notifications`. The
 * surface below is deliberately small and app-shaped rather than a re-export,
 * so the stub can be a truthful implementation rather than a cast.
 */

/** Whether this platform can do push at all. */
export const pushSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const ANDROID_CHANNEL_ID = 'default';

/** Notifications that arrive while the app is open still get shown. */
export function configureForeground(): void {
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
    /* Not available in this runtime. Notifications simply will not present. */
  }
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

export type PermissionState = 'granted' | 'denied' | 'blocked' | 'undetermined';

/**
 * `blocked` is separate from `denied` on purpose: iOS shows the system prompt
 * once and once only, so asking again would resolve false without anything
 * appearing on screen, which looks like a broken button.
 */
export async function getPermission(): Promise<PermissionState> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (
      current.granted ||
      current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
      return 'granted';
    }
    return current.canAskAgain === false ? 'blocked' : 'undetermined';
  } catch {
    return 'undetermined';
  }
}

export async function requestPermission(): Promise<boolean> {
  try {
    const next = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return (
      next.granted ||
      next.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

/** The Expo push token, or null when this build cannot mint one. */
export async function getExpoToken(projectId: string): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token?.data ?? null;
  } catch {
    return null;
  }
}

export type PushPayload = Record<string, unknown> | undefined;

/** Subscribe to taps on a notification. Returns an unsubscribe. */
export function onNotificationTap(handler: (data: PushPayload) => void): () => void {
  try {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handler(response.notification.request.content.data as PushPayload);
      },
    );
    return () => {
      try {
        subscription.remove();
      } catch {
        /* Already torn down. */
      }
    };
  } catch {
    return () => {};
  }
}

/** A tap that launched the app from cold has no live listener to catch it. */
export async function coldStartTap(): Promise<PushPayload> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification.request.content.data as PushPayload;
  } catch {
    return undefined;
  }
}
