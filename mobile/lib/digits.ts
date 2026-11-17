/**
 * Persian and Arabic keyboards type their own digits. `Number`, `parseInt`
 * and `parseFloat` only accept Latin ones, so a height of ۱۷۲ becomes NaN.
 *
 * ۰-۹ (U+06F0–U+06F9) and ٠-٩ (U+0660–U+0669) become 0-9. The Arabic decimal
 * separator ٫ becomes '.', and the Arabic thousands separator ٬ is dropped.
 * Everything else, including names, is left as it was typed.
 */
export function toLatinDigits(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0x06f0 && code <= 0x06f9) out += String(code - 0x06f0);
    else if (code >= 0x0660 && code <= 0x0669) out += String(code - 0x0660);
    else if (code === 0x066b) out += '.';
    else if (code === 0x066c) continue;
    else out += ch;
  }
  return out;
}
