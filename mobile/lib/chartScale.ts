/**
 * Horizontal divisor for evenly spacing `count` points across a chart.
 *
 * A single point has no span to divide by, so callers would produce Infinity
 * (and then NaN SVG coordinates). Clamping to 1 anchors that point at the
 * left edge instead.
 */
export function pointSpan(count: number): number {
  if (!Number.isFinite(count)) return 1;
  return Math.max(1, Math.floor(count) - 1);
}

/** Whether there are enough real points to draw a trend line. */
export function canPlotTrend(values: readonly (number | null)[]): boolean {
  return values.filter(value => value !== null).length >= 2;
}
