import { currentLanguage, type Translate } from '@/lib/i18n-bridge';

/**
 * What a host pays to play, stored in the existing `cost_note` text.
 *
 * "Free" and "AED 25" are the only shapes this screen writes. Older games
 * kept whatever the host typed, and those notes still have to display.
 */

export type CostChoice =
  | { kind: 'free' }
  | { kind: 'paid'; amount: string; currency: string };

/**
 * English country name to ISO 4217. Priority countries, plus the euro
 * countries a host can pick. Anything else falls back to USD.
 */
const COUNTRY_CURRENCY: Record<string, string> = {
  'United Arab Emirates': 'AED',
  'Saudi Arabia': 'SAR',
  Qatar: 'QAR',
  Kuwait: 'KWD',
  Bahrain: 'BHD',
  Oman: 'OMR',
  Iran: 'IRR',
  Egypt: 'EGP',
  Jordan: 'JOD',
  Lebanon: 'LBP',
  Morocco: 'MAD',
  Tunisia: 'TND',
  Turkey: 'TRY',
  'United Kingdom': 'GBP',
  Spain: 'EUR',
  Portugal: 'EUR',
  Germany: 'EUR',
  France: 'EUR',
  Italy: 'EUR',
  Netherlands: 'EUR',
  Austria: 'EUR',
  Belgium: 'EUR',
  Croatia: 'EUR',
  Cyprus: 'EUR',
  Estonia: 'EUR',
  Finland: 'EUR',
  Greece: 'EUR',
  Ireland: 'EUR',
  Latvia: 'EUR',
  Lithuania: 'EUR',
  Luxembourg: 'EUR',
  Malta: 'EUR',
  Slovakia: 'EUR',
  Slovenia: 'EUR',
  Brazil: 'BRL',
  Argentina: 'ARS',
  'United States': 'USD',
  Canada: 'CAD',
  Australia: 'AUD',
  India: 'INR',
  Pakistan: 'PKR',
  Nigeria: 'NGN',
  Ghana: 'GHS',
  'South Africa': 'ZAR',
};

/** The sheet: every mapped code, with USD, EUR and GBP always present. */
const CURRENCY_FIRST = ['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'JOD', 'GBP', 'EUR', 'USD'];

export const COST_CURRENCIES: readonly string[] = [
  ...CURRENCY_FIRST,
  ...Object.values(COUNTRY_CURRENCY).filter(
    (code, index, all) => !CURRENCY_FIRST.includes(code) && all.indexOf(code) === index,
  ),
];

export function currencyForCountry(country: string | null | undefined): string {
  const name = country?.trim() ?? '';
  if (!name) return 'USD';
  return COUNTRY_CURRENCY[name] ?? 'USD';
}

const PAID_NOTE = /^([A-Z]{3}) (\d{1,4})$/;

/** Keeps "AED 25" in that order inside an Arabic sentence. */
function ltrIsolate(value: string): string {
  return `\u2066${value}\u2069`;
}

/**
 * "Free", "AED 25", or null when the host left it blank or the amount is
 * not a whole number from 1 to 9999. Never longer than the column.
 */
export function toCostNote(choice: CostChoice | null): string | null {
  if (!choice) return null;
  if (choice.kind === 'free') return 'Free';

  const currency = choice.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return null;
  if (!/^\d{1,4}$/.test(choice.amount)) return null;
  const amount = Number(choice.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > 9999) return null;

  const note = `${currency} ${amount}`;
  return note.length <= 80 ? note : null;
}

/**
 * A line for a card or a game. "Free" stands alone. A code and an amount
 * become "{{cost}} each", with the number in the reader's language and the
 * code kept in front of it. Anything else is an old free-text note.
 */
export function costLabel(costNote: string | null | undefined, t: Translate): string | null {
  const raw = costNote?.trim() ?? '';
  if (!raw) return null;
  if (raw.toLowerCase() === 'free') return t('meetups.costFree');

  const paid = PAID_NOTE.exec(raw);
  if (paid) {
    const formatted = new Intl.NumberFormat(currentLanguage(), {
      maximumFractionDigits: 0,
    }).format(Number(paid[2]));
    return t('meetups.costEach', { cost: ltrIsolate(`${paid[1]} ${formatted}`) });
  }

  return t('meetups.costEach', { cost: raw });
}
