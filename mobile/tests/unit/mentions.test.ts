import { describe, expect, it } from 'vitest';

import {
  MENTION_LIMIT,
  MENTION_QUERY_MAX,
  activeMentionQuery,
  adjustMentions,
  applyMention,
  caretAfterEdit,
  mentionsForSubmit,
  mentionsToCodePoints,
  parseMentions,
  splitMentions,
  type MentionSpan,
} from '@/lib/mentions';

const WAVE = '👋';
const GRIN = '😀';

describe('activeMentionQuery', () => {
  it('reads the query from an @ at the start or after whitespace', () => {
    expect(activeMentionQuery('@Ada', 4)).toEqual({ start: 0, query: 'Ada' });
    expect(activeMentionQuery('hi @Ada', 7)).toEqual({ start: 3, query: 'Ada' });
    expect(activeMentionQuery('\n@Ada', 5)).toEqual({ start: 1, query: 'Ada' });
    expect(activeMentionQuery('hi @', 4)).toEqual({ start: 3, query: '' });
  });

  it('keeps spaces, because a name has them, and stops at a newline or a second @', () => {
    expect(activeMentionQuery('@Mary Ann', 9)).toEqual({ start: 0, query: 'Mary Ann' });
    expect(activeMentionQuery('say @Mary Ann please', 9)).toEqual({ start: 4, query: 'Mary' });
    expect(activeMentionQuery('@Mary\nAnn', 9)).toBeNull();
    expect(activeMentionQuery('@Ann @Bea', 9)).toEqual({ start: 5, query: 'Bea' });
    expect(activeMentionQuery('@Ann@Bea', 8)).toBeNull();
    expect(activeMentionQuery('email@ada.com', 13)).toBeNull();
  });

  it('gives up once the query is longer than 40 characters', () => {
    const forty = 'a'.repeat(MENTION_QUERY_MAX);
    expect(activeMentionQuery(`@${forty}`, forty.length + 1)).toEqual({ start: 0, query: forty });
    expect(activeMentionQuery(`@${forty}b`, forty.length + 2)).toBeNull();

    const faces = GRIN.repeat(MENTION_QUERY_MAX);
    expect(activeMentionQuery(`@${faces}`, (`@${faces}`).length)?.query).toBe(faces);
    expect(activeMentionQuery(`@${faces}${GRIN}`, (`@${faces}${GRIN}`).length)).toBeNull();
  });

  it('finds a query that follows an emoji', () => {
    const text = `${WAVE} @Mi`;
    expect(activeMentionQuery(text, text.length)).toEqual({
      start: WAVE.length + 1,
      query: 'Mi',
    });
    expect(activeMentionQuery(`${WAVE}@Mi`, (`${WAVE}@Mi`).length)).toBeNull();
  });
});

describe('applyMention', () => {
  it('replaces the query with @Full Name and a trailing space, in UTF-16 indices', () => {
    const result = applyMention('hi @ma', 6, [], { user_id: '1', full_name: 'Mary Ann' });
    expect(result).toEqual({
      text: 'hi @Mary Ann ',
      cursor: 'hi @Mary Ann '.length,
      mentions: [{ user_id: '1', start: 3, length: '@Mary Ann'.length }],
    });
  });

  it('shifts a later mention and drops one the replacement overwrites', () => {
    const text = '@Al and @Bo';
    const mentions: MentionSpan[] = [
      { user_id: 'old', start: 0, length: 3 },
      { user_id: 'bo', start: 8, length: 3 },
    ];
    const result = applyMention(text, 3, mentions, { user_id: 'new', full_name: 'Alicia' });
    expect(result?.text).toBe('@Alicia  and @Bo');
    expect(result?.mentions).toEqual([
      { user_id: 'new', start: 0, length: '@Alicia'.length },
      { user_id: 'bo', start: text.length - 3 + ('@Alicia '.length - 3), length: 3 },
    ]);
  });

  it('records a mention that comes after an emoji in UTF-16, not code points', () => {
    const before = `${WAVE} @Ad`;
    const result = applyMention(before, before.length, [], { user_id: '1', full_name: 'Ada' });
    expect(result?.text).toBe(`${WAVE} @Ada `);
    expect(result?.mentions).toEqual([
      { user_id: '1', start: WAVE.length + 1, length: '@Ada'.length },
    ]);
    expect(result?.mentions[0].start).toBe(3);
    expect(Array.from(`${WAVE} `).length).toBe(2);
  });

  it('refuses an eleventh mention and an empty name', () => {
    const mentions = Array.from({ length: MENTION_LIMIT }, (_, index) => ({
      user_id: `u${index}`,
      start: index * 3,
      length: 2,
    }));
    const text = `${'@A '.repeat(MENTION_LIMIT)}@Bo`;
    expect(applyMention(text, text.length, mentions, { user_id: 'extra', full_name: 'Bo' })).toBeNull();
    expect(applyMention('@', 1, [], { user_id: '1', full_name: '  \n  ' })).toBeNull();
  });
});

describe('adjustMentions', () => {
  const ada: MentionSpan = { user_id: 'ada', start: 0, length: 4 };

  it('shifts mentions after the edit and leaves earlier ones where they are', () => {
    expect(adjustMentions('@Ada ', '@Ada !', [ada])).toEqual([ada]);
    expect(adjustMentions('hi @Ada', 'hi! @Ada', [{ user_id: 'ada', start: 3, length: 4 }])).toEqual([
      { user_id: 'ada', start: 4, length: 4 },
    ]);
    expect(caretAfterEdit('ac', 'abc')).toBe(2);
  });

  it('drops a mention the edit touches, including a deletion of its last letter', () => {
    expect(adjustMentions('@Ada', '@Ad', [ada])).toEqual([]);
    expect(adjustMentions('@Ada', '@Axa', [ada])).toEqual([]);
  });

  it('shifts by two UTF-16 units when an emoji is inserted before the name', () => {
    const next = adjustMentions('@Ada', `${WAVE} @Ada`, [ada]);
    expect(next).toEqual([{ user_id: 'ada', start: WAVE.length + 1, length: 4 }]);
    expect(next[0].start).toBe(3);
  });
});

describe('mentionsToCodePoints', () => {
  it('counts an emoji before the mention as one code point', () => {
    const text = `${WAVE} @Ada`;
    const mentions: MentionSpan[] = [{ user_id: '1', start: WAVE.length + 1, length: 4 }];
    expect(mentionsToCodePoints(text, mentions)).toEqual([
      { user_id: '1', start: 2, length: 4 },
    ]);
  });

  it('counts an emoji inside the name as one code point', () => {
    const token = `@Ada ${GRIN}`;
    const text = token;
    expect(token.length).toBe(Array.from(token).length + 1);
    expect(mentionsToCodePoints(text, [{ user_id: '1', start: 0, length: token.length }])).toEqual([
      { user_id: '1', start: 0, length: Array.from(token).length },
    ]);
  });

  it('drops a span that no longer starts with @ or that runs past the text', () => {
    expect(mentionsToCodePoints('Ada', [{ user_id: '1', start: 0, length: 3 }])).toEqual([]);
    expect(mentionsToCodePoints('@Ada', [{ user_id: '1', start: 0, length: 8 }])).toEqual([]);
    expect(mentionsToCodePoints('@Ada', [{ user_id: '1', start: -1, length: 2 }])).toEqual([]);
  });
});

describe('mentionsForSubmit', () => {
  it('trims leading space and still counts a leading emoji as one code point', () => {
    const text = `  ${WAVE} @Ada  `;
    const start = 2 + WAVE.length + 1;
    const saved = mentionsForSubmit(text, [{ user_id: '1', start, length: 4 }]);
    expect(saved.text).toBe(`${WAVE} @Ada`);
    expect(saved.mentions).toEqual([{ user_id: '1', start: 2, length: 4 }]);
  });
});

describe('splitMentions', () => {
  function joined(text: string, mentions: readonly MentionSpan[] | null | undefined): string {
    return splitMentions(text, mentions).map((piece) => piece.text).join('');
  }

  it('marks a span that starts with @ and leaves the rest as plain text', () => {
    expect(splitMentions('hi @Ada and @Bea', [
      { user_id: 'bea', start: 12, length: 4 },
      { user_id: 'ada', start: 3, length: 4 },
    ])).toEqual([
      { kind: 'text', text: 'hi ' },
      { kind: 'mention', text: '@Ada', user_id: 'ada' },
      { kind: 'text', text: ' and ' },
      { kind: 'mention', text: '@Bea', user_id: 'bea' },
    ]);
  });

  it('counts an emoji as one code point, not two UTF-16 units', () => {
    const text = `${WAVE} @Ada`;
    expect(splitMentions(text, [{ user_id: '1', start: 2, length: 4 }])).toEqual([
      { kind: 'text', text: `${WAVE} ` },
      { kind: 'mention', text: '@Ada', user_id: '1' },
    ]);
    // UTF-16 puts "@" two units later, on "A", so that span stays plain text.
    expect(splitMentions(text, [{ user_id: '1', start: WAVE.length + 1, length: 2 }])).toEqual([
      { kind: 'text', text },
    ]);
  });

  it('counts an emoji inside the name as one code point', () => {
    const token = `@Ada ${GRIN}`;
    expect(splitMentions(token, [{ user_id: '1', start: 0, length: Array.from(token).length }])).toEqual([
      { kind: 'mention', text: token, user_id: '1' },
    ]);
  });

  it('keeps Arabic in logical order', () => {
    const prefix = 'شاهد ';
    const name = '@نورة';
    const suffix = ' اليوم';
    const text = `${prefix}${name}${suffix}`;
    expect(splitMentions(text, [{
      user_id: 'n',
      start: Array.from(prefix).length,
      length: Array.from(name).length,
    }])).toEqual([
      { kind: 'text', text: prefix },
      { kind: 'mention', text: name, user_id: 'n' },
      { kind: 'text', text: suffix },
    ]);
  });

  it('drops a span that does not line up, and never throws', () => {
    const junk = [
      { user_id: '', start: 0, length: 4 },
      { user_id: '1', start: -1, length: 2 },
      { user_id: '1', start: 0, length: 0 },
      { user_id: '1', start: 1.5, length: 1 },
      { user_id: '1', start: 0, length: 99 },
      { user_id: '1', start: 8, length: 1 },
      null,
    ] as unknown as MentionSpan[];

    expect(splitMentions('@Ada', junk)).toEqual([{ kind: 'text', text: '@Ada' }]);
    expect(splitMentions('Ada', [{ user_id: '1', start: 0, length: 3 }])).toEqual([
      { kind: 'text', text: 'Ada' },
    ]);
    expect(splitMentions('Ada', null)).toEqual([{ kind: 'text', text: 'Ada' }]);
    expect(splitMentions('Ada', undefined)).toEqual([{ kind: 'text', text: 'Ada' }]);
    expect(splitMentions('', [{ user_id: '1', start: 0, length: 1 }])).toEqual([]);
    expect(splitMentions('Ada', {} as unknown as MentionSpan[])).toEqual([
      { kind: 'text', text: 'Ada' },
    ]);
  });

  it('lets the first span win an overlap and still joins back to the original', () => {
    const text = '@Ada @Bea';
    expect(splitMentions(text, [
      { user_id: 'wide', start: 0, length: Array.from(text).length },
      { user_id: 'bea', start: 5, length: 4 },
    ])).toEqual([{ kind: 'mention', text, user_id: 'wide' }]);

    const samples = ['', 'plain', `${WAVE} @Ada`, 'مرحبا @نورة اليوم'];
    for (const sample of samples) {
      expect(joined(sample, [{ user_id: '1', start: 0, length: 99 }, null as unknown as MentionSpan])).toBe(sample);
    }
  });
});

describe('parseMentions', () => {
  it('keeps real spans and drops junk', () => {
    expect(parseMentions([
      { user_id: '1', start: 2, length: 4 },
      { user_id: '', start: 0, length: 1 },
      { no: true },
      'x',
    ])).toEqual([{ user_id: '1', start: 2, length: 4 }]);
    expect(parseMentions(null)).toEqual([]);
    expect(parseMentions('[]')).toEqual([]);
  });
});
