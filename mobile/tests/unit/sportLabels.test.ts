import { describe, expect, it } from 'vitest';

import { positionLabel, sportLabel } from '@/constants/sports';

const t = (key: string) => `t:${key}`;

describe('sportLabel', () => {
  it('translates a stored sport name', () => {
    expect(sportLabel(t, 'Football')).toMatch(/^t:/);
  });

  it('translates lowercase legacy values the same way', () => {
    expect(sportLabel(t, 'football')).toBe(sportLabel(t, 'Football'));
  });

  it('falls back to the stored value when unknown', () => {
    expect(sportLabel(t, 'Underwater hockey')).toBe('Underwater hockey');
  });
});

describe('positionLabel', () => {
  it('translates lowercase legacy values', () => {
    expect(positionLabel(t, 'striker')).toBe(positionLabel(t, 'Striker'));
    expect(positionLabel(t, 'Striker')).toMatch(/^t:/);
  });
});
