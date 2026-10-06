/**
 * Cache keys for remote images.
 *
 * Post media lives in a private bucket and is served through signed URLs that
 * carry a fresh token every time the feed loads. To an image cache keyed on
 * the URL that is a brand-new image each time, so the same two-megabyte photo
 * was downloaded on every open. Keying on the storage path instead lets a
 * re-signed URL hit the copy already on disk.
 *
 * Public bucket URLs and plain http(s) images are stable already; their path
 * is still a fine key, and strips any cache-busting query string.
 */
const STORAGE_OBJECT = /\/storage\/v1\/(?:object|render\/image)\/(?:sign|public|authenticated)\/([^?#]+)/;

/**
 * File name for a cached video. The storage path is the stable id; the hash
 * prefix keeps two paths that sanitize to the same leaf from colliding.
 */
export function videoCacheFileName(key: string): string {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const leaf = key.split('/').pop() ?? 'video';
  const safeLeaf = leaf.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80);
  return `${(hash >>> 0).toString(16)}_${safeLeaf}`;
}

export function imageCacheKey(uri: string | null | undefined): string | undefined {
  if (!uri) return undefined;
  const match = STORAGE_OBJECT.exec(uri);
  if (match) return decodeURIComponent(match[1]);
  try {
    const url = new URL(uri);
    return `${url.host}${url.pathname}`;
  } catch {
    return uri;
  }
}
