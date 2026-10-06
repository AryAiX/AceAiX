import { describe, expect, it } from 'vitest';

import { imageCacheKey, videoCacheFileName } from '@/lib/mediaCache';
import { fitWithin, isAnimatedType } from '@/lib/imagePrep';

const SIGNED =
  'https://qrunflotvjygllgvdcvy.supabase.co/storage/v1/object/sign/posts/888c8fd9/munw1g7k.jpg?token=abc.def.ghi';

describe('imageCacheKey', () => {
  it('keys a signed post URL on its storage path, not its token', () => {
    const again = SIGNED.replace('token=abc.def.ghi', 'token=zzz.yyy.xxx');
    expect(imageCacheKey(SIGNED)).toBe('posts/888c8fd9/munw1g7k.jpg');
    expect(imageCacheKey(again)).toBe(imageCacheKey(SIGNED));
  });

  it('keys a public avatar URL on its storage path', () => {
    expect(
      imageCacheKey(
        'https://x.supabase.co/storage/v1/object/public/avatars/u1/avatar-1790750830891.jpg',
      ),
    ).toBe('avatars/u1/avatar-1790750830891.jpg');
  });

  it('decodes percent-encoded paths so two encodings share one entry', () => {
    expect(
      imageCacheKey('https://x.supabase.co/storage/v1/object/public/avatars/u1/my%20photo.jpg'),
    ).toBe('avatars/u1/my photo.jpg');
  });

  it('drops the query string from any other http image', () => {
    expect(imageCacheKey('https://cdn.example.com/logo.png?v=3')).toBe('cdn.example.com/logo.png');
  });

  it('returns undefined for nothing and the raw string for non-URLs', () => {
    expect(imageCacheKey(null)).toBeUndefined();
    expect(imageCacheKey('')).toBeUndefined();
    expect(imageCacheKey('not a url')).toBe('not a url');
  });
});

describe('videoCacheFileName', () => {
  it('stays stable when only the signed token would have changed', () => {
    const key = 'posts/888c8fd9/clip.mov';
    expect(videoCacheFileName(key)).toBe(videoCacheFileName(key));
    expect(videoCacheFileName(key)).not.toBe(videoCacheFileName('posts/888c8fd9/other.mov'));
  });

  it('keeps the file name free of path separators', () => {
    expect(videoCacheFileName('posts/user/my clip.mov')).not.toMatch(/[\\/]/);
  });
});

describe('fitWithin', () => {
  it('scales the longer edge down to the cap and keeps the aspect ratio', () => {
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('leaves images that already fit alone', () => {
    expect(fitWithin(1200, 800, 1600)).toBeNull();
    expect(fitWithin(1600, 1600, 1600)).toBeNull();
  });

  it('gives up when dimensions are unknown', () => {
    expect(fitWithin(undefined, undefined, 1600)).toBeNull();
    expect(fitWithin(0, 100, 1600)).toBeNull();
  });
});

describe('isAnimatedType', () => {
  it('spots GIFs by type or extension and nothing else', () => {
    expect(isAnimatedType('image/gif')).toBe(true);
    expect(isAnimatedType(null, 'file:///tmp/clip.GIF')).toBe(true);
    expect(isAnimatedType('image/jpeg', 'file:///tmp/photo.jpg')).toBe(false);
  });
});
