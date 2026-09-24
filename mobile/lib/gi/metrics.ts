/**
 * Turning taps into the metrics the server scores.
 *
 * Each game records one row per trial and hands the list to one of these.
 * The shapes returned are the contract with `private.gi_score_test` in
 * `20260924000001_game_intelligence.sql` — change a key here and the server
 * will mark every result "too_few_trials".
 *
 * The client summarises; it never scores. A number shown to the athlete as
 * their result always comes back from the server.
 */

export function median(values: readonly number[]): number | null {
  const xs = values.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

const round = (v: number | null) => (v == null ? null : Math.round(v));

/** A press this fast after the stimulus was a guess, not a reaction. */
export const ANTICIPATION_MS = 150;

// ── Reaction ────────────────────────────────────────────────────────────────
export interface ReactionRow {
  /** ms from light to tap; null when nothing was tapped in time. */
  rt: number | null;
  correct: boolean;
}

export interface ReactionMetrics {
  trials: number;
  correct: number;
  median_ms: number | null;
  anticipations: number;
}

export function reactionMetrics(rows: readonly ReactionRow[]): ReactionMetrics {
  const good = rows.filter((r) => r.correct && r.rt != null && r.rt >= ANTICIPATION_MS);
  return {
    trials: rows.length,
    correct: good.length,
    median_ms: round(median(good.map((r) => r.rt as number))),
    anticipations: rows.filter((r) => r.rt != null && r.rt < ANTICIPATION_MS).length,
  };
}

// ── Go / No-Go ──────────────────────────────────────────────────────────────
export interface GoNoGoRow {
  go: boolean;
  /** ms to the tap, or null if the player held back. */
  rt: number | null;
}

export interface GoNoGoMetrics {
  go_trials: number;
  go_hits: number;
  go_median_ms: number | null;
  nogo_trials: number;
  nogo_withheld: number;
}

export function goNoGoMetrics(rows: readonly GoNoGoRow[]): GoNoGoMetrics {
  const go = rows.filter((r) => r.go);
  const nogo = rows.filter((r) => !r.go);
  const hits = go.filter((r) => r.rt != null && r.rt >= ANTICIPATION_MS);
  return {
    go_trials: go.length,
    go_hits: hits.length,
    go_median_ms: round(median(hits.map((r) => r.rt as number))),
    nogo_trials: nogo.length,
    nogo_withheld: nogo.filter((r) => r.rt == null).length,
  };
}

// ── Flanker ─────────────────────────────────────────────────────────────────
export interface FlankerRow {
  congruent: boolean;
  correct: boolean;
  rt: number | null;
}

export interface FlankerMetrics {
  trials: number;
  correct: number;
  congruent_ms: number | null;
  incongruent_ms: number | null;
}

/** Medians over correct answers only — a wrong answer's speed means nothing. */
export function flankerMetrics(rows: readonly FlankerRow[]): FlankerMetrics {
  const ok = rows.filter((r) => r.correct && r.rt != null && r.rt >= ANTICIPATION_MS);
  return {
    trials: rows.length,
    correct: ok.length,
    congruent_ms: round(median(ok.filter((r) => r.congruent).map((r) => r.rt as number))),
    incongruent_ms: round(median(ok.filter((r) => !r.congruent).map((r) => r.rt as number))),
  };
}

// ── Tracking ────────────────────────────────────────────────────────────────
export interface TrackingRow {
  level: number;
  targets: number;
  found: number;
}

export interface TrackingMetrics {
  rounds: number;
  targets_total: number;
  targets_found: number;
  max_level: number;
}

/** `max_level` is the highest level at which a round was perfect — not merely reached. */
export function trackingMetrics(rows: readonly TrackingRow[]): TrackingMetrics {
  const perfect = rows.filter((r) => r.found === r.targets).map((r) => r.level);
  return {
    rounds: rows.length,
    targets_total: rows.reduce((s, r) => s + r.targets, 0),
    targets_found: rows.reduce((s, r) => s + r.found, 0),
    max_level: perfect.length ? Math.max(...perfect) : 1,
  };
}

// ── Anticipation ────────────────────────────────────────────────────────────
export interface AnticipationRow {
  /** |guess − truth| as a fraction of the arena width; null if no tap. */
  error: number | null;
}

export interface AnticipationMetrics {
  trials: number;
  answered: number;
  mean_error: number;
}

export function anticipationMetrics(rows: readonly AnticipationRow[]): AnticipationMetrics {
  const answered = rows.filter((r) => r.error != null).map((r) => r.error as number);
  const mean = answered.length ? answered.reduce((s, e) => s + e, 0) / answered.length : 1;
  return {
    trials: rows.length,
    answered: answered.length,
    mean_error: Math.round(Math.min(1, Math.max(0, mean)) * 1000) / 1000,
  };
}

// ── Pitch decision ──────────────────────────────────────────────────────────
export interface DecisionRow {
  scenario: string;
  /** A teammate id, 'shoot' or 'dribble' — or null when the clock ran out. */
  option: string | null;
  ms: number | null;
}

export interface DecisionMetrics {
  choices: { scenario: string; option: string | null; ms: number | null }[];
}

export function decisionMetrics(rows: readonly DecisionRow[]): DecisionMetrics {
  return {
    choices: rows.map((r) => ({
      scenario: r.scenario,
      option: r.option,
      ms: r.ms == null ? null : Math.round(r.ms),
    })),
  };
}

export type GiMetrics =
  | ReactionMetrics
  | GoNoGoMetrics
  | FlankerMetrics
  | TrackingMetrics
  | AnticipationMetrics
  | DecisionMetrics;

/**
 * Would the server accept this at all? Checked before submitting so a player
 * who wandered off mid-game is offered a retry instead of spending one of
 * their two attempts on an empty result.
 */
export function looksComplete(test: string, m: GiMetrics): boolean {
  switch (test) {
    case 'reaction': {
      const r = m as ReactionMetrics;
      return r.trials >= 12 && r.correct >= r.trials * 0.5;
    }
    case 'go_no_go': {
      const r = m as GoNoGoMetrics;
      return r.go_trials >= 20 && r.go_hits >= r.go_trials * 0.5;
    }
    case 'flanker': {
      const r = m as FlankerMetrics;
      return r.trials >= 16 && r.correct >= r.trials * 0.5 && r.incongruent_ms != null && r.congruent_ms != null;
    }
    case 'tracking': {
      const r = m as TrackingMetrics;
      return r.rounds >= 4;
    }
    case 'anticipation': {
      const r = m as AnticipationMetrics;
      return r.trials >= 8 && r.answered >= r.trials * 0.6;
    }
    case 'pitch_decision': {
      const r = m as DecisionMetrics;
      return r.choices.length >= 6;
    }
    default:
      return false;
  }
}
