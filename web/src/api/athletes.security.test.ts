import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, createSignedUrls } = vi.hoisted(() => ({
  rpc: vi.fn(),
  createSignedUrls: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc,
    storage: {
      from: () => ({ createSignedUrls }),
    },
  },
}));

import { listAthletes } from './athletes';
import { listPublicHighlights } from './portfolio';

describe('redacted athlete reads', () => {
  beforeEach(() => {
    rpc.mockReset();
    createSignedUrls.mockReset();
  });

  it('loads athlete discovery through the redacting RPC', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: 'minor-athlete',
          user_id: 'minor-user',
          sport: 'Football',
          level: 'academy',
          is_open_to_offers: true,
          visibility_score: 90,
          birth_date: null,
          user: { id: 'minor-user', full_name: 'Visible Minor' },
        },
      ],
      error: null,
    });

    const rows = await listAthletes({ sport: 'Football', minScore: 80 });

    expect(rpc).toHaveBeenCalledWith('web_athletes', {
      p_id: null,
      p_user_id: null,
      p_limit: 200,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].birth_date).toBeNull();
  });

  it('loads public highlights through the redacting RPC', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    await listPublicHighlights(8);

    expect(rpc).toHaveBeenCalledWith('web_public_highlights', { p_limit: 8 });
  });

  it('signs private storage paths returned for public highlights', async () => {
    rpc.mockResolvedValue({
      data: [{
        id: 'clip',
        athlete_id: 'athlete',
        title: 'Clip',
        storage_url: 'user/clip.mp4',
        thumbnail_url: 'user/clip.jpg',
      }],
      error: null,
    });
    createSignedUrls.mockResolvedValue({
      data: [
        { path: 'user/clip.mp4', signedUrl: 'https://signed/clip.mp4' },
        { path: 'user/clip.jpg', signedUrl: 'https://signed/clip.jpg' },
      ],
      error: null,
    });

    const rows = await listPublicHighlights(8);

    expect(createSignedUrls).toHaveBeenCalledWith(
      ['user/clip.mp4', 'user/clip.jpg'],
      3600,
    );
    expect(rows[0].storage_url).toBe('https://signed/clip.mp4');
    expect(rows[0].thumbnail_url).toBe('https://signed/clip.jpg');
  });

  it('keeps externally hosted highlights when batch signing throws', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: 'external-clip',
          athlete_id: 'athlete',
          title: 'External clip',
          storage_url: 'https://cdn.example/clip.mp4',
          thumbnail_url: null,
        },
        {
          id: 'private-clip',
          athlete_id: 'athlete',
          title: 'Private clip',
          storage_url: 'user/private.mp4',
          thumbnail_url: null,
        },
      ],
      error: null,
    });
    createSignedUrls.mockRejectedValue(new TypeError('data.map is not a function'));

    const rows = await listPublicHighlights(8);

    expect(rows.map((row) => row.id)).toEqual(['external-clip']);
  });
});
