import { describe, expect, it } from 'vitest';

import { toLatinDigits } from '@/lib/digits';

describe('toLatinDigits', () => {
  it('turns Persian digits into Latin digits', () => {
    expect(toLatinDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
    expect(toLatinDigits('قد ۱۷۲')).toBe('قد 172');
  });

  it('turns Arabic digits into Latin digits', () => {
    expect(toLatinDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('maps the Arabic decimal separator and drops the thousands separator', () => {
    expect(toLatinDigits('۱۲٫۵')).toBe('12.5');
    expect(toLatinDigits('١٫٥٠')).toBe('1.50');
    expect(toLatinDigits('۱٬۲۳۴')).toBe('1234');
    expect(toLatinDigits('٤٬٠٠٠')).toBe('4000');
  });

  it('leaves Latin text, names, and an empty string unchanged', () => {
    expect(toLatinDigits('Playfeed 2026')).toBe('Playfeed 2026');
    expect(toLatinDigits('لیلا حداد')).toBe('لیلا حداد');
    expect(toLatinDigits('')).toBe('');
  });
});
