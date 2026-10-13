import { describe, expect, it } from 'vitest';

import {
  TIME_OPTIONS,
  buildStarts,
  capacityFor,
  dayKey,
  groupByDay,
  isUpcoming,
  nextDays,
  startOfDay,
} from '@/lib/coaching';

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('coaching calendar days', () => {
  it('offers start times every half hour from 06:00 to 21:30', () => {
    expect(TIME_OPTIONS[0]).toBe('06:00');
    expect(TIME_OPTIONS[1]).toBe('06:30');
    expect(TIME_OPTIONS.at(-1)).toBe('21:30');
    expect(TIME_OPTIONS).toHaveLength(32);
  });

  it('keys a day by its local date', () => {
    expect(dayKey(local(2026, 10, 9, 23, 30))).toBe('2026-10-09');
    expect(dayKey(local(2027, 1, 3))).toBe('2027-01-03');
  });

  it('lists the next days from local midnight, across a month end', () => {
    const days = nextDays(local(2026, 10, 30, 15), 4);
    expect(days.map(dayKey)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(days[0].getHours()).toBe(0);
    expect(dayKey(startOfDay(local(2026, 12, 31, 9), 1))).toBe('2027-01-01');
  });

  it('groups slots by the day they start, in time order', () => {
    const slots = [
      { id: 'c', starts_at: local(2026, 10, 12, 9).toISOString() },
      { id: 'a', starts_at: local(2026, 10, 11, 17).toISOString() },
      { id: 'b', starts_at: local(2026, 10, 11, 8).toISOString() },
      { id: 'x', starts_at: 'not a date' },
    ];
    const groups = groupByDay(slots);
    expect(groups.map((g) => g.key)).toEqual(['2026-10-11', '2026-10-12']);
    expect(groups[0].items.map((s) => s.id)).toEqual(['b', 'a']);
  });
});

describe('opening times', () => {
  const now = local(2026, 10, 9, 12);

  it('builds every chosen time on every chosen day', () => {
    const starts = buildStarts([local(2026, 10, 10), local(2026, 10, 11)], ['09:00', '17:30'], 1, now);
    expect(starts).toHaveLength(4);
    expect(new Date(starts[0]).getHours()).toBe(9);
    expect(new Date(starts[1]).getMinutes()).toBe(30);
  });

  it('repeats weekly', () => {
    const starts = buildStarts([local(2026, 10, 10)], ['09:00'], 4, now);
    expect(starts.map((s) => dayKey(new Date(s)))).toEqual(['2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31']);
  });

  it('drops anything already past, and never repeats an instant', () => {
    const today = local(2026, 10, 9);
    expect(buildStarts([today], ['09:00', '18:00'], 1, now)).toHaveLength(1);
    expect(buildStarts([today, today], ['18:00', '18:00'], 1, now)).toHaveLength(1);
    expect(buildStarts([today], ['nonsense'], 1, now)).toEqual([]);
  });

  it('knows what is still ahead', () => {
    expect(isUpcoming(local(2026, 10, 9, 13).toISOString(), now)).toBe(true);
    expect(isUpcoming(local(2026, 10, 9, 11).toISOString(), now)).toBe(false);
  });
});

describe('places', () => {
  it('gives one place to anything that is not a class', () => {
    expect(capacityFor('session', '12')).toBe(1);
    expect(capacityFor('consultation', '')).toBe(1);
  });

  it('asks a class for between two and a hundred', () => {
    expect(capacityFor('class', '8')).toBe(8);
    expect(capacityFor('class', '1')).toBeUndefined();
    expect(capacityFor('class', '101')).toBeUndefined();
    expect(capacityFor('class', 'lots')).toBeUndefined();
  });
});
