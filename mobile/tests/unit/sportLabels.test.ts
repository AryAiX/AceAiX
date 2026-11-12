import { describe, expect, it } from 'vitest';

import {
  SPORTS,
  englishSportTerm,
  positionLabel,
  sportLabel,
  sportMatchesQuery,
} from '@/constants/sports';
import { sports as arSports } from '@/i18n/locales/ar/sports';
import { sports as deSports } from '@/i18n/locales/de/sports';
import { sports as enSports } from '@/i18n/locales/en/sports';
import { sports as esSports } from '@/i18n/locales/es/sports';
import { sports as frSports } from '@/i18n/locales/fr/sports';
import { sports as ruSports } from '@/i18n/locales/ru/sports';
import { sports as zhSports } from '@/i18n/locales/zh/sports';

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

const CATALOGUES = {
  en: enSports,
  ar: arSports,
  de: deSports,
  es: esSports,
  fr: frSports,
  ru: ruSports,
  zh: zhSports,
};

/** `t:sports.position.goalkeeper` read out of one language's sports catalogue. */
function catalogueValue(catalogue: (typeof CATALOGUES)['en'], translatedKey: string): unknown {
  const parts = translatedKey.replace(/^t:/, '').split('.');
  const rest = parts[0] === 'sports' ? parts.slice(1) : parts;
  let node: unknown = catalogue;
  for (const part of rest) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

describe('sport and position label keys', () => {
  it('lists 30 sports, with the 18 new ones after the original 12', () => {
    expect(SPORTS.map((sport) => sport.key)).toEqual([
      'Football',
      'Basketball',
      'Tennis',
      'Athletics',
      'Swimming',
      'Cricket',
      'Volleyball',
      'Handball',
      'Padel',
      'Chess',
      'Esports',
      'Martial Arts',
      'Futsal',
      'Rugby',
      'Field Hockey',
      'Badminton',
      'Table Tennis',
      'Squash',
      'Golf',
      'Cycling',
      'Gymnastics',
      'Boxing',
      'Wrestling',
      'Judo',
      'Taekwondo',
      'Jiu-Jitsu',
      'Weightlifting',
      'Equestrian',
      'Fencing',
      'Triathlon',
    ]);
  });

  it('gives every sport and every position a label key in all 7 languages', () => {
    expect(Object.keys(CATALOGUES)).toHaveLength(7);
    for (const sport of SPORTS) {
      const sportKey = sportLabel(t, sport.key);
      expect(sportKey, sport.key).toMatch(/^t:sports\.[^.]+$/);
      for (const [lang, catalogue] of Object.entries(CATALOGUES)) {
        const value = catalogueValue(catalogue, sportKey);
        expect(typeof value, `${lang} ${sport.key}`).toBe('string');
        expect((value as string).trim().length, `${lang} ${sport.key}`).toBeGreaterThan(0);
      }
      for (const position of sport.positions) {
        const positionKey = positionLabel(t, position, sport.key);
        expect(positionKey, `${sport.key} / ${position}`).toMatch(/^t:sports\.position\./);
        for (const [lang, catalogue] of Object.entries(CATALOGUES)) {
          const value = catalogueValue(catalogue, positionKey);
          expect(typeof value, `${lang} ${sport.key} / ${position}`).toBe('string');
          expect((value as string).trim().length, `${lang} ${sport.key} / ${position}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('still translates positions saved when Judo, Taekwondo, Boxing and Wrestling were martial-arts positions', () => {
    for (const position of ['Judo', 'Taekwondo', 'Boxing', 'Wrestling']) {
      const key = positionLabel(t, position);
      expect(key, position).toMatch(/^t:sports\.position\./);
      for (const [lang, catalogue] of Object.entries(CATALOGUES)) {
        expect(typeof catalogueValue(catalogue, key), `${lang} ${position}`).toBe('string');
      }
    }
  });
});

describe('sportMatchesQuery', () => {
  it('matches the translated label and the English key, ignoring case and accents', () => {
    expect(sportMatchesQuery('', 'Rugby', 'الرغبي')).toBe(true);
    expect(sportMatchesQuery('   ', 'Rugby', 'الرغبي')).toBe(true);
    expect(sportMatchesQuery('rug', 'Rugby', 'الرغبي')).toBe(true);
    expect(sportMatchesQuery('RUG', 'Rugby', 'الرغبي')).toBe(true);
    expect(sportMatchesQuery('رغب', 'Rugby', 'الرغبي')).toBe(true);
    expect(sportMatchesQuery('padel', 'Padel', 'Pádel')).toBe(true);
    expect(sportMatchesQuery('PÁDEL', 'Padel', 'Pádel')).toBe(true);
    expect(sportMatchesQuery('underwater', 'Rugby', 'Rugby')).toBe(false);
  });
});
