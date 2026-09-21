import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { StepHeading } from './Shared';

export interface PickedPhoto {
  uri: string;
  base64: string;
  fileName?: string | null;
  mimeType?: string | null;
}

const PICKER_OPTIONS = {
  // A square crop keeps every avatar consistent and the upload small.
  mediaTypes: ['images'] as ImagePicker.MediaType[],
  allowsEditing: true,
  aspect: [1, 1] as [number, number],
  quality: 0.7,
  base64: true,
};

export function PhotoStep({
  name,
  previewUri,
  uploading,
  error,
  onPicked,
  onError,
}: {
  name: string | null;
  /** Local file or the uploaded URL — whichever is newest. */
  previewUri: string | null;
  uploading: boolean;
  error: string | null;
  onPicked: (photo: PickedPhoto) => void;
  onError: (message: string) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const [opening, setOpening] = useState(false);

  const handleResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) {
      onError(t('onboarding.photoUnreadable'));
      return;
    }
    onPicked({
      uri: asset.uri,
      base64: asset.base64,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    });
  };

  const fromLibrary = async () => {
    if (opening || uploading) return;
    setOpening(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        onError(t('onboarding.photoLibraryDenied', { app: t('common.appName') }));
        return;
      }
      handleResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
    } catch {
      onError(t('onboarding.photoLibraryFailed'));
    } finally {
      setOpening(false);
    }
  };

  const fromCamera = async () => {
    if (opening || uploading) return;
    setOpening(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        onError(t('onboarding.photoCameraDenied', { app: t('common.appName') }));
        return;
      }
      handleResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
    } catch {
      onError(t('onboarding.photoCameraFailed'));
    } finally {
      setOpening(false);
    }
  };

  return (
    <View>
      <StepHeading
        title={t('onboarding.photoTitle')}
        subtitle={t('onboarding.photoSubtitle')}
      />

      <View style={{ alignItems: 'center', gap: spacing.xl }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Avatar uri={previewUri} name={name} size="xxl" />
          {uploading ? (
            <View
              style={{
                position: 'absolute',
                width: 112,
                height: 112,
                borderRadius: theme.radii.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.overlay,
              }}
            >
              <ActivityIndicator color={colors.textInverse} />
            </View>
          ) : null}
        </View>

        {error ? (
          <Text variant="caption" tone="danger" align="center">
            {error}
          </Text>
        ) : previewUri && !uploading ? (
          <Text variant="caption" tone="success" align="center">
            {t('onboarding.photoSaved')}
          </Text>
        ) : (
          <Text variant="caption" tone="muted" align="center" style={{ maxWidth: 300 }}>
            {t('onboarding.photoOptional')}
          </Text>
        )}

        <View style={{ alignSelf: 'stretch', gap: spacing.md }}>
          <Button
            label={t(previewUri ? 'onboarding.photoChooseAnother' : 'onboarding.photoChoose')}
            variant="secondary"
            size="lg"
            fullWidth
            loading={opening}
            disabled={uploading}
            icon={<ImagePlus size={18} color={colors.text} />}
            onPress={fromLibrary}
            testID="onboarding-photo-library"
          />
          <Button
            label={t('onboarding.photoTake')}
            variant="ghost"
            fullWidth
            disabled={uploading || opening}
            icon={<Camera size={18} color={colors.primary} />}
            onPress={fromCamera}
            testID="onboarding-photo-camera"
          />
        </View>
      </View>
    </View>
  );
}
