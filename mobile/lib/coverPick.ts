import { Image } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';

import { exifOrientation, storedPixelsToVisual } from '@/lib/coverCrop';

/**
 * Pixel size for the cropper. The picker's width and height are already the
 * picture as shown. When they are missing, `Image.getSize` can still be the
 * stored size, so a 90° EXIF orientation swaps the axes.
 */
export async function readCoverSize(
  asset: ImagePickerAsset,
): Promise<{ width: number; height: number }> {
  if (asset.width > 0 && asset.height > 0) {
    return { width: Math.round(asset.width), height: Math.round(asset.height) };
  }
  const measured = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      asset.uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error instanceof Error ? error : new Error('Could not read that photo.')),
    );
  });
  return storedPixelsToVisual(measured.width, measured.height, exifOrientation(asset.exif));
}
