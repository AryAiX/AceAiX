/**
 * A place stored as one line of text: "City, Country", or just "Country".
 *
 * Sponsorship requests cap that column at 120 characters. An opportunity's
 * location is the same shape and was entered with the same limit, so joining
 * trims to it. The country is the English name the country picker stores.
 * Display translates it. Anything that is not that shape is left as stored.
 */
import { ALL_COUNTRIES, COUNTRY_KEYS, countryLabel } from '@/constants/sports';

/** The tighter of the two columns that store a joined place. */
export const LOCATION_MAX = 120;

const KNOWN_COUNTRIES = new Set<string>([...ALL_COUNTRIES, ...Object.keys(COUNTRY_KEYS)]);

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * "City, Country", or just "Country". Empty when there is no country. Cut
 * from the city so a long name still fits.
 */
export function joinLocation(city: string | null | undefined, country: string | null | undefined): string | null {
  const place = (country ?? '').trim();
  const town = (city ?? '').trim();
  if (!place) return null;
  if (!town) return place.length <= LOCATION_MAX ? place : place.slice(0, LOCATION_MAX);
  const joined = `${town}, ${place}`;
  if (joined.length <= LOCATION_MAX) return joined;
  const room = LOCATION_MAX - place.length - 2;
  if (room < 1) return place.slice(0, LOCATION_MAX);
  return `${town.slice(0, room).trimEnd()}, ${place}`;
}

/**
 * Split a stored location only when the part after the last ", " — or the
 * whole text, when there is no comma — is a country the picker knows.
 * Older free text ("Abu Dhabi", "Dubai, Muscat, Manama") stays unparsed.
 */
export function parseLocation(text: string | null | undefined): { city: string; country: string } | null {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return null;
  const splitAt = trimmed.lastIndexOf(', ');
  const city = splitAt >= 0 ? trimmed.slice(0, splitAt).trim() : '';
  const country = (splitAt >= 0 ? trimmed.slice(splitAt + 2) : trimmed).trim();
  if (!country || !KNOWN_COUNTRIES.has(country)) return null;
  if (splitAt >= 0 && !city) return null;
  return { city, country };
}

/**
 * A parsed location, with the country translated. The locale string decides
 * the order and the comma — Arabic uses "،". Anything that does not parse
 * is returned as stored.
 */
export function formatLocation(text: string | null | undefined, t: Translate): string {
  if (text == null) return '';
  const parsed = parseLocation(text);
  if (!parsed) return text;
  const country = countryLabel(t, parsed.country);
  if (!parsed.city) return country;
  return t('sponsorship.locationFormat', { city: parsed.city, country });
}
