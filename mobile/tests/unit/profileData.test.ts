import { describe, expect, it } from 'vitest';
import { normalizeAttributes } from '@/lib/profileData';

describe('normalizeAttributes', () => {
  it('preserves valid attribute arrays and removes malformed entries', () => {
    expect(normalizeAttributes([
      { label: 'Speed', value: 87 },
      { label: 'Missing score' },
      null,
    ])).toEqual([{ label: 'Speed', value: 87 }]);
  });

  it('converts legacy score objects used by existing athlete rows', () => {
    expect(normalizeAttributes({ pace: 91, ball_control: 84, note: 'fast' })).toEqual([
      { label: 'Pace', value: 91 },
      { label: 'Ball Control', value: 84 },
    ]);
  });

  it('returns an empty list for unusable values', () => {
    expect(normalizeAttributes(null)).toEqual([]);
    expect(normalizeAttributes('fast')).toEqual([]);
  });
});
