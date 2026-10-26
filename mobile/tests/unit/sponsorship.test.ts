import { describe, expect, it } from 'vitest';

import { sponsorship as arSponsorship } from '@/i18n/locales/ar/sponsorship';
import {
  LOCATION_MAX,
  amountLabel,
  dealHeading,
  formatLocation,
  joinLocation,
  parseAmount,
  parseDay,
  parseLocation,
  rangeLabel,
  statusTone,
  toggleTag,
} from '@/lib/sponsorship';

const t = (key: string, vars?: Record<string, string | number>) => {
  if (key === 'countries.unitedArabEmirates') return 'الإمارات';
  if (key === 'sponsorship.locationFormat') return `${vars?.city}، ${vars?.country}`;
  return key;
};

describe('sponsorship formatting', () => {
  it('writes an amount with its currency', () => {
    expect(amountLabel(4000, 'AED')).toBe('4,000 AED');
    expect(amountLabel(1500.4, null)).toBe('1,500 AED');
    expect(amountLabel(null, 'AED')).toBeNull();
  });

  it('writes a range from whichever ends exist', () => {
    expect(rangeLabel(2000, 8000, 'AED')).toBe('2,000 – 8,000 AED');
    expect(rangeLabel(null, 8000, 'USD')).toBe('≤ 8,000 USD');
    expect(rangeLabel(2000, null, 'AED')).toBe('≥ 2,000 AED');
    expect(rangeLabel(500, 500, 'AED')).toBe('500 AED');
    expect(rangeLabel(null, null, 'AED')).toBeNull();
  });
});

describe('sponsorship form parsing', () => {
  it('reads a whole positive amount, or says it is not one', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount(' 4,000 ')).toBe(4000);
    expect(parseAmount('0')).toBeUndefined();
    expect(parseAmount('12.5')).toBeUndefined();
    expect(parseAmount('lots')).toBeUndefined();
    expect(parseAmount('-5')).toBeUndefined();
  });

  it('reads a real calendar day', () => {
    expect(parseDay('')).toBeNull();
    expect(parseDay('2027-03-10')).toBe('2027-03-10');
    expect(parseDay('2027-02-30')).toBeUndefined();
    expect(parseDay('10/03/2027')).toBeUndefined();
  });

  it('toggles a tag in and out', () => {
    expect(toggleTag(['travel'], 'equipment')).toEqual(['travel', 'equipment']);
    expect(toggleTag(['travel', 'equipment'], 'travel')).toEqual(['equipment']);
  });
});

describe('sponsorship location', () => {
  it('joins a city and an English country, or the country alone', () => {
    expect(joinLocation('Dubai', 'United Arab Emirates')).toBe('Dubai, United Arab Emirates');
    expect(joinLocation('  ', 'United Arab Emirates')).toBe('United Arab Emirates');
    expect(joinLocation('Dubai', '  ')).toBeNull();
    expect(joinLocation('', '')).toBeNull();
    expect(joinLocation(null, null)).toBeNull();
  });

  it('keeps the joined location inside 120 characters', () => {
    const city = 'D'.repeat(110);
    const joined = joinLocation(city, 'United Arab Emirates');
    expect(joined).not.toBeNull();
    expect(joined!.length).toBeLessThanOrEqual(LOCATION_MAX);
    expect(joined!.endsWith(', United Arab Emirates')).toBe(true);
  });

  it('parses a picker value and leaves old free text alone', () => {
    expect(parseLocation('Dubai, United Arab Emirates')).toEqual({
      city: 'Dubai',
      country: 'United Arab Emirates',
    });
    expect(parseLocation('United Arab Emirates')).toEqual({ city: '', country: 'United Arab Emirates' });
    expect(parseLocation('Abu Dhabi')).toBeNull();
    expect(parseLocation('Dubai, Muscat, Manama')).toBeNull();
    expect(parseLocation('')).toBeNull();
    expect(parseLocation('   ')).toBeNull();
    expect(parseLocation(null)).toBeNull();
  });

  it('translates a parsed place and leaves anything else as stored', () => {
    expect(formatLocation('Dubai, United Arab Emirates', t)).toBe('Dubai، الإمارات');
    expect(formatLocation('United Arab Emirates', t)).toBe('الإمارات');
    expect(formatLocation('Abu Dhabi', t)).toBe('Abu Dhabi');
    expect(formatLocation('Dubai, Muscat, Manama', t)).toBe('Dubai, Muscat, Manama');
    expect(formatLocation('', t)).toBe('');
    expect(formatLocation(null, t)).toBe('');
    expect(arSponsorship.locationFormat).toBe('{{city}}، {{country}}');
  });
});

describe('sponsorship deals', () => {
  it('colours a status', () => {
    expect(statusTone('pending')).toBe('warning');
    expect(statusTone('accepted')).toBe('success');
    expect(statusTone('funded')).toBe('success');
    expect(statusTone('open')).toBe('info');
    expect(statusTone('declined')).toBe('neutral');
  });

  it('heads an offer by who is reading it', () => {
    expect(dealHeading({ initiated_by: 'sponsor', my_side: 'athlete' })).toEqual({ key: 'offerFrom', name: 'sponsor' });
    expect(dealHeading({ initiated_by: 'sponsor', my_side: 'sponsor' })).toEqual({ key: 'offerTo', name: 'athlete' });
    expect(dealHeading({ initiated_by: 'sponsor', my_side: 'guardian' })).toEqual({ key: 'offerFrom', name: 'sponsor' });
  });

  it('heads an application by who is reading it', () => {
    expect(dealHeading({ initiated_by: 'athlete', my_side: 'athlete' })).toEqual({ key: 'applicationTo', name: 'sponsor' });
    expect(dealHeading({ initiated_by: 'athlete', my_side: 'sponsor' })).toEqual({ key: 'applicationFrom', name: 'athlete' });
    expect(dealHeading({ initiated_by: 'athlete', my_side: 'guardian' })).toEqual({ key: 'applicationFrom', name: 'athlete' });
  });
});
