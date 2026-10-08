/**
 * Sponsorship: the vocabulary the database accepts, and the small pieces of
 * formatting every sponsorship screen shares. Pure, so it is tested.
 *
 * The tag lists mirror the allow-lists in `save_sponsorship_request`,
 * `save_sponsor_call` and `save_sponsor_profile` (1008/02). A tag that is not
 * here is dropped by the database, so adding one means adding it there first.
 */
export const NEEDS = ['entry_fee', 'travel', 'equipment', 'coaching', 'nutrition', 'other'] as const;
export const GIVES = ['logo_on_kit', 'social_posts', 'appearances', 'content', 'testimonial'] as const;
export const OFFERS = ['cash', 'equipment', 'travel', 'coaching', 'nutrition'] as const;

export type Need = (typeof NEEDS)[number];
export type Give = (typeof GIVES)[number];
export type Offer = (typeof OFFERS)[number];

export type RequestStatus = 'open' | 'funded' | 'closed';
export type DealStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

/** "4,000 AED". Whole units only: nobody sponsors a tournament to the cent. */
export function amountLabel(amount: number | null | undefined, currency: string | null | undefined): string | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  return `${Math.round(amount).toLocaleString('en-US')} ${currency || 'AED'}`;
}

/** "2,000 – 8,000 AED", or whichever end exists. */
export function rangeLabel(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  const unit = currency || 'AED';
  const lo = min != null && Number.isFinite(min) ? Math.round(min).toLocaleString('en-US') : null;
  const hi = max != null && Number.isFinite(max) ? Math.round(max).toLocaleString('en-US') : null;
  if (lo && hi) return lo === hi ? `${lo} ${unit}` : `${lo} – ${hi} ${unit}`;
  if (hi) return `≤ ${hi} ${unit}`;
  if (lo) return `≥ ${lo} ${unit}`;
  return null;
}

/** A typed amount: digits only, no zero, no decimals. `undefined` means "not a number". */
export function parseAmount(text: string): number | null | undefined {
  const trimmed = text.trim().replace(/[,\s]/g, '');
  if (trimmed === '') return null;
  if (!/^\d{1,9}$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  return value > 0 ? value : undefined;
}

/** A typed date: empty is fine, otherwise a real calendar day as YYYY-MM-DD. */
export function parseDay(text: string): string | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!m) return undefined;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const real =
    date.getUTCFullYear() === Number(m[1]) &&
    date.getUTCMonth() === Number(m[2]) - 1 &&
    date.getUTCDate() === Number(m[3]);
  return real ? trimmed : undefined;
}

export function toggleTag<T extends string>(list: readonly T[], tag: T): T[] {
  return list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];
}

/** Badge colour for a deal or a request. */
export function statusTone(status: string): 'warning' | 'success' | 'neutral' | 'info' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'accepted':
    case 'funded':
      return 'success';
    case 'open':
      return 'info';
    default:
      return 'neutral';
  }
}

export interface DealLike {
  initiated_by: 'sponsor' | 'athlete';
  my_side: 'sponsor' | 'athlete' | 'guardian';
}

/**
 * Which sentence heads a deal row, and whose name goes in it.
 * An offer is from a sponsor; an application is from an athlete. "Yours" is
 * whichever you opened — a guardian opened neither, so reads both as received.
 */
export function dealHeading(deal: DealLike): {
  key: 'offerFrom' | 'offerTo' | 'applicationFrom' | 'applicationTo';
  name: 'sponsor' | 'athlete';
} {
  if (deal.initiated_by === 'sponsor') {
    return deal.my_side === 'sponsor'
      ? { key: 'offerTo', name: 'athlete' }
      : { key: 'offerFrom', name: 'sponsor' };
  }
  return deal.my_side === 'athlete'
    ? { key: 'applicationTo', name: 'sponsor' }
    : { key: 'applicationFrom', name: 'athlete' };
}
