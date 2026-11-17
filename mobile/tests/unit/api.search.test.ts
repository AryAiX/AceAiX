import { beforeEach, describe, expect, it, vi } from 'vitest';

const { filter, from } = vi.hoisted(() => {
  const range = vi.fn(async () => ({ data: [], error: null }));
  const order = vi.fn(() => ({ range }));
  const filter = vi.fn((_column: string, _operator: string, _value: string) => ({ order }));
  const ilike = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ filter, ilike }));
  const from = vi.fn(() => ({ select }));
  return { filter, from };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from },
}));

import { searchPosts } from '@/lib/api.search';
import { hashtagPattern } from '@/lib/hashtags';

describe('searchPosts', () => {
  beforeEach(() => {
    filter.mockClear();
  });

  it('sends the hashtag pattern to imatch with no quotes', async () => {
    const pattern = hashtagPattern('u16');

    await searchPosts('#u16');

    expect(filter).toHaveBeenCalledWith('caption', 'imatch', pattern);
    expect(filter.mock.calls[0][2]).toBe(pattern);
    expect(filter.mock.calls[0][2]).not.toMatch(/['"]/);
  });
});
