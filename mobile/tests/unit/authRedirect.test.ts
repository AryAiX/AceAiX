import { afterEach, describe, expect, it } from 'vitest';

import { emailConfirmationRedirect, passwordResetRedirect } from '@/lib/authRedirect';

const savedWindow = globalThis.window;

afterEach(() => {
  globalThis.window = savedWindow;
});

/** A release build has `window`, but no address bar, so `location` is missing. */
function installWindow(value: unknown) {
  Object.defineProperty(globalThis, 'window', { value, configurable: true, writable: true });
}

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

  it.each(['ios', 'android'] as const)(
    'does not read the browser address on %s',
    (platform) => {
      installWindow({});
      expect(passwordResetRedirect(platform)).toBe('aceaix://reset-password');
    },
  );

  it('uses the open website when no host is passed', () => {
    installWindow({ location: { origin: 'https://aceaix.com' } });
    expect(passwordResetRedirect('web')).toBe('https://aceaix.com/reset-password');
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

  it.each(['ios', 'android'] as const)(
    'does not read the browser address on %s',
    (platform) => {
      installWindow({});
      expect(emailConfirmationRedirect(platform)).toBe('aceaix://');
    },
  );

  it('uses the open website when no host is passed', () => {
    installWindow({ location: { origin: 'https://aceaix.com' } });
    expect(emailConfirmationRedirect('web')).toBe('https://aceaix.com/');
  });
});
