import type { Translate } from '@/lib/i18n-bridge';

/**
 * Labels for the values club pages store in English (`club.labels.*`).
 *
 * The database keeps `'head_coach'`, `'U14'`, `'Grass pitch'`; people read
 * them in their own language. A value the catalogue does not know — a
 * category a club typed itself, say "U9 girls" — is shown as typed.
 */
export type ClubLabelGroup =
  | 'type'
  | 'role'
  | 'roleHint'
  | 'audience'
  | 'eventKind'
  | 'staffRole'
  | 'placement'
  | 'recipient'
  | 'matchStatus'
  | 'matchEvent'
  | 'verification'
  | 'social'
  | 'category'
  | 'facility'
  | 'side';

/** "Grass pitch" → "grass_pitch": the key a preset is stored under. */
export function labelKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function clubLabel(t: Translate, group: ClubLabelGroup, value: string | null | undefined): string {
  if (!value) return '';
  // Categories keep their stored case ("Senior"); everything else is a slug.
  const key = group === 'category' ? value.trim() : group === 'facility' ? labelKey(value) : value;
  const path = `club.labels.${group}.${key}`;
  const translated = t(path);
  return translated === path ? value : translated;
}
