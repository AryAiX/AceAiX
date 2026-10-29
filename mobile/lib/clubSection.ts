/** Order of the public club page, top to bottom. */
export const CLUB_SECTIONS = [
  'about',
  'matches',
  'squads',
  'events',
  'challenges',
  'openings',
  'awards',
  'posts',
] as const;

export type ClubSectionName = (typeof CLUB_SECTIONS)[number];

/** How many items a public-page preview shows. Posts uses a short grid of the same length. */
export const CLUB_PREVIEW_LIMIT = 6;
export const CLUB_POSTS_PREVIEW = 6;

export function clubPreviewLimit(name: ClubSectionName): number {
  return name === 'posts' ? CLUB_POSTS_PREVIEW : CLUB_PREVIEW_LIMIT;
}

export function parseClubSection(value: string | string[] | undefined): ClubSectionName | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  return (CLUB_SECTIONS as readonly string[]).includes(name) ? (name as ClubSectionName) : null;
}
