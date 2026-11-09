import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Camera, ImagePlus, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, CoverCropper, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { uploadClubImage } from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import { COVER_ASPECT, renderCoverCrop, type CoverCropRect } from '@/lib/coverCrop';
import { errorMessage } from '@/lib/errors';
import type { ClubDraft } from '@/lib/clubSetup';
import { GroupLabel } from './Bits';
import { pickErrorMessage, pickImage, type PickSource } from './pickImage';

type Kind = 'logo' | 'cover';

interface CoverPick {
  uri: string;
  width: number;
  height: number;
}

/**
 * Step 5: the logo and the cover, previewed the way the page will show them.
 * The logo uploads as soon as it is picked. The cover opens the cropper first;
 * cancel keeps the current cover, and Use photo uploads the cropped JPEG.
 * The page itself is saved when the person moves on (or taps Save on the edit screen).
 */
export function BrandingFields({
  draft,
  onChange,
  onBusyChange,
}: {
  draft: ClubDraft;
  onChange: (patch: Partial<ClubDraft>) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;
  const [busy, setBusy] = useState<Kind | null>(null);
  const [preview, setPreview] = useState<{ logo: string | null; cover: string | null }>({
    logo: null,
    cover: null,
  });
  const [coverPick, setCoverPick] = useState<CoverPick | null>(null);
  const [error, setError] = useState<string | null>(null);

  const logo = preview.logo ?? draft.logo_url;
  const cover = preview.cover ?? draft.cover_url;
  const locked = !!busy || coverPick != null;

  const choose = async (kind: Kind, source: PickSource) => {
    if (locked) return;
    setError(null);
    if (kind === 'cover') {
      const result = await pickImage(source, 'wide');
      if (!result.ok) {
        setError(pickErrorMessage(t, result.reason, source));
        return;
      }
      // The cropper confirms the frame. Cancel leaves the current cover alone.
      setCoverPick({
        uri: result.photo.uri,
        width: result.photo.width,
        height: result.photo.height,
      });
      return;
    }

    const result = await pickImage(source, 'square');
    if (!result.ok) {
      setError(pickErrorMessage(t, result.reason, source));
      return;
    }
    setPreview((p) => ({ ...p, logo: result.photo.uri }));
    setBusy('logo');
    onBusyChange?.(true);
    try {
      const url = await uploadClubImage({
        base64: result.photo.base64,
        fileName: result.photo.fileName,
        mimeType: result.photo.mimeType,
      });
      onChange({ logo_url: url });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPreview((p) => ({ ...p, logo: null }));
      setBusy(null);
      onBusyChange?.(false);
    }
  };

  const onUseCover = async (crop: CoverCropRect) => {
    const picked = coverPick;
    setCoverPick(null);
    if (!picked) return;
    setError(null);
    setBusy('cover');
    onBusyChange?.(true);
    try {
      const cropped = await renderCoverCrop(picked.uri, crop, { base64: true });
      if (!cropped.base64) {
        setError(t('clubSetup.pick.unreadable'));
        return;
      }
      setPreview((p) => ({ ...p, cover: cropped.uri }));
      const url = await uploadClubImage({
        base64: cropped.base64,
        fileName: 'cover.jpg',
        mimeType: 'image/jpeg',
      });
      onChange({ cover_url: url });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPreview((p) => ({ ...p, cover: null }));
      setBusy(null);
      onBusyChange?.(false);
    }
  };

  const remove = (kind: Kind) => {
    setError(null);
    onChange(kind === 'logo' ? { logo_url: null } : { cover_url: null });
  };

  const spinner = (
    <View
      style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.overlay,
      }}
    >
      <ActivityIndicator color={colors.textInverse} />
    </View>
  );

  const controls = (kind: Kind, has: boolean) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Button
        label={has ? t('clubSetup.branding.change') : t('clubSetup.branding.choose')}
        variant="secondary"
        size="sm"
        disabled={locked}
        icon={<ImagePlus size={16} color={colors.text} />}
        onPress={() => void choose(kind, 'library')}
        accessibilityLabel={kind === 'logo' ? t('clubSetup.branding.chooseLogoA11y') : t('clubSetup.branding.chooseCoverA11y')}
        testID={`club-setup-${kind}-library`}
      />
      <Button
        label={t('clubSetup.branding.camera')}
        variant="ghost"
        size="sm"
        disabled={locked}
        icon={<Camera size={16} color={colors.primary} />}
        onPress={() => void choose(kind, 'camera')}
        accessibilityLabel={kind === 'logo' ? t('clubSetup.branding.cameraLogoA11y') : t('clubSetup.branding.cameraCoverA11y')}
        testID={`club-setup-${kind}-camera`}
      />
      {has ? (
        <Button
          label={t('clubSetup.branding.remove')}
          variant="ghost"
          size="sm"
          disabled={locked}
          icon={<X size={16} color={colors.primary} />}
          onPress={() => remove(kind)}
          accessibilityLabel={kind === 'logo' ? t('clubSetup.branding.removeLogoA11y') : t('clubSetup.branding.removeCoverA11y')}
        />
      ) : null}
    </View>
  );

  return (
    <View style={{ gap: spacing.xl }}>
      {/* The preview: cover, with the logo lapping onto it, as on the page. */}
      <View
        accessible
        accessibilityLabel={t('clubSetup.branding.previewA11y')}
        style={{
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: '100%', aspectRatio: COVER_ASPECT, backgroundColor: colors.surfaceAlt }}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text variant="caption" tone="muted">
                {t('clubSetup.branding.noCover')}
              </Text>
            </View>
          )}
          {busy === 'cover' ? spinner : null}
        </View>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm }}>
          <View style={{ marginTop: -spacing.xxxl, alignSelf: 'flex-start' }}>
            <ClubLogo uri={logo} name={draft.name} size="lg" style={{ borderWidth: 3, borderColor: colors.surface }} />
            {busy === 'logo' ? spinner : null}
          </View>
          <Text variant="subheading" numberOfLines={2}>
            {draft.name.trim() || t('clubSetup.branding.namePlaceholder')}
          </Text>
          <Text variant="caption" tone="muted">
            {[clubLabel(t, 'type', draft.type), draft.city.trim()].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <GroupLabel hint={t('clubSetup.branding.logoHint')}>{t('clubSetup.branding.logoTitle')}</GroupLabel>
        {controls('logo', !!draft.logo_url)}
      </View>
      <View style={{ gap: spacing.sm }}>
        <GroupLabel hint={t('clubSetup.branding.coverHint')}>{t('clubSetup.branding.coverTitle')}</GroupLabel>
        {controls('cover', !!draft.cover_url)}
      </View>

      <CoverCropper
        visible={coverPick != null}
        uri={coverPick?.uri ?? null}
        width={coverPick?.width ?? 0}
        height={coverPick?.height ?? 0}
        onCancel={() => setCoverPick(null)}
        onConfirm={(crop) => void onUseCover(crop)}
      />
    </View>
  );
}
