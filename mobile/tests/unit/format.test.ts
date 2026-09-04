import { describe, expect, it, vi, afterEach } from 'vitest';

import {
  ageBandLabel,
  compactNumber,
  deadlineLabel,
  displayName,
  firstName,
  heightLabel,
  initialsOf,
  metaLine,
  relativeTime,
  roleLabel,
  truncate,
} from '@/lib/format';

const NOW = new Date('2026-09-04T12:00:00Z');

afterEach(() => vi.useRealTimers());

function at(offsetMs: number): string {
  return new Date(NOW.getTime() - offsetMs).toISOString();
}

describe('relativeTime', () => {
  it('reads as a person would say it', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(relativeTime(at(5_000))).toBe('now');
    expect(relativeTime(at(120_000))).toBe('2m');
    expect(relativeTime(at(3 * 3_600_000))).toBe('3h');
    expect(relativeTime(at(2 * 86_400_000))).toBe('2d');
    expect(relativeTime(at(14 * 86_400_000))).toBe('2w');
    expect(relativeTime(at(60 * 86_400_000))).toBe('2mo');
    expect(relativeTime(at(800 * 86_400_000))).toBe('2y');
  });

  it('never renders "Invalid Date" into the UI', () => {
    expect(relativeTime(null)).toBe('');
    expect(relativeTime(undefined)).toBe('');
    expect(relativeTime('not-a-date')).toBe('');
  });
});

describe('deadlineLabel', () => {
  it('counts down, then says closed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    expect(deadlineLabel('2026-09-01')).toBe('Closed');
    expect(deadlineLabel('2026-09-05')).toBe('1 day left');
    expect(deadlineLabel('2026-09-10')).toBe('6 days left');
    expect(deadlineLabel('2026-12-01')).toMatch(/^Closes /);
    expect(deadlineLabel(null)).toBeNull();
  });
});

describe('compactNumber', () => {
  it('shortens the way social counters do', () => {
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(999)).toBe('999');
    expect(compactNumber(1000)).toBe('1K');
    expect(compactNumber(1500)).toBe('1.5K');
    expect(compactNumber(12_400)).toBe('12K');
    expect(compactNumber(2_400_000)).toBe('2.4M');
    expect(compactNumber(null)).toBe('0');
  });
});

describe('names', () => {
  it('falls back rather than rendering an empty row', () => {
    expect(displayName(null)).toBe('AceAiX member');
    expect(displayName('   ')).toBe('AceAiX member');
    expect(displayName('Layla Haddad')).toBe('Layla Haddad');
    expect(firstName('Layla Haddad')).toBe('Layla');
  });

  it('builds initials from the first and last name', () => {
    expect(initialsOf('Layla Haddad')).toBe('LH');
    expect(initialsOf('Layla')).toBe('LA');
    expect(initialsOf('Layla Amal Haddad')).toBe('LH');
    expect(initialsOf(null)).toBe('?');
  });
});

describe('metaLine', () => {
  it('drops the gaps instead of leaving stray separators', () => {
    expect(metaLine('Striker', 'Football', '2h')).toBe('Striker · Football · 2h');
    expect(metaLine('Striker', null, '2h')).toBe('Striker · 2h');
    expect(metaLine(null, undefined, '')).toBe('');
  });
});

describe('age bands', () => {
  // A minor's exact age is deliberately withheld by the server; the band is
  // all the UI ever gets, so this mapping is a safety-relevant contract.
  it('maps every band the database can produce', () => {
    expect(ageBandLabel('13_15')).toBe('Age 13–15');
    expect(ageBandLabel('16_17')).toBe('Age 16–17');
    expect(ageBandLabel('18_24')).toBe('Age 18–24');
    expect(ageBandLabel('25_plus')).toBe('Age 25+');
    expect(ageBandLabel(null)).toBeNull();
    expect(ageBandLabel('nonsense')).toBeNull();
  });
});

describe('misc', () => {
  it('labels roles in human words', () => {
    expect(roleLabel('athlete')).toBe('Athlete');
    expect(roleLabel('org_admin')).toBe('AceAiX team');
    expect(roleLabel(undefined)).toBe('Member');
  });

  it('truncates with an ellipsis and no trailing space', () => {
    expect(truncate('short', 20)).toBe('short');
    expect(truncate('a very long sentence indeed', 12)).toBe('a very long…');
  });

  it('formats measurements or returns null', () => {
    expect(heightLabel(181.4)).toBe('181 cm');
    expect(heightLabel(null)).toBeNull();
    expect(heightLabel(0)).toBeNull();
  });
});
