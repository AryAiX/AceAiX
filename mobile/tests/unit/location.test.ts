import { describe, expect, it } from 'vitest';

import { sponsorship as arSponsorship } from '@/i18n/locales/ar/sponsorship';
import { LOCATION_MAX, formatLocation, joinLocation, parseLocation } from '@/lib/location';

const t = (key: string, vars?: Record<string, string | number>) => {
  if (key === 'countries.unitedArabEmirates') return 'الإمارات';
  if (key === 'sponsorship.locationFormat') return `${vars?.city}، ${vars?.country}`;
  return key;
};

describe('location text', () => {
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
    /* Arabic keeps city then country, with the Arabic comma, so the line
       reads correctly when the app is laid out right to left. */
    expect(arSponsorship.locationFormat).toBe('{{city}}، {{country}}');
  });
});
