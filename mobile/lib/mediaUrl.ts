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

/** The subset of references that still need signing, de-duplicated. */
export function pathsToSign(values: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const value of values) {
    if (value && !isAbsoluteMediaUrl(value)) out.add(value);
  }
  return [...out];
}
