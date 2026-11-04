import { describe, expect, it } from 'vitest';

import { SPORTS, englishSportTerm, positionLabel, sportLabel } from '@/constants/sports';
import { sports as arSports } from '@/i18n/locales/ar/sports';

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

/* Resolves `sports.football` against a catalogue's sport strings. Nested
   groups such as `sports.position` are objects and are left untranslated. */
function catalogueT(sports: object): (key: string) => string {
  const table = sports as Record<string, unknown>;
  return (key: string) => {
    const leaf = key.startsWith('sports.') ? key.slice('sports.'.length) : '';
    const value = leaf ? table[leaf] : undefined;
    return typeof value === 'string' ? value : key;
  };
}

describe('englishSportTerm', () => {
  const tAr = catalogueT(arSports);

  it('turns each Arabic sport label back into the English name', () => {
    for (const sport of SPORTS) {
      expect(englishSportTerm(tAr, sportLabel(tAr, sport.key))).toBe(sport.label);
    }
  });

  it('matches a typed sport label ignoring case', () => {
    const tEn = (key: string) => (key === 'sports.tennis' ? 'Tennis' : key);
    expect(englishSportTerm(tEn, 'tennis')).toBe('Tennis');
    expect(englishSportTerm(tEn, '  TENNIS  ')).toBe('Tennis');
  });

  it('leaves a name or a fragment unchanged', () => {
    expect(englishSportTerm(tAr, 'Ahmed')).toBe('Ahmed');
    expect(englishSportTerm(tAr, 'كرة')).toBe('كرة');
  });
});
