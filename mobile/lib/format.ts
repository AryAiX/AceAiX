import { currentLanguage, tr } from './i18n-bridge';

/**
 * Small, boring formatters. Shared so the app speaks with one voice.
 *
 * These are called from render paths all over the app, including places with
 * no React context, so anything they say goes through the translator bridge
 * with its English text as the fallback.
 */

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 45) return tr('common.now', 'now');
  if (seconds < 90) return tr('format.minutesShort', '{{n}}m', { n: 1 });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return tr('format.minutesShort', '{{n}}m', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tr('format.hoursShort', '{{n}}h', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return tr('format.daysShort', '{{n}}d', { n: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return tr('format.weeksShort', '{{n}}w', { n: weeks });
  const months = Math.floor(days / 30);
  if (months < 12) return tr('format.monthsShort', '{{n}}mo', { n: months });
  return tr('format.yearsShort', '{{n}}y', { n: Math.floor(days / 365) });
}

export function fullDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(currentLanguage(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function timeOfDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(currentLanguage(), { hour: '2-digit', minute: '2-digit' });
}

/** Days remaining, phrased for a deadline chip. */
export function deadlineLabel(date: string | null | undefined): string | null {
  if (!date) return null;
  const end = new Date(date).getTime();
  if (Number.isNaN(end)) return null;
  const days = Math.ceil((end - Date.now()) / 86_400_000);
  if (days < 0) return tr('format.closed', 'Closed');
  if (days === 0) return tr('format.closesToday', 'Closes today');
  if (days === 1) return tr('format.oneDayLeft', '1 day left');
  if (days <= 14) return tr('format.daysLeft', '{{n}} days left', { n: days });
  return tr('format.closesOn', 'Closes {{date}}', { date: fullDate(date) });
}

export function compactNumber(value: number | null | undefined): string {
  const n = value ?? 0;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

export function displayName(name: string | null | undefined, fallback?: string): string {
  const trimmed = (name ?? '').trim();
  if (trimmed.length > 0) return trimmed;
  return fallback ?? tr('common.member', 'AceAiX member');
}

export function firstName(name: string | null | undefined): string {
  return displayName(name).split(/\s+/)[0];
}

export function initialsOf(name: string | null | undefined): string {
  const parts = displayName(name, '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function heightLabel(cm: number | null | undefined): string | null {
  if (!cm) return null;
  return tr('format.heightCm', '{{n}} cm', { n: Math.round(cm) });
}

export function weightLabel(kg: number | null | undefined): string | null {
  if (!kg) return null;
  return tr('format.weightKg', '{{n}} kg', { n: Math.round(kg) });
}

/** "13_15" → "13–15". Used wherever a minor's age band stands in for an age. */
export function ageBandLabel(band: string | null | undefined): string | null {
  switch (band) {
    case '13_15':
      return tr('common.ageBand13_15', 'Age 13–15');
    case '16_17':
      return tr('common.ageBand16_17', 'Age 16–17');
    case '18_24':
      return tr('common.ageBand18_24', 'Age 18–24');
    case '25_plus':
      return tr('common.ageBand25Plus', 'Age 25+');
    default:
      return null;
  }
}

export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'athlete':
      return tr('common.athlete', 'Athlete');
    case 'coach':
      return tr('common.coach', 'Coach');
    case 'club':
      return tr('common.club', 'Club');
    case 'scout':
      return tr('common.scout', 'Scout');
    case 'guardian':
      return tr('common.guardian', 'Parent or guardian');
    case 'federation':
      return tr('common.federation', 'Federation');
    case 'admin':
    case 'org_admin':
      return tr('common.aceaixTeam', 'AceAiX team');
    default:
      return tr('common.member', 'Member');
  }
}

/** Joins the non-empty parts of a subtitle with a middle dot. */
export function metaLine(...parts: (string | null | undefined)[]): string {
  return parts.filter((p) => !!p && p.trim().length > 0).join(' · ');
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
