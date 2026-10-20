import React, { useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { Camera, ImagePlus, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { uploadClubImage } from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import { errorMessage } from '@/lib/errors';
import type { ClubDraft } from '@/lib/clubSetup';
import { GroupLabel } from './Bits';
import { pickErrorMessage, pickImage, type PickSource } from './pickImage';

type Kind = 'logo' | 'cover';

/** Matches the club page's own cover. */
const COVER_HEIGHT = 128;

/**
 * Step 5: the logo and the cover, previewed the way the page will show them.
 * Each picture is uploaded as soon as it is picked; the page itself is saved
 * when the person moves on (or taps Save on the edit screen).
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
  const [error, setError] = useState<string | null>(null);

  const logo = preview.logo ?? draft.logo_url;
  const cover = preview.cover ?? draft.cover_url;

  const choose = async (kind: Kind, source: PickSource) => {
    if (busy) return;
    setError(null);
    const result = await pickImage(source, kind === 'logo' ? 'square' : 'wide');
    if (!result.ok) {
      setError(pickErrorMessage(t, result.reason, source));
      return;
    }
    setPreview((p) => ({ ...p, [kind]: result.photo.uri }));
    setBusy(kind);
    onBusyChange?.(true);
    try {
      const url = await uploadClubImage({
        base64: result.photo.base64,
        fileName: result.photo.fileName,
        mimeType: result.photo.mimeType,
      });
      onChange(kind === 'logo' ? { logo_url: url } : { cover_url: url });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPreview((p) => ({ ...p, [kind]: null }));
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
        disabled={!!busy}
        icon={<ImagePlus size={16} color={colors.text} />}
        onPress={() => void choose(kind, 'library')}
        accessibilityLabel={kind === 'logo' ? t('clubSetup.branding.chooseLogoA11y') : t('clubSetup.branding.chooseCoverA11y')}
        testID={`club-setup-${kind}-library`}
      />
      <Button
        label={t('clubSetup.branding.camera')}
        variant="ghost"
        size="sm"
        disabled={!!busy}
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
          disabled={!!busy}
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
        <View style={{ height: COVER_HEIGHT, backgroundColor: colors.surfaceAlt }}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              resizeMode="cover"
              style={{ width: '100%', height: '100%' }}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
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
    </View>
  );
}
