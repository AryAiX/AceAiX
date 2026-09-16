const configuredOrigin = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();

/** The browser host for the shared V2 product during staging. */
export const WEB_APP_ORIGIN = (configuredOrigin || 'https://dev.aceaix.com').replace(/\/$/, '');

export function webAppLink(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${WEB_APP_ORIGIN}${normalized}`;
}
