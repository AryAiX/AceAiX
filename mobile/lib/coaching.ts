/**
 * Coach bookings: the calendar arithmetic every coaching screen shares.
 *
 * Slots are stored as instants (timestamptz) and shown in the device's own
 * time zone: a 17:00 session is 17:00 where the phone is. Everything here
 * works on local calendar days for that reason. Pure, so it is tested.
 */
export const SERVICE_KINDS = ['session', 'consultation', 'class'] as const;
export const LOCATION_MODES = ['fixed', 'flexible', 'online'] as const;
export const DURATIONS = [30, 45, 60, 90, 120] as const;
export const REPEAT_WEEKS = [1, 2, 4, 8] as const;

export type ServiceKind = (typeof SERVICE_KINDS)[number];
export type LocationMode = (typeof LOCATION_MODES)[number];

/** Start times a coach can pick: every half hour from 06:00 to 21:30. */
export const TIME_OPTIONS: string[] = Array.from({ length: 32 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

/** A local calendar day as YYYY-MM-DD. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Local midnight of `date`, `offset` days on. */
export function startOfDay(date: Date, offset = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

/** The next `count` local days, starting today. */
export function nextDays(from: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => startOfDay(from, i));
}

export interface DayGroup<T> {
  key: string;
  date: Date;
  items: T[];
}

/** Slots grouped by the local day they start on, days and slots in time order. */
export function groupByDay<T extends { starts_at: string }>(items: readonly T[]): DayGroup<T>[] {
  const groups = new Map<string, DayGroup<T>>();
  const sorted = [...items].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  for (const item of sorted) {
    const at = new Date(item.starts_at);
    if (Number.isNaN(at.getTime())) continue;
    const key = dayKey(at);
    const group = groups.get(key) ?? { key, date: startOfDay(at), items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * The instants to open: every chosen time on every chosen day, repeated weekly.
 * Anything already in the past is dropped, and the result is sorted and unique.
 */
export function buildStarts(days: readonly Date[], times: readonly string[], weeks: number, now: Date): string[] {
  const out = new Set<string>();
  const repeats = Math.max(1, Math.floor(weeks));
  for (const day of days) {
    for (let w = 0; w < repeats; w += 1) {
      for (const time of times) {
        const m = /^(\d{2}):(\d{2})$/.exec(time);
        if (!m) continue;
        const at = new Date(day.getFullYear(), day.getMonth(), day.getDate() + w * 7, Number(m[1]), Number(m[2]));
        if (at.getTime() > now.getTime()) out.add(at.toISOString());
      }
    }
  }
  return [...out].sort();
}

export function isUpcoming(iso: string, now: Date): boolean {
  return new Date(iso).getTime() > now.getTime();
}

/** "17:00 – 18:00" in the given locale's clock. */
export function timeRange(startIso: string, endIso: string, locale: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

export function clockTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** The three small lines of a day chip: "Sat", "12", "Oct". */
export function dayParts(date: Date, locale: string): { weekday: string; day: string; month: string } {
  return {
    weekday: date.toLocaleDateString(locale, { weekday: 'short' }),
    day: String(date.getDate()),
    month: date.toLocaleDateString(locale, { month: 'short' }),
  };
}

/** "Sat 12 Oct, 17:00" — one line for a booking. */
export function whenLabel(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}, ${clockTime(iso, locale)}`;
}

/** A class needs at least two places; anything else is one. */
export function capacityFor(kind: ServiceKind, typed: string): number | undefined {
  if (kind !== 'class') return 1;
  const n = Number(typed.trim());
  return Number.isInteger(n) && n >= 2 && n <= 100 ? n : undefined;
}
