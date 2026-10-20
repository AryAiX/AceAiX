import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/locales/en';
import {
  SF_GAME,
  SF_ITEMS,
  SF_MINDSET,
  SF_SPORTS,
  answeredCount,
  canRetake,
  firstUnanswered,
  isComplete,
  type SfAnswers,
} from '@/lib/sportfit/catalogue';

/**
 * Sport Fit: the client and the migration must agree on what is asked.
 *
 * The server scores answers by statement id and rejects a set that is
 * missing one or carries an extra; a statement added to one side only would
 * make every submission fail. So this reads the migration's seed and checks
 * the app asks exactly those statements, in that order, and can label every
 * dimension and sport the server can send back.
 */
const MIGRATION = fs.readFileSync(
  path.resolve(__dirname, '../../../supabase/migrations/20261019000001_sport_fit.sql'),
  'utf8',
);

function seededItems(): { id: string; dimension: string; sort: number }[] {
  const block = MIGRATION.slice(
    MIGRATION.indexOf('insert into public.sport_fit_items'),
    MIGRATION.indexOf('on conflict (id) do update'),
  );
  return [...block.matchAll(/\('(\w+)',\s*'(\w+)',\s*(?:true|false),\s*(\d+),/g)]
    .map((m) => ({ id: m[1], dimension: m[2], sort: Number(m[3]) }))
    .sort((a, b) => a.sort - b.sort);
}

function seededSports(): { sport: string; weights: Record<string, number> }[] {
  const block = MIGRATION.slice(
    MIGRATION.indexOf('insert into public.sport_fit_sports'),
    MIGRATION.indexOf('on conflict (sport) do update'),
  );
  return [...block.matchAll(/\('(\w+)',\s*'(\{[^']+\})'/g)].map((m) => ({
    sport: m[1],
    weights: JSON.parse(m[2]) as Record<string, number>,
  }));
}

describe('Sport Fit catalogue', () => {
  it('asks exactly the seeded statements, in the seeded order', () => {
    expect(seededItems().map((i) => i.id)).toEqual([...SF_ITEMS]);
  });

  it('measures every mindset dimension with three statements', () => {
    const counts = new Map<string, number>();
    for (const item of seededItems()) counts.set(item.dimension, (counts.get(item.dimension) ?? 0) + 1);
    for (const dimension of SF_MINDSET) expect(counts.get(dimension), dimension).toBe(3);
    expect(counts.get('check')).toBe(1);
  });

  it('ranks exactly the sports the app can name', () => {
    expect(seededSports().map((s) => s.sport).sort()).toEqual([...SF_SPORTS].sort());
    for (const sport of SF_SPORTS) expect(en.sports[sport], sport).toBeTruthy();
  });

  it('weights only dimensions the app can label', () => {
    const known = new Set<string>([...SF_MINDSET, ...SF_GAME]);
    for (const { sport, weights } of seededSports()) {
      for (const [key, weight] of Object.entries(weights)) {
        expect(known.has(key), `${sport}.${key}`).toBe(true);
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(3);
      }
    }
  });

  it('has copy for every statement, dimension, reason and sport', () => {
    for (const id of SF_ITEMS) expect(en.sportFit.item[id], id).toBeTruthy();
    for (const d of [...SF_MINDSET, ...SF_GAME]) {
      expect(en.sportFit.dimension[d], d).toBeTruthy();
      expect(en.sportFit.dimensionWhat[d], d).toBeTruthy();
      if (d !== 'team') {
        expect(en.sportFit.strength[d], d).toBeTruthy();
        expect(en.sportFit.develop[d], d).toBeTruthy();
      }
    }
    for (const sport of SF_SPORTS) expect(en.sportFit.sportWhy[sport], sport).toBeTruthy();
  });

  it('the attention check asks for the label of answer 4', () => {
    expect(MIGRATION).toMatch(/\('check1',\s*'check',\s*false,\s*\d+,\s*4\)/);
    expect(en.sportFit.item.check1).toContain(en.sportFit.answer4);
  });
});

describe('Sport Fit answers', () => {
  it('knows when every statement is answered', () => {
    const answers: SfAnswers = {};
    expect(isComplete(answers)).toBe(false);
    expect(firstUnanswered(answers)).toBe(0);
    SF_ITEMS.forEach((id, i) => {
      if (i < 5) answers[id] = 3;
    });
    expect(answeredCount(answers)).toBe(5);
    expect(firstUnanswered(answers)).toBe(5);
    SF_ITEMS.forEach((id) => {
      answers[id] = 4;
    });
    expect(isComplete(answers)).toBe(true);
    expect(firstUnanswered(answers)).toBe(SF_ITEMS.length - 1);
  });

  it('opens a retake only once the date has passed', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    expect(canRetake({ next_retake_at: null }, now)).toBe(true);
    expect(canRetake({ next_retake_at: '2026-12-18T12:00:00Z' }, now)).toBe(false);
    expect(canRetake({ next_retake_at: '2026-10-01T12:00:00Z' }, now)).toBe(true);
  });
});
