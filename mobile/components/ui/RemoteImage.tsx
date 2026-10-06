import React from 'react';
import { Image, type ImageContentFit, type ImageProps, type ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';

import { imageCacheKey } from '@/lib/mediaCache';

interface Props extends Omit<ImageProps, 'source' | 'cachePolicy' | 'style'> {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Flat colour shown until the bytes arrive; defaults to transparent. */
  placeholderColor?: string;
  testID?: string;
}

/**
 * Every remote photo in the app goes through here.
 *
 * It was `react-native`'s `Image`, which has no disk cache of its own and
 * keyed what the OS did cache on the full URL. Signed URLs change on every
 * load, so nothing was ever a hit. This caches on disk and in memory under
 * the storage path, fades the image in instead of popping, and holds a flat
 * colour in the meantime so a loading photo reads as loading rather than as
 * a hole in the layout.
 */
export function RemoteImage({
  uri,
  style,
  contentFit = 'cover',
  placeholderColor,
  recyclingKey,
  ...rest
}: Props) {
  const cacheKey = imageCacheKey(uri);
  return (
    <Image
      {...rest}
      source={uri ? { uri, cacheKey } : null}
      style={[placeholderColor ? { backgroundColor: placeholderColor } : null, style]}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey ?? cacheKey}
      transition={150}
    />
  );
}
