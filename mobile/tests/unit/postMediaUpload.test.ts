import { afterEach, describe, expect, it, vi } from 'vitest';

const { upload, remove, from, getUser, prepareVideo } = vi.hoisted(() => {
  const uploadMock = vi.fn();
  const removeMock = vi.fn();
  return {
    upload: uploadMock,
    remove: removeMock,
    from: vi.fn(() => ({ upload: uploadMock, remove: removeMock })),
    getUser: vi.fn(),
    prepareVideo: vi.fn(
      async (): Promise<{
        uri: string;
        contentType: 'video/mp4';
        ext: 'mp4';
        width?: number;
        height?: number;
      } | null> => null,
    ),
  };
});

vi.mock('@/lib/supabase', () => ({
  Buckets: { posts: 'posts' },
  supabase: {
    auth: { getUser },
    storage: { from },
  },
}));

vi.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: vi.fn(),
}));

vi.mock('@/lib/videoPrep', () => ({
  prepareVideo,
}));

// The module under test imports the mocked compressor, so it has to load after vi.mock.
// eslint-disable-next-line import/first
import { uploadPostMedia } from '@/lib/api.feed';

describe('post media upload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    upload.mockReset();
    remove.mockReset();
    from.mockClear();
    getUser.mockReset();
    prepareVideo.mockReset();
    prepareVideo.mockResolvedValue(null);
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

  it('uploads the compressed mp4 when a clip can be shrunk', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    upload.mockResolvedValue({ error: null });
    prepareVideo.mockResolvedValue({
      uri: 'file:///compressed.mp4',
      contentType: 'video/mp4',
      ext: 'mp4',
      width: 405,
      height: 720,
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 }),
    );
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '10000000-0000-4000-8000-000000000009',
    );

    await uploadPostMedia([
      {
        uri: 'file:///camera.mov',
        type: 'video',
        mimeType: 'video/quicktime',
        width: 1080,
        height: 1920,
        durationSeconds: 12,
      },
    ]);

    expect(prepareVideo).toHaveBeenCalledWith('file:///camera.mov', 1080, 1920);
    expect(fetchSpy).toHaveBeenCalledWith('file:///compressed.mp4');
    expect(upload).toHaveBeenCalledWith(
      'user-1/10000000-0000-4000-8000-000000000009.mp4',
      expect.any(ArrayBuffer),
      expect.objectContaining({ contentType: 'video/mp4' }),
    );
  });

  it('uploads the original clip when compression cannot shrink it', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    upload.mockResolvedValue({ error: null });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([1]), { status: 200 }),
    );
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '10000000-0000-4000-8000-000000000010',
    );

    await uploadPostMedia([
      {
        uri: 'file:///already-small.mov',
        type: 'video',
        mimeType: 'video/quicktime',
        durationSeconds: 4,
      },
    ]);

    expect(upload).toHaveBeenCalledWith(
      'user-1/10000000-0000-4000-8000-000000000010.mov',
      expect.any(ArrayBuffer),
      expect.objectContaining({ contentType: 'video/quicktime' }),
    );
  });
});
