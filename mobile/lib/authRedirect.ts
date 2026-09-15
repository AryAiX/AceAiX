/** Supabase must return browser recovery to HTTPS, while native uses the app scheme. */
export function passwordResetRedirect(
  platform: string,
  browserOrigin =
    typeof window === 'undefined'
      ? 'https://dev.aceaix.com'
      : window.location.origin,
): string {
  return platform === 'web'
    ? `${browserOrigin.replace(/\/$/, '')}/reset-password`
    : 'aceaix://reset-password';
}

/** Confirmation returns to the same product surface that created the account. */
export function emailConfirmationRedirect(
  platform: string,
  browserOrigin =
    typeof window === 'undefined'
      ? 'https://dev.aceaix.com'
      : window.location.origin,
): string {
  return platform === 'web'
    ? `${browserOrigin.replace(/\/$/, '')}/`
    : 'aceaix://';
}
