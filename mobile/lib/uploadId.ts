/** Random id for a storage object name. Not cryptographic - it only
 * has to be unique, so a replaced photo is a new object and is never
 * served from a stale cache. */
export function randomUploadId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof g.crypto?.randomUUID === 'function') return g.crypto.randomUUID();
  const part = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${part()}-${part()}`;
}
