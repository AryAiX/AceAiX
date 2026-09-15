import { describe, expect, it } from 'vitest';

import { emailConfirmationRedirect, passwordResetRedirect } from '@/lib/authRedirect';

describe('password reset redirect', () => {
  it('returns recovery to the current browser host', () => {
    expect(passwordResetRedirect('web', 'https://dev.aceaix.com')).toBe(
      'https://dev.aceaix.com/reset-password',
    );
  });

  it('normalizes a trailing slash', () => {
    expect(passwordResetRedirect('web', 'https://dev.aceaix.com/')).toBe(
      'https://dev.aceaix.com/reset-password',
    );
  });

  it.each(['ios', 'android'] as const)('keeps the native app scheme on %s', (platform) => {
    expect(passwordResetRedirect(platform, 'https://ignored.example')).toBe(
      'aceaix://reset-password',
    );
  });
});

describe('email confirmation redirect', () => {
  it('returns browser confirmation to the product host', () => {
    expect(emailConfirmationRedirect('web', 'https://dev.aceaix.com/')).toBe(
      'https://dev.aceaix.com/',
    );
  });

  it.each(['ios', 'android'] as const)('keeps the app scheme on %s', (platform) => {
    expect(emailConfirmationRedirect(platform, 'https://ignored.example')).toBe('aceaix://');
  });
});
