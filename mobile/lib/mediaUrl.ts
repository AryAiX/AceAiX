/**
 * Is this media reference already something an <Image> or <video> can load?
 *
 * Storage buckets are private, so what the database holds is usually a path
 * (`<uid>/<id>.jpg`) that has to be signed first. Anything that is already a
 * URL — a CDN link, or the `data:` and `blob:` URIs the offline preview build
 * inlines its demo media as — must pass through untouched: sending it to
 * `createSignedUrls` fails the whole batch and blanks every item in it.
 */
const ABSOLUTE = /^(https?:|data:|blob:)/i;

export function isAbsoluteMediaUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && ABSOLUTE.test(value);
}

/**
 * The picture to show for a post's media in a grid or list: its preview
 * picture, or the photo itself. A video with no preview picture has none —
 * its video file is not something an image can draw.
 */
export function posterOf(
  media: { type?: string | null; url?: string | null; thumbnail?: string | null } | null | undefined,
): string | null {
  if (!media) return null;
  return media.thumbnail ?? (media.type === 'video' ? null : (media.url ?? null));
}

/** The subset of references that still need signing, de-duplicated. */
export function pathsToSign(values: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const value of values) {
    if (value && !isAbsoluteMediaUrl(value)) out.add(value);
  }
  return [...out];
}
