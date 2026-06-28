import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

import { deadlineLabel, formatSalary } from '@/lib/opportunitiesService';
import { formatCount, postTimeAgo } from '@/lib/postsService';
import { sourceLabel } from '@/lib/performanceService';

describe('opportunity formatting', () => {
  it('formats salary ranges', () => {
    expect(formatSalary({
      salary_min: 120000,
      salary_max: 180000,
      currency: 'USD',
    } as any)).toBe('$120K – $180K/yr');
  });

  it('formats salary caps', () => {
    expect(formatSalary({
      salary_min: null,
      salary_max: 90000,
      currency: 'AED',
    } as any)).toBe('Up to AED 90K/yr');
  });

  it('returns null when no salary exists', () => {
    expect(formatSalary({
      salary_min: null,
      salary_max: null,
      currency: 'USD',
    } as any)).toBeNull();
  });

  it('labels open deadlines', () => {
    expect(deadlineLabel(null)).toBe('Open');
  });

  it('labels expired deadlines as closed', () => {
    expect(deadlineLabel('2000-01-01')).toBe('Closed');
  });
});

describe('post formatting', () => {
  it('formats small counts directly', () => {
    expect(formatCount(999)).toBe('999');
  });

  it('formats thousands', () => {
    expect(formatCount(1250)).toBe('1.3K');
  });

  it('formats millions', () => {
    expect(formatCount(2_400_000)).toBe('2.4M');
  });

  it('formats recent post timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-28T12:00:00Z'));
    expect(postTimeAgo('2026-06-28T11:59:30Z')).toBe('Just now');
    vi.useRealTimers();
  });
});

describe('performance source labels', () => {
  it('labels self reported data', () => {
    expect(sourceLabel('self_reported')).toBe('Self-reported');
  });

  it('passes through unknown source labels', () => {
    expect(sourceLabel('partner_feed')).toBe('partner_feed');
  });
});
