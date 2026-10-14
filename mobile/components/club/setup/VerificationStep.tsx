import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, FileCheck2, FileUp } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Input, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { CheckboxRow } from '@/components/onboarding/Shared';
import { InfoNote } from '@/components/settings/Notes';
import { uploadClubDocument } from '@/lib/api.club';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { LIMITS, type VerificationDraft } from '@/lib/clubSetup';
import { pickErrorMessage, pickImage, type PickSource } from './pickImage';

export type VerificationError = 'name' | 'terms';

/** The checks `submitClubVerification` would make, before the round trip. */
export function verificationErrors(v: VerificationDraft): Partial<Record<VerificationError, true>> {
  const out: Partial<Record<VerificationError, true>> = {};
  if (v.contact_person_name.trim().length < 2) out.name = true;
  if (!v.accept_terms) out.terms = true;
  return out;
}

/**
 * Step 6: the papers. The licence photo goes to a private bucket and only its
 * storage path is kept — nothing here ever shows a public link to it.
 */
export function VerificationFields({
  value,
  errors,
  onChange,
  onBusyChange,
  showIntro = true,
}: {
  value: VerificationDraft;
  errors: Partial<Record<VerificationError, true>>;
  onChange: (patch: Partial<VerificationDraft>) => void;
  onBusyChange?: (busy: boolean) => void;
  showIntro?: boolean;
}) {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const { colors, radii, spacing } = theme;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attach = async (source: PickSource) => {
    if (uploading) return;
    setError(null);
    const result = await pickImage(source, 'document');
    if (!result.ok) {
      setError(pickErrorMessage(t, result.reason, source));
      return;
    }
    setUploading(true);
    onBusyChange?.(true);
    try {
      const path = await uploadClubDocument({
        base64: result.photo.base64,
        fileName: result.photo.fileName,
        mimeType: result.photo.mimeType,
      });
      onChange({ document_path: path });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  const attached = !!value.document_path;
  const onFile = !attached && value.has_document;

  // No variables: the placeholders survive so they can become links.
  const termsParts = t('clubSetup.verify.termsLine').split(/(\{\{terms\}\}|\{\{childSafety\}\})/);

  return (
    <View style={{ gap: spacing.xl }}>
      {showIntro ? (
        <InfoNote tone="info" icon="shield">
          {t('clubSetup.verify.why')}
        </InfoNote>
      ) : null}

      <Input
        label={t('clubSetup.verify.nameLabel')}
        required
        value={value.contact_person_name}
        onChangeText={(contact_person_name) => onChange({ contact_person_name })}
        placeholder={t('clubSetup.verify.namePlaceholder')}
        error={errors.name ? t('clubSetup.verify.nameRequired') : null}
        maxLength={LIMITS.personName}
        autoCapitalize="words"
        testID="club-verify-name"
      />
      <Input
        label={t('clubSetup.verify.titleLabel')}
        value={value.contact_person_title}
        onChangeText={(contact_person_title) => onChange({ contact_person_title })}
        placeholder={t('clubSetup.verify.titlePlaceholder')}
        maxLength={LIMITS.personTitle}
        testID="club-verify-title"
      />
      <Input
        label={t('clubSetup.verify.licenceLabel')}
        value={value.license_number}
        onChangeText={(license_number) => onChange({ license_number })}
        placeholder={t('clubSetup.verify.licencePlaceholder')}
        maxLength={LIMITS.licence}
        autoCapitalize="characters"
        autoCorrect={false}
        testID="club-verify-licence"
      />

      <Card tone="alt" style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radii.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: attached || onFile ? colors.successSoft : colors.surface,
            }}
          >
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : attached || onFile ? (
              <FileCheck2 size={20} color={colors.success} />
            ) : (
              <FileUp size={20} color={colors.textMuted} />
            )}
          </View>
          <View style={{ flex: 1, gap: theme.spacing.xxs }}>
            <Text variant="captionStrong" accessibilityLiveRegion="polite">
              {uploading
                ? t('clubSetup.verify.docUploading')
                : attached
                  ? t('clubSetup.verify.docAttached')
                  : onFile
                    ? t('clubSetup.verify.docOnFile')
                    : t('clubSetup.verify.docTitle')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('clubSetup.verify.docHint')}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button
            label={attached || onFile ? t('clubSetup.verify.docReplace') : t('clubSetup.verify.docChoose')}
            variant="secondary"
            size="sm"
            disabled={uploading}
            icon={<FileUp size={16} color={colors.text} />}
            onPress={() => void attach('library')}
            testID="club-verify-doc-library"
          />
          <Button
            label={t('clubSetup.verify.docCamera')}
            variant="ghost"
            size="sm"
            disabled={uploading}
            icon={<Camera size={16} color={colors.primary} />}
            onPress={() => void attach('camera')}
            accessibilityLabel={t('clubSetup.verify.docCameraA11y')}
            testID="club-verify-doc-camera"
          />
        </View>
        {error ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </Card>

      <View style={{ gap: spacing.xs }}>
        <CheckboxRow
          checked={value.accept_terms}
          onToggle={() => onChange({ accept_terms: !value.accept_terms })}
          label={t('clubSetup.verify.termsA11y')}
        >
          <Text variant="caption" tone="secondary">
            {termsParts.map((part, index) => {
              if (part === '{{terms}}') {
                return (
                  <Text
                    key={index}
                    variant="captionStrong"
                    tone="primary"
                    accessibilityRole="link"
                    onPress={() => router.push(Routes.terms)}
                  >
                    {t('clubSetup.verify.termsLink')}
                  </Text>
                );
              }
              if (part === '{{childSafety}}') {
                return (
                  <Text
                    key={index}
                    variant="captionStrong"
                    tone="primary"
                    accessibilityRole="link"
                    onPress={() => router.push(Routes.childSafety)}
                  >
                    {t('clubSetup.verify.childSafetyLink')}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
        </CheckboxRow>
        {errors.terms ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {t('clubSetup.verify.termsRequired')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
