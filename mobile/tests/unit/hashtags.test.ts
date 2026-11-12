import { describe, expect, it } from 'vitest';

import { hashtagPattern, normaliseHashtag, splitHashtags } from '@/lib/hashtags';

function tags(text: string): string[] {
  return splitHashtags(text).flatMap((piece) => (piece.kind === 'hashtag' ? [piece.tag] : []));
}

describe('splitHashtags', () => {
  it('finds #u16 after a space, at the start, and before a comma', () => {
    expect(splitHashtags('Great game #u16')).toEqual([
      { kind: 'text', text: 'Great game ' },
      { kind: 'hashtag', text: '#u16', tag: 'u16' },
    ]);
    expect(tags('#U16 squad')).toEqual(['U16']);
    expect(tags('#u16, next')).toEqual(['u16']);
  });

  it('does not treat a hash glued to a word as a hashtag', () => {
    expect(tags('x#u16')).toEqual([]);
    expect(splitHashtags('x#u16')).toEqual([{ kind: 'text', text: 'x#u16' }]);
  });

  it('keeps an underscore inside one tag', () => {
    expect(tags('#u16_team')).toEqual(['u16_team']);
  });

  it('finds an Arabic hashtag', () => {
    expect(tags('#كرة')).toEqual(['كرة']);
    expect(tags('مباراة #كرة اليوم')).toEqual(['كرة']);
  });
});

describe('normaliseHashtag', () => {
  it('returns the tag only when the whole term is that hashtag', () => {
    expect(normaliseHashtag(' #u16 ')).toBe('u16');
    expect(normaliseHashtag('#u16 squad')).toBeNull();
    expect(normaliseHashtag('u16')).toBeNull();
    expect(normaliseHashtag('x#u16')).toBeNull();
    expect(normaliseHashtag('#u16_team')).toBe('u16_team');
  });
});

describe('hashtagPattern', () => {
  it('builds the boundary regex for a tag', () => {
    expect(hashtagPattern('u16')).toBe('(^|[^[:alnum:]_])#u16([^[:alnum:]_]|$)');
    expect(hashtagPattern('كرة')).toBe('(^|[^[:alnum:]_])#كرة([^[:alnum:]_]|$)');
  });
});
