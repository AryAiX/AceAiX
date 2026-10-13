import { describe, expect, it } from 'vitest';

import { mergeClips, mosaicMetrics, mosaicRows } from '@/lib/explore';

const clips = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}` }));
const ids = (rows: ReturnType<typeof mosaicRows<{ id: string }>>) =>
  rows.flatMap((r) => (r.kind === 'row' ? r.items : r.side === 'left' ? [r.big, ...r.small] : [...r.small, r.big])).map((c) => c.id);

describe('explore mosaic', () => {
  it('is empty for no clips', () => {
    expect(mosaicRows([])).toEqual([]);
  });

  it('alternates a feature row with a plain row, swapping the large tile side', () => {
    const rows = mosaicRows(clips(12));
    expect(rows.map((r) => r.kind)).toEqual(['feature', 'row', 'feature', 'row']);
    const features = rows.filter((r) => r.kind === 'feature');
    expect(features.map((r) => r.side)).toEqual(['left', 'right']);
  });

  it('places every clip exactly once, in order', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 11, 18, 25]) {
      expect(ids(mosaicRows(clips(n)))).toEqual(clips(n).map((c) => c.id));
    }
  });

  it('never builds a feature row it cannot fill', () => {
    const rows = mosaicRows(clips(8));
    // 3 (feature) + 3 (row) + 2 left over: not enough for a feature.
    expect(rows.map((r) => r.kind)).toEqual(['feature', 'row', 'row']);
    expect(rows[2].kind === 'row' && rows[2].items.length).toBe(2);
  });

  it('gives rows stable, unique keys', () => {
    const keys = mosaicRows(clips(25)).map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('sizes tiles to fill the width exactly', () => {
    const m = mosaicMetrics(390, 3);
    expect(m.cell * 3 + 3 * 2).toBeLessThanOrEqual(390);
    expect(m.bigWidth + 3 + m.cell).toBe(390);
    expect(m.bigHeight).toBe(m.cellHeight * 2 + 3);
    expect(mosaicMetrics(0, 3).cell).toBe(0);
  });

  it('merges pages without repeating a clip', () => {
    const merged = mergeClips(clips(3), [{ id: 'c3' }, { id: 'c4' }]);
    expect(merged.map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
  });
});
