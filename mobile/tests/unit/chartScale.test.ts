import { describe, expect, it } from 'vitest';
import { canPlotTrend, pointSpan } from '@/lib/chartScale';

describe('pointSpan', () => {
  it('spaces multiple points across the available width', () => {
    expect(pointSpan(2)).toBe(1);
    expect(pointSpan(5)).toBe(4);
  });

  it('never returns zero, so a single point cannot produce NaN coordinates', () => {
    expect(pointSpan(1)).toBe(1);
    expect(pointSpan(0)).toBe(1);
    expect(pointSpan(-3)).toBe(1);
  });

  it('falls back to a safe span for non-finite counts', () => {
    expect(pointSpan(Number.NaN)).toBe(1);
    expect(pointSpan(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('canPlotTrend', () => {
  it('requires at least two recorded points', () => {
    expect(canPlotTrend([])).toBe(false);
    expect(canPlotTrend([null, null])).toBe(false);
    expect(canPlotTrend([6.4, null])).toBe(false);
    expect(canPlotTrend([6.4, 7.1])).toBe(true);
  });

  it('ignores gaps between recorded points', () => {
    expect(canPlotTrend([6.4, null, null, 7.8])).toBe(true);
  });
});
