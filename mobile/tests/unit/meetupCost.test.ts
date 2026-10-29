import { afterEach, describe, expect, it } from 'vitest';

import { setGlobalTranslator, type Translate } from '@/lib/i18n-bridge';
import { costLabel, currencyForCountry, toCostNote } from '@/lib/meetupCost';

const t: Translate = (key, vars) => {
  if (key === 'meetups.costFree') return 'Free';
  if (key === 'meetups.costEach') return `${vars?.cost} each`;
  return key;
};

afterEach(() => {
  setGlobalTranslator(null, 'en');
});

describe('toCostNote', () => {
  it('leaves a blank cost empty', () => {
    expect(toCostNote(null)).toBeNull();
  });

  it('stores free as the English word the reader later translates', () => {
    expect(toCostNote({ kind: 'free' })).toBe('Free');
  });

  it('stores a paid amount as a code and a whole number', () => {
    expect(toCostNote({ kind: 'paid', amount: '25', currency: 'aed' })).toBe('AED 25');
    expect(toCostNote({ kind: 'paid', amount: '025', currency: 'USD' })).toBe('USD 25');
    expect(toCostNote({ kind: 'paid', amount: '9999', currency: 'EUR' })).toBe('EUR 9999');
  });

  it('refuses an amount outside 1 to 9999', () => {
    expect(toCostNote({ kind: 'paid', amount: '', currency: 'AED' })).toBeNull();
    expect(toCostNote({ kind: 'paid', amount: '0', currency: 'AED' })).toBeNull();
    expect(toCostNote({ kind: 'paid', amount: '10000', currency: 'AED' })).toBeNull();
    expect(toCostNote({ kind: 'paid', amount: '12a', currency: 'AED' })).toBeNull();
    expect(toCostNote({ kind: 'paid', amount: '25', currency: 'US' })).toBeNull();
  });
});

describe('costLabel', () => {
  it('returns nothing when there is no note', () => {
    expect(costLabel(null, t)).toBeNull();
    expect(costLabel(undefined, t)).toBeNull();
    expect(costLabel('   ', t)).toBeNull();
  });

  it('translates free on its own, in any capitalisation', () => {
    expect(costLabel('Free', t)).toBe('Free');
    expect(costLabel(' FREE ', t)).toBe('Free');
    expect(costLabel('free', t)).not.toContain('each');
  });

  it('formats a paid note and keeps the code in front of the number', () => {
    const formatted = new Intl.NumberFormat('en').format(1000);
    const label = costLabel('AED 1000', t);
    expect(label).toBe(`\u2066AED ${formatted}\u2069 each`);
    expect(label?.includes('AED')).toBe(true);
    const inner = label?.slice(0, -' each'.length) ?? '';
    expect(inner.startsWith('\u2066AED ')).toBe(true);
    expect(inner.endsWith('\u2069')).toBe(true);
  });

  it('formats the number for the reader language without swapping the code', () => {
    setGlobalTranslator(null, 'de');
    const formatted = new Intl.NumberFormat('de').format(1000);
    const label = costLabel('AED 1000', t);
    expect(label).toBe(`\u2066AED ${formatted}\u2069 each`);
    expect(label?.indexOf('AED')).toBeLessThan(label?.indexOf(formatted) ?? -1);
  });

  it('keeps the code in front of an Arabic-formatted number', () => {
    setGlobalTranslator(null, 'ar');
    const formatted = new Intl.NumberFormat('ar').format(25);
    expect(costLabel('AED 25', t)).toBe(`\u2066AED ${formatted}\u2069 each`);
  });

  it('passes an old free-text note through unchanged', () => {
    expect(costLabel('25 dirhams, bring change', t)).toBe('25 dirhams, bring change each');
    expect(costLabel('AED25', t)).toBe('AED25 each');
  });
});

describe('currencyForCountry', () => {
  it('maps the launch countries and falls back to USD', () => {
    expect(currencyForCountry('United Arab Emirates')).toBe('AED');
    expect(currencyForCountry('Saudi Arabia')).toBe('SAR');
    expect(currencyForCountry('Qatar')).toBe('QAR');
    expect(currencyForCountry('United Kingdom')).toBe('GBP');
    expect(currencyForCountry('France')).toBe('EUR');
    expect(currencyForCountry('Germany')).toBe('EUR');
    expect(currencyForCountry('United States')).toBe('USD');
    expect(currencyForCountry('Japan')).toBe('USD');
    expect(currencyForCountry('')).toBe('USD');
    expect(currencyForCountry(null)).toBe('USD');
  });
});
