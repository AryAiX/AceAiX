/**
 * @-mentions while a caption or comment is being written.
 *
 * The field stores offsets in JavaScript's UTF-16 code units, the same
 * indices TextInput uses for its caret. Postgres `char_length` and `substr`
 * count Unicode code points, so the offsets are converted only when the row
 * is saved. An emoji before a name is one code point and two code units;
 * sending the raw caret index would point the mention at the wrong character.
 */

export const MENTION_LIMIT = 10;

/** How long the text after "@" may be and still count as a search. */
export const MENTION_QUERY_MAX = 40;

export interface MentionSpan {
  user_id: string;
  /** 0-based index of the "@". UTF-16 while editing, code points once saved. */
  start: number;
  /** Length of "@Full Name", in the same units as `start`. The trailing space is not included. */
  length: number;
}

const NEWLINE = /[\n\r\u2028\u2029]/;

function isHighSurrogate(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0xdc00 && code <= 0xdfff;
}

/** A line break counts, and so do the spaces a name is allowed to contain. */
function isWhitespace(ch: string): boolean {
  return /[\t\n\r\f\v \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/.test(ch);
}

/**
 * The search sitting under the caret.
 *
 * The "@" has to be the first character or to follow whitespace, so an email
 * address is not a mention. The query may contain spaces (names do) and is at
 * most 40 Unicode code points. A newline or a second "@" ends it.
 */
export function activeMentionQuery(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  if (!Number.isInteger(cursor) || cursor < 0 || cursor > text.length) return null;

  let codePoints = 0;
  let i = cursor;
  while (i > 0) {
    i -= 1;
    if (isLowSurrogate(text[i]) && i > 0 && isHighSurrogate(text[i - 1])) {
      i -= 1;
    }
    const ch = text[i];
    if (ch === '@') {
      if (i !== 0 && !isWhitespace(text[i - 1])) return null;
      const query = text.slice(i + 1, cursor);
      if (Array.from(query).length > MENTION_QUERY_MAX) return null;
      return { start: i, query };
    }
    if (NEWLINE.test(ch)) return null;
    codePoints += 1;
    if (codePoints > MENTION_QUERY_MAX) return null;
  }
  return null;
}

interface EditSpan {
  /** Where the change begins. The same index in both strings. */
  start: number;
  /** End of the replaced region in the old string. */
  oldEnd: number;
  /** End of the replacement in the new string. The caret lands here. */
  newEnd: number;
}

/** Common prefix, then common suffix, so the middle is the edit. */
function editSpan(before: string, after: string): EditSpan {
  let start = 0;
  const limit = Math.min(before.length, after.length);
  while (start < limit && before[start] === after[start]) start += 1;

  let oldEnd = before.length;
  let newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  return { start, oldEnd, newEnd };
}

/** Caret after a user edit, at the end of whatever was just inserted or deleted. */
export function caretAfterEdit(before: string, after: string): number {
  return editSpan(before, after).newEnd;
}

/**
 * Keep mention offsets lined up with an edit.
 *
 * A mention that sits entirely before the edit stays. One that sits entirely
 * after it shifts by the change in length. One the edit overlaps is dropped:
 * the "@Full Name" it pointed at is no longer intact, and guessing which
 * account the new text means would mention the wrong person.
 */
export function adjustMentions(
  before: string,
  after: string,
  mentions: readonly MentionSpan[],
): MentionSpan[] {
  if (mentions.length === 0 || before === after) return mentions.slice();

  const { start, oldEnd, newEnd } = editSpan(before, after);
  const delta = newEnd - oldEnd;
  const next: MentionSpan[] = [];

  for (const mention of mentions) {
    const end = mention.start + mention.length;
    if (end <= start) {
      next.push({ ...mention });
      continue;
    }
    if (mention.start >= oldEnd) {
      const shifted = mention.start + delta;
      if (shifted >= 0 && shifted + mention.length <= after.length) {
        next.push({ ...mention, start: shifted });
      }
    }
  }
  return next;
}

function cleanName(fullName: string): string {
  return fullName.replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
}

/**
 * Apply a replacement whose range is already known.
 *
 * Used when a person is picked. The diff of the two strings is the wrong
 * tool there: "@Al" and "@Alicia" share a prefix, so the diff would see an
 * insertion after the old mention and leave it pointing at the new name.
 */
function replaceRange(
  text: string,
  from: number,
  to: number,
  insert: string,
  mentions: readonly MentionSpan[],
): { text: string; mentions: MentionSpan[] } {
  const nextText = `${text.slice(0, from)}${insert}${text.slice(to)}`;
  const delta = insert.length - (to - from);
  const next: MentionSpan[] = [];
  for (const mention of mentions) {
    const end = mention.start + mention.length;
    if (end <= from) {
      next.push({ ...mention });
    } else if (mention.start >= to) {
      const shifted = mention.start + delta;
      if (shifted >= 0 && shifted + mention.length <= nextText.length) {
        next.push({ ...mention, start: shifted });
      }
    }
  }
  return { text: nextText, mentions: next };
}

/**
 * Replace the active "@query" with "@Full Name " and record the span in
 * UTF-16 indices. Returns null when nothing is being searched, the name is
 * empty, or ten mentions are already recorded.
 */
export function applyMention(
  text: string,
  cursor: number,
  mentions: readonly MentionSpan[],
  person: { user_id: string; full_name: string },
): { text: string; cursor: number; mentions: MentionSpan[] } | null {
  const active = activeMentionQuery(text, cursor);
  if (!active) return null;

  const name = cleanName(person.full_name);
  if (!name) return null;

  const token = `@${name}`;
  const insert = `${token} `;
  const replaced = replaceRange(text, active.start, cursor, insert, mentions);
  if (replaced.mentions.length >= MENTION_LIMIT) return null;

  const added: MentionSpan = {
    user_id: person.user_id,
    start: active.start,
    length: token.length,
  };
  return {
    text: replaced.text,
    cursor: active.start + insert.length,
    mentions: [...replaced.mentions, added].sort((a, b) => a.start - b.start),
  };
}

/**
 * Convert caret offsets to Unicode code points for the mentions column.
 *
 * A span whose text no longer begins with "@" is dropped rather than stored
 * against the wrong characters.
 */
export function mentionsToCodePoints(
  text: string,
  mentions: readonly MentionSpan[],
): MentionSpan[] {
  const out: MentionSpan[] = [];
  for (const mention of mentions) {
    if (mention.start < 0 || mention.length < 1) continue;
    if (mention.start + mention.length > text.length) continue;
    const slice = text.slice(mention.start, mention.start + mention.length);
    if (!slice.startsWith('@')) continue;
    out.push({
      user_id: mention.user_id,
      start: Array.from(text.slice(0, mention.start)).length,
      length: Array.from(slice).length,
    });
  }
  return out;
}

/**
 * The caption or comment is trimmed before it is saved. Shift the spans by
 * the leading whitespace that trim removes, then convert what remains.
 */
export function mentionsForSubmit(
  text: string,
  mentions: readonly MentionSpan[],
): { text: string; mentions: MentionSpan[] } {
  const saved = text.trim();
  const lead = text.length - text.trimStart().length;
  const shifted = mentions.map((mention) => ({ ...mention, start: mention.start - lead }));
  return { text: saved, mentions: mentionsToCodePoints(saved, shifted) };
}

/** A row from `posts.mentions` or `post_comments.mentions`. Junk is dropped. */
export function parseMentions(value: unknown): MentionSpan[] {
  if (!Array.isArray(value)) return [];
  const out: MentionSpan[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const userId = row.user_id;
    const start = row.start;
    const length = row.length;
    if (typeof userId !== 'string' || userId.length === 0) continue;
    if (typeof start !== 'number' || typeof length !== 'number') continue;
    if (!Number.isFinite(start) || !Number.isFinite(length)) continue;
    out.push({ user_id: userId, start, length });
  }
  return out;
}

export type MentionPiece =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; text: string; user_id: string };

interface PlacedMention {
  user_id: string;
  start: number;
  length: number;
  index: number;
}

/**
 * Split `text` on Unicode code points into plain runs and mention runs.
 *
 * A span is a mention only when `start` lands on "@". Anything else — a
 * negative offset, a length that runs past the end, an overlap, a missing
 * account — stays in the plain text. The pieces always join back to `text`.
 */
export function splitMentions(
  text: string,
  mentions: readonly MentionSpan[] | null | undefined,
): MentionPiece[] {
  const chars = Array.from(text);
  if (chars.length === 0) return [];

  const placed = placeMentions(chars, mentions);
  if (placed.length === 0) return [{ kind: 'text', text }];

  const pieces: MentionPiece[] = [];
  let cursor = 0;
  for (const mention of placed) {
    if (mention.start < cursor) continue;
    if (mention.start > cursor) {
      pieces.push({ kind: 'text', text: chars.slice(cursor, mention.start).join('') });
    }
    pieces.push({
      kind: 'mention',
      text: chars.slice(mention.start, mention.start + mention.length).join(''),
      user_id: mention.user_id,
    });
    cursor = mention.start + mention.length;
  }
  if (cursor < chars.length) {
    pieces.push({ kind: 'text', text: chars.slice(cursor).join('') });
  }
  return pieces;
}

function placeMentions(
  chars: readonly string[],
  mentions: readonly MentionSpan[] | null | undefined,
): PlacedMention[] {
  if (!Array.isArray(mentions)) return [];
  const placed: PlacedMention[] = [];
  mentions.forEach((mention, index) => {
    if (!mention || typeof mention !== 'object') return;
    const { user_id, start, length } = mention;
    if (typeof user_id !== 'string' || user_id.length === 0) return;
    if (!Number.isInteger(start) || start < 0) return;
    if (!Number.isInteger(length) || length < 1) return;
    if (start + length > chars.length) return;
    if (chars[start] !== '@') return;
    placed.push({ user_id, start, length, index });
  });
  placed.sort((a, b) => a.start - b.start || a.index - b.index);
  return placed;
}
