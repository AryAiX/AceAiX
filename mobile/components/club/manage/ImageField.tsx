import React, { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, IconButton, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { uploadClubImage } from '@/lib/api.club';
import { errorMessage } from '@/lib/errors';

const PICKER_OPTIONS = {
  mediaTypes: ['images'] as ImagePicker.MediaType[],
  allowsEditing: true,
  aspect: [4, 3] as [number, number],
  quality: 0.7,
  base64: true,
};

/** An optional photo (a trophy, a team picture): pick, upload, show, remove. */
export function ImageField({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  testID?: string;
}) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toast.error(t('onboarding.photoLibraryDenied', { app: t('common.appName') }));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        toast.error(t('onboarding.photoUnreadable'));
        return;
      }
      const url = await uploadClubImage({
        base64: asset.base64,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      onChange(url);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.sm }} testID={testID}>
      <Text variant="captionStrong" tone="secondary">
        {label}
      </Text>
      {value ? (
        <View style={{ borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
          <Image
            source={{ uri: value }}
            resizeMode="cover"
            style={{ width: '100%', aspectRatio: 4 / 3 }}
            accessibilityIgnoresInvertColors
          />
          <View style={{ position: 'absolute', top: spacing.sm, end: spacing.sm }}>
            <IconButton
              icon={<X size={18} color={colors.text} />}
              label={t('clubManage.award.removeImage')}
              tone="surface"
              onPress={() => onChange(null)}
            />
          </View>
          {busy ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                start: 0,
                end: 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.overlay,
              }}
            >
              <ActivityIndicator color={colors.textInverse} />
            </View>
          ) : null}
        </View>
      ) : null}
      <Button
        label={t(value ? 'clubManage.award.changeImage' : 'clubManage.award.addImage')}
        variant="secondary"
        icon={<ImagePlus size={18} color={colors.text} />}
        loading={busy}
        onPress={pick}
      />
    </View>
  );
}
