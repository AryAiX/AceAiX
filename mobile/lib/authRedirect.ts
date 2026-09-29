/**
 * The page the confirmation or recovery email should open.
 *
 * On the web that is the site the person is already on. On a phone there is
 * no browser address, and reading `window.location` throws — a release build
 * has a `window` object whose `location` is missing, which is exactly the
 * "Cannot read property 'origin' of undefined" crash on Create account.
 * Native calls must return the app scheme without touching `window`.
 */
function webOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://dev.aceaix.com';
}

/** Supabase must return browser recovery to HTTPS, while native uses the app scheme. */
export function passwordResetRedirect(platform: string, browserOrigin?: string): string {
  if (platform !== 'web') return 'aceaix://reset-password';
  return `${(browserOrigin ?? webOrigin()).replace(/\/$/, '')}/reset-password`;
}

/** Confirmation returns to the same product surface that created the account. */
export function emailConfirmationRedirect(platform: string, browserOrigin?: string): string {
  if (platform !== 'web') return 'aceaix://';
  return `${(browserOrigin ?? webOrigin()).replace(/\/$/, '')}/`;
}
