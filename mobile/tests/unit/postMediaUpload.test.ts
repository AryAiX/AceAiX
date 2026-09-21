import { afterEach, describe, expect, it, vi } from 'vitest';

const { upload, remove, from, getUser } = vi.hoisted(() => {
  const uploadMock = vi.fn();
  const removeMock = vi.fn();
  return {
    upload: uploadMock,
    remove: removeMock,
    from: vi.fn(() => ({ upload: uploadMock, remove: removeMock })),
    getUser: vi.fn(),
  };
});

vi.mock('@/lib/supabase', () => ({
  Buckets: { posts: 'posts' },
  supabase: {
    auth: { getUser },
    storage: { from },
  },
}));

import { uploadPostMedia } from '@/lib/api.feed';

describe('post media upload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    upload.mockReset();
    remove.mockReset();
    from.mockClear();
    getUser.mockReset();
  });

  it('removes completed objects when a later upload fails', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    upload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'storage unavailable' } });
    remove.mockResolvedValue({ error: null });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    );
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('10000000-0000-4000-8000-000000000001')
      .mockReturnValueOnce('10000000-0000-4000-8000-000000000002');

    await expect(
      uploadPostMedia([
        { uri: 'blob:first', type: 'photo', mimeType: 'image/png' },
        { uri: 'blob:second', type: 'photo', mimeType: 'image/png' },
      ]),
    ).rejects.toThrow('storage unavailable');

    expect(remove).toHaveBeenCalledWith([
      'user-1/10000000-0000-4000-8000-000000000001.png',
    ]);
  });

  it('does not run cleanup when the first upload fails', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    upload.mockResolvedValue({ error: { message: 'storage unavailable' } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([1]), { status: 200 }),
    );

    await expect(
      uploadPostMedia([
        { uri: 'blob:first', type: 'photo', mimeType: 'image/jpeg' },
      ]),
    ).rejects.toThrow('storage unavailable');

    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects an overlong browser video before reading or uploading it', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      uploadPostMedia([
        {
          uri: 'blob:long-video',
          type: 'video',
          mimeType: 'video/mp4',
          durationSeconds: 181,
        },
      ]),
    ).rejects.toThrow('3 minutes or shorter');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
