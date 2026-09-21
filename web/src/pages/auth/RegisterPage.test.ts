import { describe, expect, it } from 'vitest';

import { validateDateOfBirth } from '../../lib/dateOfBirth';

const TODAY = new Date('2026-09-14T12:00:00.000Z');

describe('validateDateOfBirth', () => {
  it('accepts someone on their thirteenth birthday', () => {
    expect(validateDateOfBirth('2013-09-14', TODAY)).toBeNull();
  });

  it('rejects someone who has not turned thirteen yet', () => {
    expect(validateDateOfBirth('2013-09-15', TODAY)).toMatch(/at least 13/i);
  });

  it('rejects malformed and impossible dates', () => {
    expect(validateDateOfBirth('09/14/2010', TODAY)).toMatch(/YYYY-MM-DD/);
    expect(validateDateOfBirth('2010-02-29', TODAY)).toMatch(/real calendar date/i);
  });

  it('accepts a real leap day and rejects future dates', () => {
    expect(validateDateOfBirth('2008-02-29', TODAY)).toBeNull();
    expect(validateDateOfBirth('2027-01-01', TODAY)).toMatch(/future/i);
  });
});
