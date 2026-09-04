import { describe, expect, it } from 'vitest';

import { AppError, errorMessage, toFriendlyError } from '@/lib/errors';

/**
 * Nothing in this app may show a raw Postgres error to a fourteen-year-old.
 * These tests pin the translations that matter most — the safety ones, where
 * a vague message would leave someone thinking the app is broken when it is
 * actually protecting them.
 */

describe('database hints', () => {
  it('explains the guardian-consent block', () => {
    const e = toFriendlyError({ code: '42501', hint: 'guardian_consent_required' });
    expect(e.message).toContain('parent or guardian');
    expect(e.hint).toBe('guardian_consent_required');
  });

  it('explains why a message was refused', () => {
    const e = toFriendlyError({ code: '42501', hint: 'messaging_not_permitted' });
    expect(e.message).toContain('verified coaches and clubs');
  });

  it('explains a rate limit without blaming the user', () => {
    expect(errorMessage({ code: '54000', hint: 'rate_limited' })).toContain('too quickly');
  });

  it('explains the age floor', () => {
    expect(errorMessage({ code: '23514', hint: 'age_below_minimum' })).toContain('13');
  });
});

describe('error codes', () => {
  it('maps the codes the app actually hits', () => {
    expect(errorMessage({ code: '23505' })).toBe('That already exists.');
    expect(errorMessage({ code: '42501' })).toContain("don't have permission");
    expect(errorMessage({ code: 'P0002' })).toContain('could not find');
  });
});

describe('auth messages', () => {
  it('rewrites Supabase auth strings into plain English', () => {
    expect(errorMessage({ message: 'Invalid login credentials' })).toBe(
      'That email or password is not right.',
    );
    expect(errorMessage({ message: 'User already registered' })).toContain('already uses that email');
  });
});

describe('fallbacks', () => {
  it('recognises a dropped connection', () => {
    expect(errorMessage({ message: 'Network request failed' })).toContain('No connection');
  });

  it('passes through a short custom message we wrote ourselves', () => {
    expect(errorMessage({ message: 'You cannot follow yourself' })).toBe(
      'You cannot follow yourself',
    );
  });

  it('swallows raw SQL noise', () => {
    const raw = {
      message:
        'relation "public.athlete_profiles" does not exist, column ap.league does not exist',
    };
    expect(errorMessage(raw)).toBe('Something went wrong. Please try again.');
  });

  it('handles null, strings and unknown objects', () => {
    expect(errorMessage(null)).toContain('Something went wrong');
    expect(errorMessage('Plain string')).toBe('Plain string');
    expect(errorMessage({ weird: true })).toContain('Something went wrong');
  });
});

describe('AppError', () => {
  it('carries the friendly message and the hint', () => {
    const err = new AppError({ code: '42501', hint: 'messaging_not_permitted' });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.hint).toBe('messaging_not_permitted');
    expect(err.message).toContain('verified coaches and clubs');
  });
});
