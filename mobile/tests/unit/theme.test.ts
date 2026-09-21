import { describe, expect, it } from 'vitest';

import { Palettes, TierColors, TierLabels, alpha, tierForScore } from '@/theme/tokens';

describe('tierForScore', () => {
  it('bands exactly where the database bands', () => {
    // private.tier_for_score in 20260904000001_talent_score.sql uses the same
    // cut-offs. If one moves, this test is the tripwire.
    expect(tierForScore(0)).toBe('rising');
    expect(tierForScore(39)).toBe('rising');
    expect(tierForScore(40)).toBe('bronze');
    expect(tierForScore(54)).toBe('bronze');
    expect(tierForScore(55)).toBe('silver');
    expect(tierForScore(69)).toBe('silver');
    expect(tierForScore(70)).toBe('gold');
    expect(tierForScore(84)).toBe('gold');
    expect(tierForScore(85)).toBe('elite');
    expect(tierForScore(100)).toBe('elite');
  });

  it('has a colour and a label for every tier', () => {
    for (const tier of ['rising', 'bronze', 'silver', 'gold', 'elite'] as const) {
      expect(TierColors[tier]).toMatch(/^#[0-9A-F]{6}$/i);
      expect(TierLabels[tier].length).toBeGreaterThan(0);
    }
  });
});

describe('palettes', () => {
  const keys = Object.keys(Palettes.light) as (keyof typeof Palettes.light)[];

  it('defines every token in both schemes', () => {
    // A token present in one palette and missing in the other renders as
    // `undefined` — which React Native silently ignores, producing an
    // invisible element in exactly one theme.
    expect(Object.keys(Palettes.dark).sort()).toEqual(keys.sort());
    for (const key of keys) {
      expect(Palettes.light[key], `light.${key}`).toBeDefined();
      expect(Palettes.dark[key], `dark.${key}`).toBeDefined();
    }
  });

  it('never leaves a colour token empty', () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (const key of keys) {
        const value = Palettes[scheme][key];
        if (key === 'scheme' || key === 'statusBar') continue;
        expect(String(value).length, `${scheme}.${key}`).toBeGreaterThan(2);
      }
    }
  });

  it('flips the status bar with the scheme', () => {
    expect(Palettes.light.statusBar).toBe('dark');
    expect(Palettes.dark.statusBar).toBe('light');
  });
});

describe('alpha', () => {
  it('expands both hex forms', () => {
    expect(alpha('#FF5A1F', 0.5)).toBe('rgba(255, 90, 31, 0.5)');
    expect(alpha('#FFF', 1)).toBe('rgba(255, 255, 255, 1)');
  });

  it('passes an rgba string through untouched', () => {
    expect(alpha('rgba(1, 2, 3, 0.4)', 0.9)).toBe('rgba(1, 2, 3, 0.4)');
  });
});
