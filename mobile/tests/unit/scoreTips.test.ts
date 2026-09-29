import { describe, expect, it } from 'vitest';

import { tipText } from '@/lib/scoreTips';
import type { ScoreTip } from '@/types/models';

const t = (key: string, vars?: Record<string, string | number>) =>
  vars ? `${key}#${vars.count}` : key;

function tip(key: string, points: number): ScoreTip {
  return { key, label: 'EN label', detail: 'EN detail', points, pillar: 'media' };
}

describe('tipText', () => {
  it('recovers the clip count from the points', () => {
    expect(tipText(tip('add_highlights', 15), t).label).toBe('score.tip.highlightsLabel#3');
    expect(tipText(tip('add_highlights', 5), t).label).toBe('score.tip.highlightsLabel#1');
  });

  it('recovers the empty field count from the points', () => {
    const text = tipText(tip('complete_profile', 10), t);
    expect(text.label).toBe('score.tip.profileLabel');
    expect(text.detail).toBe('score.tip.profileDetail#5');
  });

  it('translates tips without a count', () => {
    expect(tipText(tip('log_matches', 12), t)).toEqual({
      label: 'score.tip.matchesLabel',
      detail: 'score.tip.matchesDetail',
    });
  });

  it('shows the server text for a tip it does not know', () => {
    expect(tipText(tip('something_new', 3), t)).toEqual({
      label: 'EN label',
      detail: 'EN detail',
    });
  });
});
