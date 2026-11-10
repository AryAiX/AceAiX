/**
 * How search decides what to show and in what order. All of it runs on the
 * phone over what the existing lookups return; there is no ranking on the
 * server to lean on, so these rules are kept small and predictable.
 */

/** 4 exact, 3 the text starts with it, 2 a word starts with it, 1 inside, 0 not at all. */
export function matchScore(term: string, ...fields: (string | null | undefined)[]): number {
  const needle = fold(term);
  if (!needle) return 0;
  let best = 0;
  for (const field of fields) {
    const hay = fold(field ?? '');
    if (!hay) continue;
    if (hay === needle) return 4;
    if (hay.startsWith(needle)) best = Math.max(best, 3);
    else if (hay.split(/[\s\-_/.,·]+/).some((word) => word.startsWith(needle))) best = Math.max(best, 2);
    else if (hay.includes(needle)) best = Math.max(best, 1);
  }
  return best;
}

/** Lower case, no accents, # dropped, so "#Tennis" and "tennis" meet. */
export function fold(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/#/g, '')
    .trim()
    .toLowerCase();
}

/** Rows that match at all, best first. Ties keep the order they came in. */
export function rankBy<T>(rows: T[], term: string, fields: (row: T) => (string | null | undefined)[]): T[] {
  return rows
    .map((row, index) => ({ row, index, score: matchScore(term, ...fields(row)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.row);
}

export const PEOPLE_ON_ALL = 5;

/**
 * People worth showing on "All". A name where a word starts with what was
 * typed counts; a name that merely contains it ("an" inside "Joanna") counts
 * only when nothing better turned up and the word is long enough to mean
 * something. Never more than five: "Find a player" opens the rest.
 */
export function relevantPeople<T>(rows: T[], term: string, name: (row: T) => string | null | undefined): T[] {
  const scored = rows.map((row, index) => ({ row, index, score: matchScore(term, name(row)) }));
  const strong = scored.filter((entry) => entry.score >= 2);
  const pool = strong.length > 0 ? strong : fold(term).length >= 3 ? scored.filter((e) => e.score === 1) : [];
  return pool
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, PEOPLE_ON_ALL)
    .map((entry) => entry.row);
}

export type SectionKey = 'people' | 'posts' | 'clubs' | 'trials' | 'challenges' | 'meetups' | 'sponsors';

/** The everyday order: posts lead, like TikTok's search, then who and where. */
export const BASE_ORDER: SectionKey[] = ['posts', 'people', 'clubs', 'trials', 'challenges', 'meetups', 'sponsors'];

/**
 * Which sections show, and in what order. Empty ones drop out. A section
 * whose best row is the name itself, or starts with it (someone typed a
 * person's or a club's name), moves to the top; the rest keep the everyday
 * order.
 */
export function orderSections(best: Partial<Record<SectionKey, number>>, counts: Partial<Record<SectionKey, number>>): SectionKey[] {
  return BASE_ORDER.filter((key) => (counts[key] ?? 0) > 0)
    .map((key, index) => ({ key, index, lead: (best[key] ?? 0) >= 3 ? (best[key] ?? 0) : 0 }))
    .sort((a, b) => b.lead - a.lead || a.index - b.index)
    .map((entry) => entry.key);
}
