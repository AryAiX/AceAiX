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
