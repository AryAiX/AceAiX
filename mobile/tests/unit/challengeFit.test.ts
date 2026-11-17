import { describe, expect, it } from 'vitest';

import { ageFrom, ageFits, pickChallenge } from '@/lib/challengeFit';

const c = (sport: string, age_min: number | null = null, age_max: number | null = null) => ({
  sport,
  age_min,
  age_max,
});

describe('which challenge Home shows', () => {
  it('prefers your sport at your age', () => {
    const list = [c('Football', 13, 19), c('Tennis', 13, 19), c('Tennis', 20, 30)];
    expect(pickChallenge(list, { sports: ['Tennis'], age: 16, band: null })).toBe(list[1]);
  });

  it('then one you can enter in another sport', () => {
    const list = [c('Tennis', 20, 30), c('Football')];
    expect(pickChallenge(list, { sports: ['Tennis'], age: 16, band: null })).toBe(list[1]);
  });

  it('falls back to the first when nothing fits', () => {
    const list = [c('Football', 20, 30), c('Padel', 20, 30)];
    expect(pickChallenge(list, { sports: ['Tennis'], age: 16, band: null })).toBe(list[0]);
    expect(pickChallenge([], { sports: [], age: null, band: null })).toBeNull();
  });

  it('uses the age band when the exact age is unknown', () => {
    expect(ageFits(c('Football', 13, 15), { sports: [], age: null, band: '16_17' })).toBe(false);
    expect(ageFits(c('Football', 13, 19), { sports: [], age: null, band: '16_17' })).toBe(true);
  });

  it('counts whole years from a birth date', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    expect(ageFrom('2010-11-10', now)).toBe(16);
    expect(ageFrom('2010-11-11', now)).toBe(15);
    expect(ageFrom(null, now)).toBeNull();
  });
});
