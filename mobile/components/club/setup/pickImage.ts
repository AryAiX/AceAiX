import * as ImagePicker from 'expo-image-picker';

import type { PickedPhoto } from '@/components/onboarding/PhotoStep';
import { readCoverSize } from '@/lib/coverPick';
import type { Translate } from '@/lib/i18n-bridge';

export type PickSource = 'library' | 'camera';
export type PickShape = 'square' | 'wide' | 'document';

/** A cover photo, uncropped, so the caller can open the cover cropper. */
export interface PickedWidePhoto {
  uri: string;
  width: number;
  height: number;
  /** EXIF from the picker, when it sent any. Orientation lives here. */
  exif: Record<string, unknown> | null;
  fileName?: string | null;
  mimeType?: string | null;
}

type PickFailure = { ok: false; reason: 'cancelled' | 'denied' | 'unreadable' | 'failed' };

export type PickResult =
  | { ok: true; photo: PickedPhoto }
  | { ok: true; photo: PickedWidePhoto }
  | PickFailure;

/**
 * One photo from the library or the camera. The logo is cropped square by the
 * system editor. A cover is never edited there — `allowsEditing` ignores
 * `aspect` and returns a square — so a wide pick comes back whole, with its
 * size, for the cover cropper. A licence is never cropped, so nothing on it
 * is cut off.
 */
export function pickImage(
  source: PickSource,
  shape: 'square' | 'document',
): Promise<{ ok: true; photo: PickedPhoto } | PickFailure>;
export function pickImage(
  source: PickSource,
  shape: 'wide',
): Promise<{ ok: true; photo: PickedWidePhoto } | PickFailure>;
export async function pickImage(source: PickSource, shape: PickShape): Promise<PickResult> {
  const wide = shape === 'wide';
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: shape === 'square',
    aspect: wide ? [3, 1] : [1, 1],
    quality: shape === 'document' ? 0.8 : wide ? 1 : 0.7,
    base64: !wide,
    ...(wide ? { exif: true } : {}),
  };

  try {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'denied' };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return { ok: false, reason: 'cancelled' };

    const asset = result.assets[0];
    if (!asset?.uri) return { ok: false, reason: 'unreadable' };

    if (wide) {
      const size = await readCoverSize(asset);
      if (size.width < 1 || size.height < 1) return { ok: false, reason: 'unreadable' };
      return {
        ok: true,
        photo: {
          uri: asset.uri,
          width: size.width,
          height: size.height,
          exif: asset.exif ?? null,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
        },
      };
    }

    if (!asset.base64) return { ok: false, reason: 'unreadable' };
    return {
      ok: true,
      photo: {
        uri: asset.uri,
        base64: asset.base64,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      },
    };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** What to tell the person when no photo came back. Null for a plain cancel. */
export function pickErrorMessage(
  t: Translate,
  reason: 'cancelled' | 'denied' | 'unreadable' | 'failed',
  source: PickSource,
): string | null {
  switch (reason) {
    case 'cancelled':
      return null;
    case 'denied':
      return source === 'camera'
        ? t('clubSetup.pick.cameraDenied', { app: t('common.appName') })
        : t('clubSetup.pick.libraryDenied', { app: t('common.appName') });
    case 'unreadable':
      return t('clubSetup.pick.unreadable');
    default:
      return t('clubSetup.pick.failed');
  }
}
