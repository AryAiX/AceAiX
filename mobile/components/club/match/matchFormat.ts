import type { Translate } from '@/lib/i18n-bridge';

/**
 * Small display helpers the match screens share. Pure, no React.
 */

/** Platform names are brands: shown as they are, in every language. */
const STREAM_PLATFORMS: [string, string][] = [
  ['youtube.com', 'YouTube'],
  ['youtu.be', 'YouTube'],
  ['instagram.com', 'Instagram'],
  ['twitch.tv', 'Twitch'],
  ['facebook.com', 'Facebook'],
  ['fb.watch', 'Facebook'],
  ['tiktok.com', 'TikTok'],
  ['x.com', 'X'],
  ['twitter.com', 'X'],
  ['kick.com', 'Kick'],
  ['vimeo.com', 'Vimeo'],
];

/** The platforms a stream may link to, once each, for the form's hint. */
export const STREAM_PLATFORM_NAMES = [...new Set(STREAM_PLATFORMS.map(([, name]) => name))];

/** "https://www.youtube.com/live/…" → "YouTube". Null when it is not a known platform. */
export function streamPlatform(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /^https?:\/\/([^/\s?#]+)/i.exec(url.trim());
  if (!m) return null;
  const host = m[1].toLowerCase();
  const hit = STREAM_PLATFORMS.find(([h]) => host === h || host.endsWith(`.${h}`));
  return hit ? hit[1] : null;
}

/**
 * Periods are stored as typed. The presets the scorekeeper taps are stored in
 * English and shown translated; anything typed by hand is shown as typed.
 */
export const PERIOD_PRESETS = ['1st half', '2nd half', 'Extra time', 'Penalties'] as const;

export function periodLabel(t: Translate, period: string | null | undefined): string {
  if (!period) return '';
  switch (period.trim().toLowerCase()) {
    case '1st half':
      return t('clubMatch.period.firstHalf');
    case '2nd half':
      return t('clubMatch.period.secondHalf');
    case 'extra time':
      return t('clubMatch.period.extraTime');
    case 'penalties':
      return t('clubMatch.period.penalties');
    default:
      return period;
  }
}

/** "Sat 18 Oct · 17:30" in the reader's language and clock. */
export function dateTimeLabel(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}`;
}

export function timeLabel(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** A whole number from a text field, or null when it is empty or not a number. */
export function parseWhole(text: string): number | null {
  const v = text.trim();
  if (!v) return null;
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) ? n : null;
}
