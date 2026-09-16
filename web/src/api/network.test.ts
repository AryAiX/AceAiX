import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, from, select, eq } = vi.hoisted(() => {
  const eq = vi.fn();
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { rpc: vi.fn(), from, select, eq };
});

vi.mock('../lib/supabase', () => ({
  supabase: { rpc, from },
}));

import { listFollowers, listFollowing, searchUsers } from './network';

describe('searchUsers', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockClear();
    select.mockClear();
    eq.mockReset();
  });

  it('searches through the youth-safe people RPC and maps public rows', async () => {
    rpc.mockResolvedValue({
      data: [{
        id: 'person-1',
        role: 'athlete',
        full_name: '  Alex  ',
        avatar_url: null,
        bio: null,
        city: 'Porto',
        country: 'Portugal',
        is_verified: true,
      }],
      error: null,
    });

    const rows = await searchUsers('  Alex  ', 'current-user', 8);

    expect(rpc).toHaveBeenCalledWith('search_people', {
      p_query: 'Alex',
      p_role: null,
      p_limit: 9,
    });
    expect(rows).toEqual([expect.objectContaining({
      id: 'person-1',
      role: 'athlete',
      full_name: '  Alex  ',
      is_verified: true,
      locale: null,
      subscription_tier: 'free',
    })]);
  });

  it('honors exclusion and limit while dropping malformed RPC rows', async () => {
    rpc.mockResolvedValue({
      data: [
        { id: 'excluded', role: 'coach', full_name: 'Excluded' },
        { id: 'first', role: 'coach', full_name: 'First' },
        { id: 'invalid-role', role: 'unknown', full_name: 'Invalid' },
        { id: 'second', role: 'scout', full_name: 'Second' },
      ],
      error: null,
    });

    const rows = await searchUsers('person', 'excluded', 2);

    expect(rows.map((row) => row.id)).toEqual(['first', 'second']);
  });

  it('does not search for blank queries or zero limits', async () => {
    await expect(searchUsers('   ')).resolves.toEqual([]);
    await expect(searchUsers('Alex', undefined, 0)).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('drops hidden, deleted and malformed joined follow profiles', async () => {
    eq
      .mockResolvedValueOnce({
        data: [
          { id: 'follow-1', following: { id: 'visible-user' } },
          { id: 'follow-2', following: null },
          { id: 'follow-3', following: { id: '' } },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { id: 'follow-4', follower: { id: 'visible-follower' } },
          { id: 'follow-5', follower: null },
        ],
        error: null,
      });

    await expect(listFollowing('me')).resolves.toEqual([
      expect.objectContaining({ id: 'follow-1' }),
    ]);
    await expect(listFollowers('me')).resolves.toEqual([
      expect.objectContaining({ id: 'follow-4' }),
    ]);
  });
});
