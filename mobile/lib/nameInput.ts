/**
 * Clean a name as it is typed.
 *
 * This app's Hermes is 0.17.0 (React Native 0.86.3). Nothing shipped in the
 * repo shows that its regex engine implements Unicode property escapes, and
 * the installed compiler cannot execute one, so disallowed characters are
 * listed explicitly instead of using `\p{L}`.
 *
 * A single trailing space is kept so a second given name can still be typed.
 * Callers trim when they save.
 */

/** ASCII digits, Arabic-Indic digits, and ASCII punctuation other than hyphen and apostrophe. */
const DISALLOWED =
  /[0-9\u0660-\u0669\u06F0-\u06F9!"#$%&()*+,./:;<=>?@\[\\\]^_`{|}~\u060C\u061B\u061F]/g;

export function sanitizeNameInput(text: string): string {
  return text.replace(DISALLOWED, '').replace(/\s+/g, ' ').replace(/^ /, '');
}
