import { Platform } from 'react-native';

import { fitWithin } from '@/lib/imagePrep';

/**
 * Phone-screen size for a feed clip. 720 on the long edge at 1.8 Mbps is sharp
 * in a card a few hundred points wide, and a few megabytes instead of the
 * camera original (often 10–15 MB of HEVC in a .mov).
 */
export const VIDEO_PRESET = {
  maxEdge: 720,
  bitrate: 1_800_000,
} as const;

export interface PreparedVideo {
  uri: string;
  contentType: 'video/mp4';
  ext: 'mp4';
  width?: number;
  height?: number;
}

async function fileSize(uri: string): Promise<number | null> {
  try {
    // Loaded on demand so a test that never compresses does not need the
    // native filesystem, and a failure here just skips the size comparison.
    const { File } = await import('expo-file-system');
    const file = new File(uri);
    if (!file.exists) return null;
    return file.info().size ?? null;
  } catch {
    return null;
  }
}

/**
 * Shrink a picked clip before upload. Returns null when compression is
 * unavailable (web), fails, or would not make the file smaller — the caller
 * uploads the original in that case, because a heavy clip beats a lost post.
 */
export async function prepareVideo(
  uri: string,
  width?: number | null,
  height?: number | null,
): Promise<PreparedVideo | null> {
  if (Platform.OS === 'web') return null;
  try {
    const { Video } = await import('react-native-compressor');
    const compressed = await Video.compress(uri, {
      compressionMethod: 'manual',
      maxSize: VIDEO_PRESET.maxEdge,
      bitrate: VIDEO_PRESET.bitrate,
    });
    const before = await fileSize(uri);
    const after = await fileSize(compressed);
    if (before != null && after != null && after >= before) return null;
    const fitted = fitWithin(width, height, VIDEO_PRESET.maxEdge);
    return {
      uri: compressed,
      contentType: 'video/mp4',
      ext: 'mp4',
      width: fitted?.width ?? (width && width > 0 ? width : undefined),
      height: fitted?.height ?? (height && height > 0 ? height : undefined),
    };
  } catch (failure) {
    console.warn('Could not compress a video before upload', failure);
    return null;
  }
}
