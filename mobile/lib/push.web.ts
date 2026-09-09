/**
 * Push notifications on web: there are none, and this file says so without
 * importing anything.
 *
 * `push.ts` explains why the split exists. The short version: importing
 * `expo-notifications` runs a module-scope subscription to device push token
 * changes, and on web that subscription exists only to print
 *
 *     [expo-notifications] Listening to push token changes is not yet fully
 *     supported on web. Adding a listener will have no effect.
 *
 * A guard inside a function cannot stop it, because the import already
 * happened. Metro resolves this file first on web, so the module is never
 * loaded there and the warning never has a chance to fire.
 *
 * Every function below is the honest answer rather than a throw: the web build
 * is the preview and the marketing surface, and a browser genuinely cannot
 * receive an Expo push. Callers check `pushSupported` when the difference
 * matters to what they show — the settings screen uses it to leave out a card
 * offering to turn on something that cannot be turned on.
 */

export const pushSupported = false;

export type PermissionState = 'granted' | 'denied' | 'blocked' | 'undetermined';
export type PushPayload = Record<string, unknown> | undefined;

export function configureForeground(): void {}

export async function ensureAndroidChannel(): Promise<void> {}

export async function getPermission(): Promise<PermissionState> {
  return 'blocked';
}

export async function requestPermission(): Promise<boolean> {
  return false;
}

export async function getExpoToken(_projectId: string): Promise<string | null> {
  return null;
}

export function onNotificationTap(_handler: (data: PushPayload) => void): () => void {
  return () => {};
}

export async function coldStartTap(): Promise<PushPayload> {
  return undefined;
}
