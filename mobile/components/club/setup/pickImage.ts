import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import type { PickedPhoto } from '@/components/onboarding/PhotoStep';
import type { Translate } from '@/lib/i18n-bridge';

export type PickSource = 'library' | 'camera';
export type PickShape = 'square' | 'wide' | 'document';

export type PickResult =
  | { ok: true; photo: PickedPhoto }
  | { ok: false; reason: 'cancelled' | 'denied' | 'unreadable' | 'failed' };

/**
 * One photo, as base64, from the library or the camera — the same picker the
 * onboarding photo step uses. The logo is cropped square; the cover is cropped
 * wide where the platform allows it (iOS only crops squares, so there the
 * whole photo is kept and the page crops it on display); a licence is never
 * cropped, so nothing on it is cut off.
 */
export async function pickImage(source: PickSource, shape: PickShape): Promise<PickResult> {
  const editing =
    shape === 'square' ? true : shape === 'wide' ? Platform.OS !== 'ios' : false;
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: editing,
    aspect: shape === 'wide' ? [3, 1] : [1, 1],
    quality: shape === 'document' ? 0.8 : 0.7,
    base64: true,
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
    if (!asset?.base64) return { ok: false, reason: 'unreadable' };
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
