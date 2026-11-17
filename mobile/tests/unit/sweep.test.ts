import { describe, expect, it } from 'vitest';

import { LogoColors, sweepAt } from '@/theme/tokens';

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe('the score ring colours', () => {
  it('still lands exactly on the logo colours at each stop', () => {
    expect(sweepAt(0)).toBe(LogoColors.sky);
    expect(sweepAt(0.45)).toBe(LogoColors.cobalt);
    expect(sweepAt(0.62)).toBe(LogoColors.amber);
    expect(sweepAt(0.82)).toBe(LogoColors.flame);
    expect(sweepAt(1)).toBe(LogoColors.ember);
  });

  it('never turns grey or muddy on the way from blue to fire', () => {
    for (let i = 0; i <= 100; i++) {
      const [r, g, b] = channels(sweepAt(i / 100));
      expect(Math.max(r, g, b) - Math.min(r, g, b), `at ${i}`).toBeGreaterThan(100);
    }
  });

  it('copes with anything it is handed', () => {
    expect(sweepAt(-1)).toBe(LogoColors.sky);
    expect(sweepAt(2)).toBe(LogoColors.ember);
    expect(sweepAt(Number.NaN)).toBe(LogoColors.sky);
  });
});
