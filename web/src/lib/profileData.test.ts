import { describe, expect, it } from 'vitest';
import { normalizeAttributes } from './profileData';

describe('profile data normalization', () => {
  it('preserves canonical attribute arrays', () => {
    expect(normalizeAttributes([{ label: 'Pace', value: 82, endorsements: 3 }])).toEqual([
      {
        label: 'Pace',
        value: 82,
        endorsements: 3,
        topEndorser: '',
        topEndorserVerified: false,
      },
    ]);
  });

  it('converts legacy score objects into canonical attributes', () => {
    expect(normalizeAttributes({ pass_accuracy: 87, dominant_foot: 'Right', pace: 82 })).toEqual([
      {
        label: 'Pass Accuracy',
        value: 87,
        endorsements: 0,
        topEndorser: '',
        topEndorserVerified: false,
      },
      {
        label: 'Pace',
        value: 82,
        endorsements: 0,
        topEndorser: '',
        topEndorserVerified: false,
      },
    ]);
  });

  it('returns an empty list for invalid values', () => {
    expect(normalizeAttributes(null)).toEqual([]);
    expect(normalizeAttributes('pace')).toEqual([]);
  });
});
