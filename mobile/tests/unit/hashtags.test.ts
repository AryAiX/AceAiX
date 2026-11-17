import { describe, expect, it } from 'vitest';

import {
  activeHashtagQuery,
  applyHashtag,
  hashtagPattern,
  normaliseHashtag,
  splitHashtags,
} from '@/lib/hashtags';

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

describe('activeHashtagQuery', () => {
  it('reads #ba at the end of the text', () => {
    expect(activeHashtagQuery('#ba', 3)).toEqual({ start: 0, tag: 'ba' });
    expect(activeHashtagQuery('Day #ba', 7)).toEqual({ start: 4, tag: 'ba' });
  });

  it('does not treat a hash inside a word as a query', () => {
    expect(activeHashtagQuery('x#ba', 4)).toBeNull();
  });

  it('reads an Arabic tag', () => {
    expect(activeHashtagQuery('#كرة', '#كرة'.length)).toEqual({ start: 0, tag: 'كرة' });
    expect(activeHashtagQuery('مباراة #كرة', 'مباراة #كرة'.length)).toEqual({
      start: 'مباراة '.length,
      tag: 'كرة',
    });
  });

  it('reads the query when the caret is in the middle of the text', () => {
    const text = 'see #ba tonight';
    expect(activeHashtagQuery(text, 7)).toEqual({ start: 4, tag: 'ba' });
    expect(activeHashtagQuery(text, 0)).toBeNull();
    expect(activeHashtagQuery(text, text.length)).toBeNull();
  });
});

describe('applyHashtag', () => {
  it('replaces the query with the tag and a space, and parks the caret after it', () => {
    const text = 'Day #ba';
    const active = activeHashtagQuery(text, text.length);
    expect(active).not.toBeNull();
    const next = applyHashtag(text, active!.start, text.length, 'baby');
    expect(next).toEqual({ text: 'Day #baby ', cursor: 'Day #baby '.length });
    expect(next.text[next.cursor - 1]).toBe(' ');
  });

  it('keeps the text after the caret, with the space still after the tag', () => {
    expect(applyHashtag('see #ba tonight', 4, 7, 'baby')).toEqual({
      text: 'see #baby  tonight',
      cursor: 10,
    });
  });
});
