/**
 * Hashtags in a caption, a comment, or a search box.
 *
 * A tag is `#` plus one or more letters, numbers or underscores. Letters and
 * numbers are Unicode (`\p{L}`, `\p{N}`), so Arabic and other scripts count.
 * The `#` only starts a tag at the beginning of the text or after a character
 * that is not itself part of a tag, so `x#u16` is not a hashtag.
 */

export type HashtagPiece =
  | { kind: 'text'; text: string }
  | { kind: 'hashtag'; text: string; tag: string };

const HASHTAG = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]+)/gu;

/**
 * Plain words and hashtags, in order.
 *
 * A hashtag piece carries `tag` without the `#`. The pieces join back to
 * `text`.
 */
export function splitHashtags(text: string): HashtagPiece[] {
  if (text.length === 0) return [];

  const pieces: HashtagPiece[] = [];
  const re = new RegExp(HASHTAG.source, 'gu');
  let cursor = 0;

  for (const match of text.matchAll(re)) {
    const boundary = match[1] ?? '';
    const tag = match[2];
    if (!tag || match.index === undefined) continue;
    const start = match.index + boundary.length;
    if (start > cursor) pieces.push({ kind: 'text', text: text.slice(cursor, start) });
    pieces.push({ kind: 'hashtag', text: `#${tag}`, tag });
    cursor = start + tag.length + 1;
  }

  if (cursor < text.length) pieces.push({ kind: 'text', text: text.slice(cursor) });
  if (pieces.length === 0) return [{ kind: 'text', text }];
  return pieces;
}

/**
 * The tag when the whole trimmed term is exactly one hashtag, otherwise null.
 * ` #u16 ` is `u16`. `#u16 squad` and `u16` are not.
 */
export function normaliseHashtag(term: string): string | null {
  const pieces = splitHashtags(term.trim());
  if (pieces.length !== 1 || pieces[0].kind !== 'hashtag') return null;
  return pieces[0].tag;
}

/**
 * Postgres POSIX regex for one already-valid tag.
 *
 * Used with `imatch`, which ignores case. `#u16` matches on its own and does
 * not match `#u160` or `x#u16`.
 */
export function hashtagPattern(tag: string): string {
  return `(^|[^[:alnum:]_])#${tag}([^[:alnum:]_]|$)`;
}

/** A letter, number or underscore. The same set the hashtag regex allows. */
const TAG_CHAR = /^[\p{L}\p{N}_]$/u;

const HASHTAG_QUERY_MAX = 50;

function isHighSurrogate(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0xdc00 && code <= 0xdfff;
}

/** Index of the code point that ends at `index`, or -1 at the start. */
function stepBack(text: string, index: number): number {
  if (index <= 0) return -1;
  const prev = index - 1;
  if (isLowSurrogate(text[prev] ?? '') && prev > 0 && isHighSurrogate(text[prev - 1] ?? '')) {
    return prev - 1;
  }
  return prev;
}

/**
 * The hashtag the caret is typing.
 *
 * The caret has to sit immediately after `#` plus 1 to 50 letters, numbers
 * or underscores. The `#` only counts at the start of the text or after a
 * character that is not itself part of a tag, so `x#ba` is not a query.
 * Indices are UTF-16, the same units as the field's caret.
 */
export function activeHashtagQuery(
  text: string,
  cursor: number,
): { start: number; tag: string } | null {
  if (!Number.isInteger(cursor) || cursor < 0 || cursor > text.length) return null;

  const chars: string[] = [];
  let i = cursor;
  while (chars.length <= HASHTAG_QUERY_MAX) {
    const prev = stepBack(text, i);
    if (prev < 0) break;
    const ch = text.slice(prev, i);
    if (!TAG_CHAR.test(ch)) break;
    chars.push(ch);
    i = prev;
  }
  if (chars.length < 1 || chars.length > HASHTAG_QUERY_MAX) return null;

  const hashAt = stepBack(text, i);
  if (hashAt < 0 || text.slice(hashAt, i) !== '#') return null;

  const boundaryAt = stepBack(text, hashAt);
  if (boundaryAt >= 0 && TAG_CHAR.test(text.slice(boundaryAt, hashAt))) return null;

  return { start: hashAt, tag: chars.reverse().join('') };
}

/**
 * Replace the active `#query` with `#tag ` and put the caret after the space.
 *
 * The characters after the caret stay. Nothing here is a mention.
 */
export function applyHashtag(
  text: string,
  start: number,
  cursor: number,
  tag: string,
): { text: string; cursor: number } {
  const insert = `#${tag} `;
  return {
    text: `${text.slice(0, start)}${insert}${text.slice(cursor)}`,
    cursor: start + insert.length,
  };
}
