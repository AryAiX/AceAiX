import { describe, expect, it } from 'vitest';

import {
  STORY_STILL_MS,
  STORY_VIDEO_CAP_MS,
  cardBackground,
  nextStory,
  parseQueue,
  previousStory,
  segmentFill,
  stickerKey,
  storyDurationMs,
  tapDirection,
} from '@/lib/stories';
import { isAbsoluteMediaUrl, pathsToSign } from '@/lib/mediaUrl';

describe('storyDurationMs', () => {
  it('gives photos and cards five seconds', () => {
    expect(storyDurationMs('photo')).toBe(STORY_STILL_MS);
    expect(storyDurationMs('card', 30)).toBe(5000);
  });

  it('plays a video for its own length, capped', () => {
    expect(storyDurationMs('video', 7.25)).toBe(7250);
    expect(storyDurationMs('video', 60)).toBe(STORY_VIDEO_CAP_MS);
  });

  it('falls back to the cap when a video has no usable length', () => {
    expect(storyDurationMs('video', null)).toBe(STORY_VIDEO_CAP_MS);
    expect(storyDurationMs('video', 0)).toBe(STORY_VIDEO_CAP_MS);
    expect(storyDurationMs('video', Number.NaN)).toBe(STORY_VIDEO_CAP_MS);
    expect(storyDurationMs('video', Infinity)).toBe(STORY_VIDEO_CAP_MS);
  });
});

describe('nextStory', () => {
  it('moves through one author before the next', () => {
    expect(nextStory({ author: 0, story: 0 }, 3, 2)).toEqual({
      type: 'story',
      cursor: { author: 0, story: 1 },
    });
  });

  it('rolls into the next author at the end of this one', () => {
    expect(nextStory({ author: 0, story: 2 }, 3, 2)).toEqual({
      type: 'author',
      cursor: { author: 1, story: 0 },
    });
  });

  it('closes after the last story of the last author', () => {
    expect(nextStory({ author: 1, story: 0 }, 1, 2)).toEqual({ type: 'close' });
  });

  it('skips an author with nothing to show', () => {
    expect(nextStory({ author: 0, story: 0 }, 0, 3)).toEqual({
      type: 'author',
      cursor: { author: 1, story: 0 },
    });
  });
});

describe('previousStory', () => {
  it('steps back within an author', () => {
    expect(previousStory({ author: 1, story: 2 })).toEqual({
      type: 'story',
      cursor: { author: 1, story: 1 },
    });
  });

  it('steps back to the previous author from a first story', () => {
    expect(previousStory({ author: 1, story: 0 })).toEqual({
      type: 'author',
      cursor: { author: 0, story: 0 },
    });
  });

  it('restarts the very first story instead of leaving', () => {
    expect(previousStory({ author: 0, story: 0 })).toEqual({
      type: 'story',
      cursor: { author: 0, story: 0 },
    });
  });
});

describe('tapDirection', () => {
  it('treats the left third as back and the rest as forward', () => {
    expect(tapDirection(50, 390)).toBe('back');
    expect(tapDirection(200, 390)).toBe('forward');
    expect(tapDirection(380, 390)).toBe('forward');
  });

  it('mirrors for right-to-left languages', () => {
    expect(tapDirection(380, 390, true)).toBe('back');
    expect(tapDirection(50, 390, true)).toBe('forward');
  });

  it('never goes back on an unmeasured screen', () => {
    expect(tapDirection(0, 0)).toBe('forward');
  });
});

describe('segmentFill', () => {
  it('fills finished segments and empties future ones', () => {
    expect(segmentFill(0, 2, 0.5)).toBe(1);
    expect(segmentFill(2, 2, 0.5)).toBe(0.5);
    expect(segmentFill(3, 2, 0.5)).toBe(0);
    expect(segmentFill(2, 2, 1.7)).toBe(1);
  });
});

describe('parseQueue', () => {
  it('keeps the rail order and removes blanks and repeats', () => {
    expect(parseQueue('a, b,,c,a', 'b')).toEqual(['a', 'b', 'c']);
  });

  it('puts the tapped author first when the queue does not include them', () => {
    expect(parseQueue(undefined, 'x')).toEqual(['x']);
    expect(parseQueue('a,b', 'x')).toEqual(['x', 'a', 'b']);
  });

  it('accepts an array param', () => {
    expect(parseQueue(['a,b', 'c'], 'c')).toEqual(['a', 'b', 'c']);
  });
});

describe('card fields', () => {
  it('maps unknown backgrounds to hero', () => {
    expect(cardBackground('party')).toBe('party');
    expect(cardBackground('score')).toBe('score');
    expect(cardBackground('neon')).toBe('hero');
    expect(cardBackground(undefined)).toBe('hero');
  });

  it('only recognises stickers it can draw', () => {
    expect(stickerKey('gameiq')).toBe('gameiq');
    expect(stickerKey('')).toBeNull();
    expect(stickerKey('trophy')).toBeNull();
  });
});

describe('isAbsoluteMediaUrl', () => {
  it('passes through http, https, data and blob URLs', () => {
    expect(isAbsoluteMediaUrl('https://cdn.example.com/a.jpg')).toBe(true);
    expect(isAbsoluteMediaUrl('http://localhost:8790/a.jpg')).toBe(true);
    expect(isAbsoluteMediaUrl('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(isAbsoluteMediaUrl('blob:http://localhost/1234')).toBe(true);
    expect(isAbsoluteMediaUrl('DATA:video/mp4;base64,AAAA')).toBe(true);
  });

  it('treats storage paths as needing a signature', () => {
    expect(isAbsoluteMediaUrl('a0000000-0000-4000-8000-000000000001/demo-story-1.jpg')).toBe(false);
    expect(isAbsoluteMediaUrl('httpish/file.jpg')).toBe(false);
    expect(isAbsoluteMediaUrl(null)).toBe(false);
    expect(isAbsoluteMediaUrl(undefined)).toBe(false);
  });

  it('collects only the paths to sign, once each', () => {
    expect(
      pathsToSign(['u/a.jpg', 'data:image/png;base64,AA', null, 'u/a.jpg', 'https://x/y.png', 'u/b.mp4']),
    ).toEqual(['u/a.jpg', 'u/b.mp4']);
  });
});
