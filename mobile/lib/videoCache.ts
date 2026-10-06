import { useEffect, useState } from 'react';
import { Directory, File, Paths } from 'expo-file-system';

import { imageCacheKey, videoCacheFileName } from '@/lib/mediaCache';

/**
 * Disk cache for feed and highlight clips.
 *
 * `expo-video`'s `useCaching` hashes the entire URL, query string included.
 * Post clips are served from signed URLs whose token changes on every feed
 * load, so that cache never hits and fills the phone with duplicate copies.
 * This stores one file per storage path instead, and plays that file.
 *
 * The first view downloads the clip once (the poster stays up until it is
 * ready) and every later view plays the local file. Streaming the signed URL
 * at the same time would download it twice, so a miss does not also stream.
 * If the download fails, playback falls back to the remote URL.
 */

const CACHE_LIMIT_BYTES = 200 * 1024 * 1024;
const inflight = new Map<string, Promise<string | null>>();

function cacheDirectory(): Directory {
  const directory = new Directory(Paths.cache, 'videos');
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

function isFile(entry: File | Directory): entry is File {
  return typeof (entry as File).extension === 'string';
}

function cacheFile(key: string): File {
  return new File(Paths.cache, 'videos', videoCacheFileName(key));
}

/** Local file for this clip, when a previous view already saved it. */
export function cachedVideoUri(remoteUri: string): string | null {
  const key = imageCacheKey(remoteUri);
  if (!key) return null;
  try {
    const file = cacheFile(key);
    if (!file.exists) return null;
    if ((file.info().size ?? 0) <= 0) return null;
    return file.uri;
  } catch {
    return null;
  }
}

function trimCache(directory: Directory, keepUri: string) {
  const files = directory.list().filter(isFile).filter((file) => !file.name.endsWith('.partial'));
  let total = 0;
  const ranked: { file: File; time: number; size: number }[] = [];
  for (const file of files) {
    const info = file.info();
    const size = info.size ?? 0;
    total += size;
    ranked.push({ file, time: info.modificationTime ?? 0, size });
  }
  if (total <= CACHE_LIMIT_BYTES) return;
  ranked.sort((a, b) => a.time - b.time);
  for (const item of ranked) {
    if (total <= CACHE_LIMIT_BYTES) break;
    if (item.file.uri === keepUri) continue;
    try {
      item.file.delete();
      total -= item.size;
    } catch {
      /* a file the player still has open can wait until the next trim */
    }
  }
}

async function downloadVideo(remoteUri: string, key: string): Promise<string | null> {
  const directory = cacheDirectory();
  const destination = cacheFile(key);
  if (destination.exists && (destination.info().size ?? 0) > 0) return destination.uri;

  const partial = new File(directory, `${videoCacheFileName(key)}.partial`);
  if (partial.exists) partial.delete();
  const downloaded = await File.downloadFileAsync(remoteUri, partial);
  if (destination.exists) destination.delete();
  await downloaded.move(destination);
  trimCache(directory, destination.uri);
  return destination.uri;
}

/** Download the clip to the stable cache path. Concurrent callers share one download. */
export function ensureCachedVideo(remoteUri: string): Promise<string | null> {
  if (remoteUri.startsWith('file:')) return Promise.resolve(remoteUri);
  const key = imageCacheKey(remoteUri);
  if (!key) return Promise.resolve(null);
  const hit = cachedVideoUri(remoteUri);
  if (hit) return Promise.resolve(hit);

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = downloadVideo(remoteUri, key)
    .catch(() => null)
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, task);
  return task;
}

/**
 * Source the player should load. A cache hit is available on the first render;
 * a miss stays null until the download finishes, then becomes the local file
 * (or the remote URL if saving it failed).
 */
export function useCachedVideoSource(remoteUri: string): string | null {
  const [source, setSource] = useState<string | null>(() => cachedVideoUri(remoteUri));

  useEffect(() => {
    let cancelled = false;
    const hit = cachedVideoUri(remoteUri);
    if (hit) {
      setSource(hit);
      return;
    }
    setSource(null);
    ensureCachedVideo(remoteUri).then((local) => {
      if (!cancelled) setSource(local ?? remoteUri);
    });
    return () => {
      cancelled = true;
    };
  }, [remoteUri]);

  return source;
}
