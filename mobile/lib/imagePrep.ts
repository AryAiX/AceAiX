/**
 * Shrink a picked image to what a phone screen can show, before upload.
 *
 * The picker hands back the camera original: 3024×4032 and two megabytes for
 * a photo that is drawn 360 points wide. Every viewer then downloads the whole
 * thing, which is what "posts take forever to load" was. A long edge of 1600
 * is sharper than any phone screen in the feed and a fifth of the bytes.
 *
 * Output is always JPEG. HEIC from an iPhone would otherwise go up as-is and
 * fail to decode on Android and the web; PNG screenshots are several times
 * larger than they need to be. GIFs are left alone so animation survives.
 */
export const IMAGE_PRESETS = {
  /** Feed photos and highlights. */
  post: { maxEdge: 1600, quality: 0.82 },
  /** Profile cover band; drawn full width, cropped to 16:9. */
  cover: { maxEdge: 1600, quality: 0.82 },
  /** Profile photo; largest on-screen size is 112 points, 3× is 336. */
  avatar: { maxEdge: 512, quality: 0.85 },
  /** Still frame shown while a video is loading. */
  videoThumbnail: { maxEdge: 720, quality: 0.6 },
} as const;

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
  contentType: 'image/jpeg';
  ext: 'jpg';
  /** Present when `base64: true` was requested. */
  base64?: string;
}

export interface PrepareOptions {
  maxEdge: number;
  quality: number;
  width?: number | null;
  height?: number | null;
  base64?: boolean;
}

export function isAnimatedType(mimeType?: string | null, uri?: string): boolean {
  if ((mimeType ?? '').toLowerCase() === 'image/gif') return true;
  return /\.gif(\?|#|$)/i.test(uri ?? '');
}

/** Width/height after fitting inside `maxEdge` on the longer side; null when no resize is needed. */
export function fitWithin(
  width: number | null | undefined,
  height: number | null | undefined,
  maxEdge: number,
): { width: number; height: number } | null {
  if (!width || !height || width <= 0 || height <= 0) return null;
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return null;
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function prepareImage(uri: string, options: PrepareOptions): Promise<PreparedImage> {
  // Loaded on first use so the pure helpers above can be imported (and unit
  // tested) without dragging the native module and react-native along.
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const context = ImageManipulator.manipulate(uri);
  const target = fitWithin(options.width, options.height, options.maxEdge);
  if (target) {
    context.resize(target);
  } else if (!options.width || !options.height) {
    // Dimensions unknown: cap the width and let the aspect ratio follow. A
    // portrait photo comes out taller than `maxEdge`, which is fine; the
    // point is to stop multi-megabyte originals, not to hit an exact size.
    context.resize({ width: options.maxEdge });
  }
  const rendered = await context.renderAsync();
  try {
    const saved = await rendered.saveAsync({
      compress: options.quality,
      format: SaveFormat.JPEG,
      base64: options.base64 ?? false,
    });
    return {
      uri: saved.uri,
      width: saved.width,
      height: saved.height,
      contentType: 'image/jpeg',
      ext: 'jpg',
      ...(saved.base64 ? { base64: saved.base64 } : {}),
    };
  } finally {
    rendered.release();
  }
}
