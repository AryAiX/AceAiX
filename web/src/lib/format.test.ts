import { describe, it, expect } from 'vitest';
import { initials, scoreToTen, matchResultLetter, timeAgo, salaryRange } from './format';

describe('initials', () => {
  it('returns two-letter uppercase initials', () => {
    expect(initials('North City FC')).toBe('NC');
    expect(initials('Fresh Athlete')).toBe('FA');
  });
  it('handles empty/nullish input', () => {
    expect(initials(null)).toBe('?');
    expect(initials('')).toBe('?');
  });
});

describe('scoreToTen', () => {
  it('converts a 0-100 score to 0-10', () => {
    expect(scoreToTen(92)).toBe(9.2);
    expect(scoreToTen(100)).toBe(10);
  });
  it('clamps invalid values to 0', () => {
    expect(scoreToTen(null)).toBe(0);
    expect(scoreToTen(-5)).toBe(0);
  });
});

describe('matchResultLetter', () => {
  it('maps result strings to a letter', () => {
    expect(matchResultLetter('3-1 W')).toBe('W');
    expect(matchResultLetter('0-2 L')).toBe('L');
    expect(matchResultLetter('1-1 D')).toBe('D');
    expect(matchResultLetter(null)).toBe('D');
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-06-14T12:00:00Z').getTime();
  it('formats recent times', () => {
    expect(timeAgo(new Date(now - 5 * 60000).toISOString(), now)).toBe('5m ago');
    expect(timeAgo(new Date(now - 3 * 3600000).toISOString(), now)).toBe('3h ago');
    expect(timeAgo(new Date(now - 24 * 3600000).toISOString(), now)).toBe('Yesterday');
  });
  it('handles nullish', () => {
    expect(timeAgo(null)).toBe('—');
  });
});

describe('salaryRange', () => {
  it('formats a min-max range', () => {
    expect(salaryRange(45000, 60000, 'EUR')).toBe('EUR 45k–60k');
  });
  it('formats an open-ended range', () => {
    expect(salaryRange(30000, null, 'AED')).toBe('AED 30k+');
  });
  it('returns null when no salary', () => {
    expect(salaryRange(null, null)).toBeNull();
  });
});
