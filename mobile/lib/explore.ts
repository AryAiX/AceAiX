/**
 * The Explore mosaic.
 *
 * Three columns. Every other row is a "feature" row: one large tile two
 * columns wide and two rows tall, with two small tiles stacked beside it. The
 * large tile swaps sides each time, so the eye zig-zags down the page instead
 * of reading a spreadsheet.
 *
 *   ┌───────┬───┐      ┌───┬───┬───┐      ┌───┬───────┐
 *   │       │ 2 │      │ 4 │ 5 │ 6 │      │ 7 │       │
 *   │   1   ├───┤  →   └───┴───┴───┘  →   ├───┤   9   │  → …
 *   │       │ 3 │                         │ 8 │       │
 *   └───────┴───┘                         └───┴───────┘
 *
 * Pure, so the pattern is tested rather than eyeballed.
 */
export type MosaicRow<T> =
  | { kind: 'feature'; key: string; side: 'left' | 'right'; big: T; small: [T, T] }
  | { kind: 'row'; key: string; items: T[] };

export const MOSAIC_COLUMNS = 3;

export function mosaicRows<T extends { id: string }>(items: readonly T[]): MosaicRow<T>[] {
  const rows: MosaicRow<T>[] = [];
  let i = 0;
  let feature = true;
  let side: 'left' | 'right' = 'left';

  while (i < items.length) {
    const left = items.length - i;
    if (feature && left >= 3) {
      const [a, b, c] = [items[i], items[i + 1], items[i + 2]];
      /* On the right-hand feature the large tile is the last of the three, so
         reading order still runs left to right. */
      rows.push(
        side === 'left'
          ? { kind: 'feature', key: a.id, side, big: a, small: [b, c] }
          : { kind: 'feature', key: a.id, side, big: c, small: [a, b] },
      );
      side = side === 'left' ? 'right' : 'left';
      i += 3;
    } else {
      const chunk = items.slice(i, i + MOSAIC_COLUMNS);
      rows.push({ kind: 'row', key: chunk[0].id, items: chunk });
      i += chunk.length;
    }
    feature = !feature;
  }
  return rows;
}

/** Tile sizes for a grid `width` wide. Small tiles are 4:5 — a clip is taller than it is wide. */
export function mosaicMetrics(width: number, gap: number) {
  const cell = Math.max(0, Math.floor((width - gap * (MOSAIC_COLUMNS - 1)) / MOSAIC_COLUMNS));
  const cellHeight = Math.round(cell * 1.25);
  return {
    cell,
    cellHeight,
    bigWidth: Math.max(0, width - cell - gap),
    bigHeight: cellHeight * 2 + gap,
  };
}

/** Append a page without repeating a clip an offset shift served twice. */
export function mergeClips<T extends { id: string }>(current: readonly T[], next: readonly T[]): T[] {
  const seen = new Set(current.map((c) => c.id));
  return [...current, ...next.filter((c) => !seen.has(c.id))];
}
