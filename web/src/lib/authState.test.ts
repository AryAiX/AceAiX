import { describe, expect, it } from 'vitest';
import { authIdentityTransition } from './authState';

describe('auth identity transitions', () => {
  it('preserves state for repeated events from the same user', () => {
    expect(authIdentityTransition('user-1', 'user-1')).toBe('same-user');
  });

  it('distinguishes first sign-in, account switches, and sign-out', () => {
    expect(authIdentityTransition(null, 'user-1')).toBe('signed-in');
    expect(authIdentityTransition('user-1', 'user-2')).toBe('switched-user');
    expect(authIdentityTransition('user-1', null)).toBe('signed-out');
  });
});
