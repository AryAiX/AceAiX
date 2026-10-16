import type { Translate } from '@/lib/i18n-bridge';

import { dateTimeLabel, timeLabel } from '../match/matchFormat';

/** "Sat 18 Oct · 09:00 – 12:00", or two full ends when it runs over days. */
export function eventWhen(startsAt: string, endsAt: string | null, locale: string): string {
  const start = dateTimeLabel(startsAt, locale);
  if (!endsAt) return start;
  const a = new Date(startsAt);
  const b = new Date(endsAt);
  if (Number.isNaN(b.getTime())) return start;
  if (a.toDateString() === b.toDateString()) return `${start} – ${timeLabel(endsAt, locale)}`;
  return `${start} → ${dateTimeLabel(endsAt, locale)}`;
}

export function ageRange(t: Translate, min: number | null, max: number | null): string {
  if (min != null && max != null) return t('clubMatch.event.ages', { min, max });
  if (min != null) return t('clubMatch.event.agesFrom', { min });
  if (max != null) return t('clubMatch.event.agesUpTo', { max });
  return t('clubMatch.event.allAges');
}

export function priceLabel(t: Translate, price: number | null, currency: string, locale: string): string {
  if (price == null || price <= 0) return t('clubMatch.event.free');
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

/** Google Maps search for a typed address — no coordinates needed. */
export function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
