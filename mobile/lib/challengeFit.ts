import type { AgeBand, Challenge } from '@/types/models';

/** What we know about the athlete looking at Home. */
export interface ChallengeViewer {
  /** Main sport and any others they play. */
  sports: string[];
  /** Exact age when known (from their own birth date). */
  age: number | null;
  /** The band, when only that is known. */
  band: AgeBand | null;
}

const BANDS: Record<AgeBand, [number, number]> = {
  '13_15': [13, 15],
  '16_17': [16, 17],
  '18_24': [18, 24],
  '25_plus': [25, 120],
};

/** Old enough and young enough to enter. No limits, or nothing known, fits. */
export function ageFits(challenge: Pick<Challenge, 'age_min' | 'age_max'>, viewer: ChallengeViewer): boolean {
  const min = challenge.age_min ?? 0;
  const max = challenge.age_max ?? 200;
  if (viewer.age != null) return viewer.age >= min && viewer.age <= max;
  if (viewer.band) {
    const [lo, hi] = BANDS[viewer.band];
    return hi >= min && lo <= max;
  }
  return true;
}

/**
 * The challenge Home shows. One in your sport that you are old enough for
 * comes first; then one you can enter in another sport; then one in your
 * sport you can't enter yet; otherwise the first in the list, which is how
 * the server orders them (not entered first, then closing soonest). Ties
 * keep that order.
 */
export function pickChallenge<T extends Pick<Challenge, 'sport' | 'age_min' | 'age_max'>>(
  challenges: T[],
  viewer: ChallengeViewer,
): T | null {
  if (challenges.length === 0) return null;
  const mine = new Set(viewer.sports.map((s) => s.trim().toLowerCase()).filter(Boolean));
  let best: T | null = null;
  let bestScore = -1;
  for (const challenge of challenges) {
    const sport = mine.has((challenge.sport ?? '').trim().toLowerCase());
    const fits = ageFits(challenge, viewer);
    const score = sport && fits ? 3 : fits ? 2 : sport ? 1 : 0;
    if (score > bestScore) {
      best = challenge;
      bestScore = score;
    }
  }
  return best;
}

/** Whole years from a YYYY-MM-DD birth date. */
export function ageFrom(birthDate: string | null | undefined, now = new Date()): number | null {
  if (!birthDate) return null;
  const born = new Date(`${birthDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(born.getTime())) return null;
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() < born.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
