import { describe, expect, it } from 'vitest';

import { seededRng, seedFrom, shuffle } from '@/lib/gi/random';
import {
  anticipationPlan,
  ballAt,
  flankerPlan,
  goNoGoPlan,
  nextTrackingLevel,
  reactionPlan,
  trackingLevel,
  trackingStart,
  trackingStep,
} from '@/lib/gi/trials';
import {
  anticipationMetrics,
  anticipationVerdict,
  decisionMetrics,
  flankerMetrics,
  goNoGoMetrics,
  looksComplete,
  median,
  reactionMetrics,
  trackingMetrics,
} from '@/lib/gi/metrics';
import { GI_TESTS, giMedal, topPercent } from '@/lib/gi/catalogue';

/**
 * Game Intelligence — the parts that decide what a player is shown and what is
 * sent to the server. The server scores; these pin the plans the games play
 * and the metric shapes `private.gi_score_test` reads.
 */

describe('seeded randomness', () => {
  it('repeats exactly for the same seed', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    for (let i = 0; i < 20; i += 1) expect(a()).toBe(b());
  });

  it('turns a session id into a stable seed', () => {
    expect(seedFrom('session-1')).toBe(seedFrom('session-1'));
    expect(seedFrom('session-1')).not.toBe(seedFrom('session-2'));
  });

  it('shuffles without losing or inventing items', () => {
    const out = shuffle(seededRng(1), [1, 2, 3, 4, 5, 6]);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('trial plans', () => {
  it('never lights the same reaction pad twice in a row', () => {
    const plan = reactionPlan(seededRng(7), 'scored');
    expect(plan).toHaveLength(16);
    for (let i = 1; i < plan.length; i += 1) expect(plan[i].target).not.toBe(plan[i - 1].target);
  });

  it('makes exactly a quarter of go/no-go balls no-go, and never the first', () => {
    for (let seed = 0; seed < 25; seed += 1) {
      const plan = goNoGoPlan(seededRng(seed), 'scored');
      expect(plan).toHaveLength(40);
      expect(plan.filter((t) => !t.go)).toHaveLength(10);
      expect(plan[0].go).toBe(true);
    }
  });

  it('balances the flanker: half congruent, half each direction', () => {
    const plan = flankerPlan(seededRng(3), 'scored');
    expect(plan.filter((t) => t.congruent)).toHaveLength(12);
    expect(plan.filter((t) => t.dir === 'left')).toHaveLength(12);
  });

  it('flies the anticipation ball from launch to its goal-line crossing', () => {
    const [trial] = anticipationPlan(seededRng(9), 'scored');
    expect(ballAt(trial, 0)).toEqual({ x: trial.startX, y: 1 });
    const end = ballAt(trial, 1);
    expect(end.x).toBeCloseTo(trial.endX, 10);
    expect(end.y).toBe(0);
    expect(trial.visible).toBeGreaterThanOrEqual(0.5);
    expect(trial.visible).toBeLessThanOrEqual(0.65);
  });

  it('keeps tracking balls inside the arena however long they run', () => {
    let balls = trackingStart(seededRng(5), trackingLevel(8).speed);
    expect(balls).toHaveLength(8);
    for (let i = 0; i < 600; i += 1) balls = trackingStep(balls, 1 / 60);
    for (const b of balls) {
      expect(b.x).toBeGreaterThanOrEqual(0.06 - 1e-9);
      expect(b.x).toBeLessThanOrEqual(0.94 + 1e-9);
      expect(b.y).toBeGreaterThanOrEqual(0.06 - 1e-9);
      expect(b.y).toBeLessThanOrEqual(0.94 + 1e-9);
    }
  });

  it('climbs the tracking staircase on a perfect round and drops on a poor one', () => {
    expect(nextTrackingLevel(3, 3, 3)).toBe(4);
    expect(nextTrackingLevel(3, 2, 3)).toBe(3);
    expect(nextTrackingLevel(3, 1, 3)).toBe(2);
    expect(nextTrackingLevel(8, 4, 4)).toBe(8);
    expect(nextTrackingLevel(1, 0, 3)).toBe(1);
    expect(trackingLevel(5).targets).toBe(4);
  });
});

describe('metrics sent to the server', () => {
  it('takes a true median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it('does not count a guess as a reaction', () => {
    const m = reactionMetrics([
      { rt: 100, correct: true },
      { rt: 400, correct: true },
      { rt: 500, correct: true },
      { rt: null, correct: false },
    ]);
    expect(m).toEqual({ trials: 4, correct: 2, median_ms: 450, anticipations: 1 });
  });

  it('counts a no-go held back, and a go missed, the right way round', () => {
    const m = goNoGoMetrics([
      { go: true, rt: 380 },
      { go: true, rt: null },
      { go: false, rt: null },
      { go: false, rt: 300 },
    ]);
    expect(m).toEqual({
      go_trials: 2,
      go_hits: 1,
      go_median_ms: 380,
      nogo_trials: 2,
      nogo_withheld: 1,
    });
  });

  it('splits flanker times by congruence, over correct answers only', () => {
    const m = flankerMetrics([
      { congruent: true, correct: true, rt: 500 },
      { congruent: false, correct: true, rt: 600 },
      { congruent: false, correct: false, rt: 350 },
    ]);
    expect(m).toEqual({ trials: 3, correct: 2, congruent_ms: 500, incongruent_ms: 600 });
  });

  it('credits the highest tracking level cleared, not merely reached', () => {
    const m = trackingMetrics([
      { level: 1, targets: 3, found: 3 },
      { level: 2, targets: 3, found: 3 },
      { level: 3, targets: 3, found: 2 },
    ]);
    expect(m).toEqual({ rounds: 3, targets_total: 9, targets_found: 8, max_level: 2 });
  });

  it('averages anticipation error over the balls actually answered', () => {
    const m = anticipationMetrics([{ error: 0.1 }, { error: 0.2 }, { error: null }]);
    expect(m).toEqual({ trials: 3, answered: 2, mean_error: 0.15 });
  });

  it('sends pitch decisions as choices, with timeouts as null', () => {
    const m = decisionMetrics([
      { scenario: 's1', option: 'a', ms: 1234.6 },
      { scenario: 's2', option: null, ms: null },
    ]);
    expect(m.choices).toEqual([
      { scenario: 's1', option: 'a', ms: 1235 },
      { scenario: 's2', option: null, ms: null },
    ]);
  });

  it('spots a round too thin for the server before an attempt is spent on it', () => {
    expect(looksComplete('reaction', { trials: 16, correct: 4, median_ms: 400, anticipations: 0 })).toBe(false);
    expect(looksComplete('reaction', { trials: 16, correct: 14, median_ms: 400, anticipations: 0 })).toBe(true);
    expect(looksComplete('pitch_decision', { choices: [] })).toBe(false);
  });
});

describe('catalogue', () => {
  it('weights the six games to one, as the server does', () => {
    expect(GI_TESTS).toHaveLength(6);
    expect(GI_TESTS.reduce((s, t) => s + t.weight, 0)).toBeCloseTo(1, 10);
  });

  it('never says "Top 0%"', () => {
    expect(topPercent(100)).toBe(1);
    expect(topPercent(71)).toBe(29);
    expect(topPercent(null)).toBeNull();
  });
});

describe('result moments', () => {
  it('awards a medal by score band', () => {
    expect(giMedal(null)).toBeNull();
    expect(giMedal(Number.NaN)).toBeNull();
    expect(giMedal(0)).toBe('keepGoing');
    expect(giMedal(49.9)).toBe('keepGoing');
    expect(giMedal(50)).toBe('bronze');
    expect(giMedal(69)).toBe('bronze');
    expect(giMedal(70)).toBe('silver');
    expect(giMedal(84)).toBe('silver');
    expect(giMedal(85)).toBe('gold');
    expect(giMedal(100)).toBe('gold');
  });

  it('calls a Read the Ball guess by how far off it was', () => {
    expect(anticipationVerdict(null)).toBe('missed');
    expect(anticipationVerdict(0)).toBe('spotOn');
    expect(anticipationVerdict(0.05)).toBe('spotOn');
    expect(anticipationVerdict(0.1)).toBe('close');
    expect(anticipationVerdict(0.15)).toBe('close');
    expect(anticipationVerdict(0.3)).toBe('missed');
  });
});
