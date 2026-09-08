import { describe, expect, it } from 'vitest';
import {
  buildPostPage,
  mergePostPages,
  postCursorFilter,
  type PostCursor,
  type PostPage,
} from './content';

describe('feed pagination', () => {
  const rows = Array.from({ length: 25 }, (_, index) => ({
    id: String(100 - index).padStart(3, '0'),
    created_at: new Date(Date.UTC(2026, 0, 25 - index)).toISOString(),
  }));

  function rowsAfter(cursor: PostCursor, source = rows) {
    return source.filter((row) => (
      row.created_at < cursor.createdAt
      || (row.created_at === cursor.createdAt && row.id < cursor.id)
    ));
  }

  it('uses the final returned row as a stable next-page cursor', () => {
    const page = buildPostPage(rows.slice(0, 21), 20);

    expect(page.items).toEqual(rows.slice(0, 20));
    expect(page.nextCursor).toEqual({
      createdAt: rows[19].created_at,
      id: rows[19].id,
    });
  });

  it('stops when the limit-plus-one query has no extra row', () => {
    expect(buildPostPage(rows.slice(0, 20), 20).nextCursor).toBeUndefined();
  });

  it('keeps the second-page boundary stable across newer inserts and earlier deletions', () => {
    const first = buildPostPage(rows.slice(0, 21), 20);
    const inserted = {
      id: '999',
      created_at: new Date(Date.UTC(2026, 1, 1)).toISOString(),
    };
    const changed = [inserted, ...rows].filter((row) => row.id !== rows[4].id);

    expect(rowsAfter(first.nextCursor!, changed).slice(0, 5)).toEqual(rows.slice(20, 25));
  });

  it('encodes the deterministic created_at and id boundary', () => {
    expect(postCursorFilter({ createdAt: '2026-01-01T00:00:00.000Z', id: 'abc' }))
      .toBe('created_at.lt.2026-01-01T00:00:00.000Z,and(created_at.eq.2026-01-01T00:00:00.000Z,id.lt.abc)');
  });

  it('deduplicates defensively without replacing first-page reaction state', () => {
    const first = {
      items: [{ id: 'same', liked: true }, { id: 'first-only', liked: false }],
    } as PostPage;
    const second = {
      items: [{ id: 'same', liked: false }, { id: 'second-only', liked: false }],
    } as PostPage;

    expect(mergePostPages([first, second]).map((post) => [post.id, post.liked])).toEqual([
      ['same', true],
      ['first-only', false],
      ['second-only', false],
    ]);
  });
});
