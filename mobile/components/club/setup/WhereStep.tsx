import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { MapPin, Plus, Trash2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, IconButton, Input, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { CityPicker } from '@/components/onboarding/CityPicker';
import { CountryPicker } from '@/components/onboarding/Shared';
import {
  LIMITS,
  clubMapOpenUrl,
  formatPin,
  newBranch,
  readMapPin,
  type BranchDraft,
  type ClubDraft,
  type WhereError,
} from '@/lib/clubSetup';
import { GroupLabel } from './Bits';

/** Step 2: where the club is, an optional map pin, and any other grounds. */
export function WhereFields({
  draft,
  errors,
  onChange,
}: {
  draft: ClubDraft;
  errors: Partial<Record<WhereError, true>>;
  onChange: (patch: Partial<ClubDraft>) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;

  const saved = readMapPin(draft.pin);
  const pinTyped = draft.pin.trim().length > 0;
  const point =
    saved && saved.latitude != null && saved.longitude != null
      ? { latitude: saved.latitude, longitude: saved.longitude }
      : null;
  const openUrl = clubMapOpenUrl({
    mapUrl: saved?.mapUrl ?? null,
    latitude: saved?.latitude ?? null,
    longitude: saved?.longitude ?? null,
    address: draft.address,
    city: draft.city,
    country: draft.country,
  });

  const setBranch = (key: string, patch: Partial<BranchDraft>) =>
    onChange({ branches: draft.branches.map((b) => (b.key === key ? { ...b, ...patch } : b)) });

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.xs }}>
        <CountryPicker
          value={draft.country}
          onChange={(country) => {
            // A city belongs to the country it was picked under. Loading a
            // saved page sets both at once; only a tap here is a change.
            if (country === draft.country) {
              onChange({ country });
              return;
            }
            onChange({
              country,
              city: '',
              branches: draft.branches.map((branch) =>
                branch.country && branch.country !== draft.country
                  ? branch
                  : { ...branch, country, city: '' },
              ),
            });
          }}
          label={t('clubSetup.where.countryLabel')}
        />
        {errors.country ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {t('clubSetup.where.countryRequired')}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing.xs }}>
        <CityPicker
          country={draft.country}
          value={draft.city}
          onChange={(city) => onChange({ city })}
          label={t('clubSetup.where.cityLabel')}
          testID="club-setup-city"
        />
        {errors.city ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {t('clubSetup.where.cityRequired')}
          </Text>
        ) : null}
      </View>
      <Input
        label={t('clubSetup.where.addressLabel')}
        value={draft.address}
        onChangeText={(address) => onChange({ address })}
        placeholder={t('clubSetup.where.addressPlaceholder')}
        maxLength={LIMITS.address}
        testID="club-setup-address"
      />

      <View style={{ gap: spacing.sm }}>
        <Input
          label={t('clubSetup.where.pinLabel')}
          value={draft.pin}
          onChangeText={(pin) => onChange({ pin })}
          placeholder={t('clubSetup.where.pinPlaceholder')}
          hint={pinTyped ? undefined : t('clubSetup.where.pinHint')}
          error={errors.pin || (pinTyped && !saved) ? t('clubSetup.where.pinInvalid') : null}
          autoCapitalize="none"
          autoCorrect={false}
          icon={<MapPin size={18} color={colors.textMuted} />}
          testID="club-setup-pin"
        />
        {openUrl ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
            {point ? (
              <Text variant="captionStrong" tone="success">
                {t('clubSetup.where.pinParsed', { pin: formatPin(point.latitude, point.longitude) })}
              </Text>
            ) : null}
            <Pressable
              onPress={() => void Linking.openURL(openUrl).catch(() => {})}
              accessibilityRole="link"
              accessibilityLabel={t('clubSetup.where.checkOnMap')}
              hitSlop={8}
              style={({ pressed }) => ({
                minHeight: theme.hit.min,
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text variant="captionStrong" tone="primary">
                {t('clubSetup.where.checkOnMap')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.md }}>
        <GroupLabel hint={t('clubSetup.where.branchesHint')}>{t('clubSetup.where.branchesTitle')}</GroupLabel>

        {draft.branches.map((branch, index) => (
          <Card key={branch.key} tone="alt" padded="sm" style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text variant="captionStrong" style={{ flex: 1 }}>
                {t('clubSetup.where.branchNumber', { n: index + 1 })}
              </Text>
              <IconButton
                icon={<Trash2 size={18} color={colors.danger} />}
                label={t('clubSetup.where.removeBranch', { n: index + 1 })}
                tone="transparent"
                onPress={() => onChange({ branches: draft.branches.filter((b) => b.key !== branch.key) })}
              />
            </View>
            <Input
              label={t('clubSetup.where.branchLabel')}
              value={branch.label}
              onChangeText={(label) => setBranch(branch.key, { label })}
              placeholder={t('clubSetup.where.branchLabelPlaceholder')}
              maxLength={LIMITS.branchLabel}
            />
            <CityPicker
              country={branch.country ?? draft.country}
              value={branch.city}
              onChange={(city) => setBranch(branch.key, { city })}
              label={t('clubSetup.where.cityLabel')}
              testID={`club-setup-branch-city-${index}`}
            />
            <Input
              label={t('clubSetup.where.addressLabel')}
              value={branch.address}
              onChangeText={(address) => setBranch(branch.key, { address })}
              placeholder={t('clubSetup.where.addressPlaceholder')}
              maxLength={LIMITS.address}
            />
          </Card>
        ))}

        {draft.branches.length < LIMITS.branches ? (
          <Button
            label={t('clubSetup.where.addBranch')}
            variant="secondary"
            icon={<Plus size={16} color={colors.text} />}
            onPress={() => onChange({ branches: [...draft.branches, newBranch(draft.country)] })}
            testID="club-setup-add-branch"
          />
        ) : (
          <Text variant="caption" tone="muted">
            {t('clubSetup.where.branchesMax', { n: LIMITS.branches })}
          </Text>
        )}
      </View>
    </View>
  );
}
