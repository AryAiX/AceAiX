import { describe, expect, it } from 'vitest';
import type { UserProfile } from '../types';
import { isUserProfile } from './userProfile';

describe('isUserProfile', () => {
  it('accepts profiles with a non-empty id', () => {
    expect(isUserProfile({ id: 'user-1' } as UserProfile)).toBe(true);
  });

  it('rejects hidden, deleted and malformed joined profiles', () => {
    expect(isUserProfile(null)).toBe(false);
    expect(isUserProfile(undefined)).toBe(false);
    expect(isUserProfile({ id: '' } as UserProfile)).toBe(false);
  });
});
