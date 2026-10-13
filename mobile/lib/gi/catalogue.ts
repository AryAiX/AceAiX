/**
 * The six games, in the order the hub offers them.
 *
 * Football first, because it is the one a player came for and the one a scout
 * reads first; the four quick cognitive games after it. `weight` mirrors
 * `private.gi_weight` and is shown only as "counts most" on the hub — the
 * arithmetic happens on the server.
 */
export type GiTestKey =
  | 'pitch_decision'
  | 'anticipation'
  | 'tracking'
  | 'go_no_go'
  | 'flanker'
  | 'reaction';

export interface GiTestInfo {
  key: GiTestKey;
  /** i18n stem: `intelligence.tests.<i18n>.name` / `.what` / `.how`. */
  i18n: string;
  /** Rough length of the scored round, seconds. */
  seconds: number;
  weight: number;
  /** A play hue name from theme/tokens `Play`. */
  hue: 'flame' | 'azure' | 'violet' | 'mint' | 'magenta' | 'cyan';
}

export const GI_TESTS: readonly GiTestInfo[] = [
  { key: 'pitch_decision', i18n: 'pitchDecision', seconds: 60, weight: 0.35, hue: 'flame' },
  { key: 'anticipation', i18n: 'anticipation', seconds: 40, weight: 0.15, hue: 'magenta' },
  { key: 'tracking', i18n: 'tracking', seconds: 70, weight: 0.15, hue: 'violet' },
  { key: 'go_no_go', i18n: 'goNoGo', seconds: 50, weight: 0.15, hue: 'mint' },
  { key: 'flanker', i18n: 'flanker', seconds: 40, weight: 0.1, hue: 'cyan' },
  { key: 'reaction', i18n: 'reaction', seconds: 30, weight: 0.1, hue: 'azure' },
];

export const GI_TEST_KEYS = GI_TESTS.map((t) => t.key);

export function giTest(key: string): GiTestInfo | undefined {
  return GI_TESTS.find((t) => t.key === key);
}

/** Server rule: an overall needs at least this many valid tests. */
export const GI_MIN_TESTS_FOR_OVERALL = 4;

/**
 * "Top 12%" from a percentile, or null when the server withheld one (a cohort
 * under ten). Same rule as the Talent Score: never below 1%.
 */
export function topPercent(percentile: number | null | undefined): number | null {
  return percentile == null ? null : Math.max(1, 100 - percentile);
}

/**
 * The medal one game's score earns, shown the moment a round ends and on its
 * hub tile. A reward for the round, not a band on the player: the thresholds
 * are the product's, and nothing on the server reads them.
 */
export type GiMedal = 'keepGoing' | 'bronze' | 'silver' | 'gold';

export function giMedal(score: number | null | undefined): GiMedal | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (score >= 85) return 'gold';
  if (score >= 70) return 'silver';
  if (score >= 50) return 'bronze';
  return 'keepGoing';
}
