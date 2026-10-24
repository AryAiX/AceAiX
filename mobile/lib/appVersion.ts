/**
 * Whether to offer a store update, and whether to show release notes.
 *
 * Numeric parts only: "2.0.10" is newer than "2.0.9". The installed version
 * comes from the Expo config, never from a native version API — in Expo Go
 * those report Expo Go itself.
 */

export type UpdateDecision = 'required' | 'available' | 'none';
export type WhatsNewDecision = 'show' | 'skip';
export type LaunchPrompt = 'required' | 'whatsNew' | 'available' | 'none';

export interface PlatformVersion {
  latest?: string | null;
  minimum?: string | null;
}

/** -1 when a is older, 0 when equal, 1 when a is newer. Missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const left = numericParts(a);
  const right = numericParts(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const da = left[i] ?? 0;
    const db = right[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

/**
 * `required` when a minimum is set and this build is older than it.
 * Dismissal does not apply: the person cannot postpone a floor.
 * `available` when this build is older than `latest` and they have not
 * already said Later to that same latest. Otherwise `none`.
 */
export function decideUpdate(
  installed: string,
  platformRecord: PlatformVersion | null | undefined,
  dismissedVersion?: string | null,
): UpdateDecision {
  if (!platformRecord) return 'none';

  const minimum = text(platformRecord.minimum);
  if (minimum && compareVersions(installed, minimum) < 0) return 'required';

  const latest = text(platformRecord.latest);
  const dismissed = text(dismissedVersion);
  if (latest && compareVersions(installed, latest) < 0 && latest !== dismissed) {
    return 'available';
  }
  return 'none';
}

/**
 * First launch has no last-seen version, so notes stay hidden and the caller
 * records the installed version. After that, notes show only when this build
 * is newer than the one they last saw and this build has notes.
 */
export function decideWhatsNew(
  installed: string,
  lastSeen: string | null | undefined,
  hasNotes: boolean,
): WhatsNewDecision {
  const seen = text(lastSeen);
  if (!seen || !hasNotes) return 'skip';
  return compareVersions(installed, seen) > 0 ? 'show' : 'skip';
}

/** One sheet per launch, in this order. */
export function chooseLaunchPrompt(
  update: UpdateDecision,
  whatsNew: WhatsNewDecision,
): LaunchPrompt {
  if (update === 'required') return 'required';
  if (whatsNew === 'show') return 'whatsNew';
  if (update === 'available') return 'available';
  return 'none';
}

/**
 * i18n key for a release's notes. "2.0.6" becomes "v2_0_6", which `t()` can
 * walk and which the catalogue parity test accepts as an object key.
 */
export function versionNotesKey(version: string): string {
  const parts = numericParts(version).map((part) => String(part));
  return `v${parts.join('_')}`;
}

function text(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numericParts(version: string): number[] {
  return version
    .trim()
    .split('.')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const match = /^(\d+)/.exec(part);
      return match ? parseInt(match[1], 10) : 0;
    });
}
