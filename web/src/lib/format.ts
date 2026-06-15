/** Pure display/formatting helpers shared across the app (and unit-tested). */

/** Two-letter uppercase initials from a display name. */
export function initials(name: string | null | undefined, max = 2): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, max)
    .toUpperCase();
}

/** DB visibility/performance scores are 0–100; cards show a 0–10 value. */
export function scoreToTen(score: number | null | undefined): number {
  if (!score || score < 0) return 0;
  return Math.round((score / 10) * 10) / 10;
}

/** Map a match result string ("3-1 W") to a single letter. */
export function matchResultLetter(result: string | null | undefined): 'W' | 'D' | 'L' {
  if (!result) return 'D';
  if (result.includes('W')) return 'W';
  if (result.includes('L')) return 'L';
  return 'D';
}

/** Relative "time ago" label from an ISO timestamp. */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—';
  const diff = now - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

/** Compact salary range label, e.g. "EUR 45k–60k". */
export function salaryRange(min: number | null, max: number | null, currency = 'EUR'): string | null {
  if (min == null && max == null) return null;
  const k = (n: number) => `${Math.round(n / 1000)}k`;
  if (min != null && max != null) return `${currency} ${k(min)}–${k(max)}`;
  const single = (min ?? max) as number;
  return `${currency} ${k(single)}+`;
}
