const configuredOrigin = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();

/** The browser host for the shared V2 product during staging. */
export const WEB_APP_ORIGIN = (configuredOrigin || 'https://dev.aceaix.com').replace(/\/$/, '');

export function webAppLink(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${WEB_APP_ORIGIN}${normalized}`;
}

/** What a message holding only one of the app's own links points at. */
export type SharedLink =
  | { kind: 'post'; id: string }
  | { kind: 'profile'; id: string }
  | { kind: 'clip'; id: string };

/** The in-app link for a Best of clip, as Share sends it to a chat. */
export function clipLink(mediaId: string): string {
  return webAppLink(`/clip/${mediaId}`);
}

const ID = '[0-9a-fA-F-]{8,}';

/**
 * A message that is nothing but a link to a post or profile on this app,
 * as the in-app Share sends it. Anything else (a link inside a sentence, a
 * link to another site) is left as plain text.
 */
export function parseSharedLink(text: string | null | undefined): SharedLink | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith(WEB_APP_ORIGIN)) return null;
  const path = trimmed.slice(WEB_APP_ORIGIN.length);
  const post = new RegExp(`^/post/(${ID})/?$`).exec(path);
  if (post) return { kind: 'post', id: post[1] };
  const clip = new RegExp(`^/clip/(${ID})/?$`).exec(path);
  if (clip) return { kind: 'clip', id: clip[1] };
  const profile = new RegExp(`^/u/(${ID})/?$`).exec(path);
  if (profile) return { kind: 'profile', id: profile[1] };
  return null;
}
