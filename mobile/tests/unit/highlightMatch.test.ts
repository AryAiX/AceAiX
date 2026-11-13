import { describe, expect, it } from 'vitest';

import { highlightMatch } from '@/lib/highlightMatch';

describe('highlightMatch', () => {
  it('marks nothing when the query is empty', () => {
    expect(highlightMatch('Ada Lovelace', '')).toEqual([{ text: 'Ada Lovelace', match: false }]);
  });

  it('returns nothing for an empty label', () => {
    expect(highlightMatch('', 'ada')).toEqual([]);
  });

  it('marks an exact match and leaves the rest plain', () => {
    expect(highlightMatch('Ada Lovelace', 'Ada')).toEqual([
      { text: 'Ada', match: true },
      { text: ' Lovelace', match: false },
    ]);
  });

  it('ignores case', () => {
    expect(highlightMatch('Ada Lovelace', 'ada')).toEqual([
      { text: 'Ada', match: true },
      { text: ' Lovelace', match: false },
    ]);
    expect(highlightMatch('football', 'FOOT')).toEqual([
      { text: 'foot', match: true },
      { text: 'ball', match: false },
    ]);
  });

  it('ignores accents and keeps them in the marked text', () => {
    expect(highlightMatch('José', 'jose')).toEqual([{ text: 'José', match: true }]);
    expect(highlightMatch('Jose', 'José')).toEqual([{ text: 'Jose', match: true }]);
    expect(highlightMatch('Renée', 'enee')).toEqual([
      { text: 'R', match: false },
      { text: 'enée', match: true },
    ]);
    expect(highlightMatch('Cafe\u0301', 'cafe')).toEqual([{ text: 'Cafe\u0301', match: true }]);
  });

  it('marks a match in the middle and every later match', () => {
    expect(highlightMatch('Alpha Qmention', 'qmention')).toEqual([
      { text: 'Alpha ', match: false },
      { text: 'Qmention', match: true },
    ]);
    expect(highlightMatch('haha', 'ha')).toEqual([
      { text: 'ha', match: true },
      { text: 'ha', match: true },
    ]);
  });

  it('leaves the label plain when nothing matches', () => {
    expect(highlightMatch('Ada', 'xyz')).toEqual([{ text: 'Ada', match: false }]);
    expect(highlightMatch('#football', 'ball')).toEqual([
      { text: '#foot', match: false },
      { text: 'ball', match: true },
    ]);
  });

  it('keeps an emoji outside the match', () => {
    expect(highlightMatch('Ada 😀', 'ada')).toEqual([
      { text: 'Ada', match: true },
      { text: ' 😀', match: false },
    ]);
  });
});
