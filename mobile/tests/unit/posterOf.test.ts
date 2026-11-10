import { describe, expect, it } from 'vitest';

import { posterOf } from '@/lib/mediaUrl';

describe('the picture a grid shows for a post', () => {
  it('uses the preview picture when there is one', () => {
    expect(posterOf({ type: 'video', url: 'a/clip.mp4', thumbnail: 'a/clip.jpg' })).toBe('a/clip.jpg');
    expect(posterOf({ type: 'image', url: 'a/photo.jpg', thumbnail: 'a/small.jpg' })).toBe('a/small.jpg');
  });

  it('uses the photo itself when it has no preview', () => {
    expect(posterOf({ type: 'image', url: 'a/photo.jpg', thumbnail: null })).toBe('a/photo.jpg');
  });

  it('never hands a video file to an image', () => {
    expect(posterOf({ type: 'video', url: 'a/clip.mp4', thumbnail: null })).toBeNull();
    expect(posterOf({ type: 'video', url: 'a/clip.mp4' })).toBeNull();
  });

  it('has nothing for a post with no media', () => {
    expect(posterOf(null)).toBeNull();
    expect(posterOf(undefined)).toBeNull();
  });
});
