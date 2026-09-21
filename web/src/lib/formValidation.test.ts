import { describe, expect, it } from 'vitest';
import {
  friendlySaveError,
  GENERIC_SAVE_ERROR,
  validateEmail,
  validateFullName,
  validateHeightCm,
  validatePhone,
  validateWeightKg,
} from './formValidation';

describe('validateFullName', () => {
  it('rejects blank and whitespace-only names', () => {
    expect(validateFullName('')).toMatch(/required/i);
    expect(validateFullName('   ')).toMatch(/required/i);
  });

  it('rejects names above the 255-character column limit', () => {
    expect(validateFullName('X'.repeat(256))).toMatch(/255/);
    expect(validateFullName('X'.repeat(255))).toBeNull();
  });

  it('accepts ordinary names', () => {
    expect(validateFullName(' Fresh Athlete ')).toBeNull();
  });
});

describe('measurements', () => {
  it('treats empty measurements as optional', () => {
    expect(validateHeightCm('')).toBeNull();
    expect(validateWeightKg('  ')).toBeNull();
  });

  it('enforces the same range the inputs advertise', () => {
    expect(validateHeightCm('999')).toMatch(/between 140 and 220/);
    expect(validateHeightCm('139.9')).toMatch(/between/);
    expect(validateHeightCm('180')).toBeNull();
    expect(validateWeightKg('12')).toMatch(/between 50 and 120/);
    expect(validateWeightKg('75.5')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(validateHeightCm('tall')).toMatch(/number/);
  });
});

describe('validateEmail', () => {
  it('rejects malformed addresses', () => {
    expect(validateEmail('not-an-email')).toMatch(/valid email/i);
    expect(validateEmail('a@b')).toMatch(/valid email/i);
    expect(validateEmail('a b@example.com')).toMatch(/valid email/i);
  });

  it('accepts well-formed addresses and honours optionality', () => {
    expect(validateEmail('athlete@aceaix.demo')).toBeNull();
    expect(validateEmail('')).toMatch(/required/i);
    expect(validateEmail('', { required: false })).toBeNull();
  });
});

describe('validatePhone', () => {
  it('accepts international formats with separators', () => {
    expect(validatePhone('+971 50 000 0000')).toBeNull();
    expect(validatePhone('(050) 123-4567')).toBeNull();
    expect(validatePhone('')).toBeNull();
  });

  it('rejects letters, too few digits and oversized values', () => {
    expect(validatePhone('abc-not-a-phone')).toMatch(/valid phone/i);
    expect(validatePhone('12345')).toMatch(/valid phone/i);
    expect(validatePhone('+'.padEnd(60, '1'))).toMatch(/50 characters/);
  });
});

describe('friendlySaveError', () => {
  it('never leaks database error text', () => {
    const message = friendlySaveError(new Error('value too long for type character varying(255)'));
    expect(message).toBe(GENERIC_SAVE_ERROR);
    expect(message).not.toMatch(/character varying/);
  });

  it('gives actionable copy for connectivity and auth failures', () => {
    expect(friendlySaveError(new Error('TypeError: Failed to fetch'))).toMatch(/offline/i);
    expect(friendlySaveError(new Error('new row violates row-level security policy'))).toMatch(/sign in/i);
  });

  it('supports a caller-specific fallback', () => {
    expect(friendlySaveError('boom', 'Settings could not be saved.')).toBe('Settings could not be saved.');
  });
});
