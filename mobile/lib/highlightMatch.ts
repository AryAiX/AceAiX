/**
 * Split a label into the part that matches what was typed, and the rest.
 *
 * Matching ignores case and accents, so "jose" marks "José". The pieces keep
 * the original letters, including their accents. An empty query marks nothing.
 */

export interface HighlightPart {
  text: string;
  match: boolean;
}

/** A letter, with accents removed and case folded. Marks on their own disappear. */
function foldCodePoint(ch: string): string {
  return ch.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

interface Folded {
  text: string;
  /** Original string index where each folded character begins. */
  start: number[];
  /** Original string index where each folded character ends. */
  end: number[];
}

function fold(value: string): Folded {
  const start: number[] = [];
  const end: number[] = [];
  let text = '';
  let index = 0;
  let lastEnd = 0;

  for (const ch of value) {
    const piece = foldCodePoint(ch);
    const from = index;
    const to = index + ch.length;
    if (piece.length === 0) {
      // A combining mark belongs to the letter before it.
      for (let i = end.length - 1; i >= 0 && end[i] === lastEnd; i -= 1) end[i] = to;
      lastEnd = to;
      index = to;
      continue;
    }
    for (let i = 0; i < piece.length; i += 1) {
      start.push(from);
      end.push(to);
    }
    text += piece;
    lastEnd = to;
    index = to;
  }

  return { text, start, end };
}

export function highlightMatch(text: string, query: string): HighlightPart[] {
  if (!text) return [];
  const needle = fold(query).text;
  if (!needle) return [{ text, match: false }];

  const haystack = fold(text);
  if (needle.length > haystack.text.length) return [{ text, match: false }];

  const parts: HighlightPart[] = [];
  let from = 0;
  let last = 0;

  while (from <= haystack.text.length - needle.length) {
    const at = haystack.text.indexOf(needle, from);
    if (at < 0) break;
    const origStart = haystack.start[at];
    const origEnd = haystack.end[at + needle.length - 1];
    // A mark that folded into the previous letter can land on the same span.
    if (origEnd <= last) {
      from = at + 1;
      continue;
    }
    if (origStart > last) parts.push({ text: text.slice(last, origStart), match: false });
    parts.push({ text: text.slice(Math.max(origStart, last), origEnd), match: true });
    last = origEnd;
    from = at + needle.length;
  }

  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts.length > 0 ? parts : [{ text, match: false }];
}
