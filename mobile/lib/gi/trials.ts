import { randInt, shuffle, type Rng } from './random';

/**
 * Trial plans — what each game will show, decided before it starts.
 *
 * Deciding up front, from a seed, keeps the game components dumb: they play a
 * list. It also makes the balance of each list a thing a unit test can check
 * (a Go/No-Go with no no-go balls would score everyone perfectly on
 * inhibition, and nothing on screen would look wrong).
 */

export type Mode = 'practice' | 'scored';

// ── Reaction ────────────────────────────────────────────────────────────────
export interface ReactionTrial {
  /** Which of four pads lights, 0–3. */
  target: number;
  /** Wait before it lights, ms. Varied so the rhythm cannot be learned. */
  delay: number;
}

export function reactionPlan(rng: Rng, mode: Mode): ReactionTrial[] {
  const count = mode === 'practice' ? 4 : 16;
  const out: ReactionTrial[] = [];
  let last = -1;
  for (let i = 0; i < count; i += 1) {
    let target = randInt(rng, 0, 3);
    if (target === last) target = (target + randInt(rng, 1, 3)) % 4;
    last = target;
    out.push({ target, delay: randInt(rng, 600, 1600) });
  }
  return out;
}

// ── Go / No-Go ──────────────────────────────────────────────────────────────
export interface GoNoGoTrial {
  go: boolean;
  /** Gap before the ball appears, ms. */
  gap: number;
}

/** Exactly a quarter no-go, shuffled, and never a no-go first. */
export function goNoGoPlan(rng: Rng, mode: Mode): GoNoGoTrial[] {
  const count = mode === 'practice' ? 8 : 40;
  const nogo = Math.round(count / 4);
  const flags = shuffle(rng, [
    ...Array.from({ length: count - nogo }, () => true),
    ...Array.from({ length: nogo }, () => false),
  ]);
  if (!flags[0]) {
    const swap = flags.indexOf(true);
    [flags[0], flags[swap]] = [flags[swap], flags[0]];
  }
  return flags.map((go) => ({ go, gap: randInt(rng, 450, 900) }));
}

// ── Flanker ─────────────────────────────────────────────────────────────────
export interface FlankerTrial {
  /** Direction of the centre arrow. */
  dir: 'left' | 'right';
  /** Do the four around it point the same way? */
  congruent: boolean;
  gap: number;
}

/** Half congruent, half not, balanced across both directions. */
export function flankerPlan(rng: Rng, mode: Mode): FlankerTrial[] {
  const count = mode === 'practice' ? 4 : 24;
  const base: Omit<FlankerTrial, 'gap'>[] = [];
  for (let i = 0; i < count; i += 1) {
    base.push({ dir: i % 2 === 0 ? 'left' : 'right', congruent: i % 4 < 2 });
  }
  return shuffle(rng, base).map((t) => ({ ...t, gap: randInt(rng, 400, 800) }));
}

// ── Anticipation ────────────────────────────────────────────────────────────
export interface AnticipationTrial {
  /** Launch point, as a fraction of the arena width, at the bottom edge. */
  startX: number;
  /** Where the ball crosses the goal line at the top, 0–1. */
  endX: number;
  /** Sideways bend at the midpoint, as a fraction of width. */
  curve: number;
  /** Flight time to the goal line, ms. */
  duration: number;
  /** Fraction of the flight that is visible before the ball disappears. */
  visible: number;
}

export function anticipationPlan(rng: Rng, mode: Mode): AnticipationTrial[] {
  const count = mode === 'practice' ? 2 : 10;
  const out: AnticipationTrial[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      startX: 0.2 + rng() * 0.6,
      endX: 0.08 + rng() * 0.84,
      curve: (rng() - 0.5) * 0.5,
      duration: randInt(rng, 1100, 1700),
      visible: 0.5 + rng() * 0.15,
    });
  }
  return out;
}

/**
 * Where the ball is at progress p ∈ [0, 1] of its flight: a quadratic Bézier
 * from the launch point to the goal line, bent by `curve` at the middle.
 * Coordinates are fractions of the arena; y runs 1 (bottom) → 0 (goal line).
 */
export function ballAt(trial: AnticipationTrial, p: number): { x: number; y: number } {
  const q = Math.max(0, Math.min(1, p));
  const cx = (trial.startX + trial.endX) / 2 + trial.curve;
  const x = (1 - q) * (1 - q) * trial.startX + 2 * (1 - q) * q * cx + q * q * trial.endX;
  const y = 1 - q;
  return { x, y };
}

// ── Tracking ────────────────────────────────────────────────────────────────
export const TRACKING_BALLS = 8;

/** Targets to follow and ball speed (arena widths per second) at each level. */
export function trackingLevel(level: number): { targets: number; speed: number } {
  const l = Math.max(1, Math.min(8, Math.round(level)));
  return { targets: l >= 5 ? 4 : 3, speed: 0.22 + (l - 1) * 0.06 };
}

/** The staircase: up a level after a perfect round, down one after a poor one. */
export function nextTrackingLevel(level: number, found: number, targets: number): number {
  if (found === targets) return Math.min(8, level + 1);
  if (found < targets - 1) return Math.max(1, level - 1);
  return level;
}

export interface TrackingBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Balls spread over the arena, none overlapping, each with a random heading. */
export function trackingStart(rng: Rng, speed: number, radius = 0.06): TrackingBall[] {
  const out: TrackingBall[] = [];
  let guard = 0;
  while (out.length < TRACKING_BALLS && guard < 500) {
    guard += 1;
    const x = radius + rng() * (1 - 2 * radius);
    const y = radius + rng() * (1 - 2 * radius);
    if (out.some((b) => Math.hypot(b.x - x, b.y - y) < radius * 2.4)) continue;
    const angle = rng() * Math.PI * 2;
    out.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
  }
  return out;
}

/** Advance every ball by dt seconds, bouncing off the walls. Pure. */
export function trackingStep(balls: TrackingBall[], dt: number, radius = 0.06): TrackingBall[] {
  return balls.map((b) => {
    let { x, y, vx, vy } = b;
    x += vx * dt;
    y += vy * dt;
    if (x < radius) {
      x = radius + (radius - x);
      vx = Math.abs(vx);
    } else if (x > 1 - radius) {
      x = 1 - radius - (x - (1 - radius));
      vx = -Math.abs(vx);
    }
    if (y < radius) {
      y = radius + (radius - y);
      vy = Math.abs(vy);
    } else if (y > 1 - radius) {
      y = 1 - radius - (y - (1 - radius));
      vy = -Math.abs(vy);
    }
    return { x, y, vx, vy };
  });
}
