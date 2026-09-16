import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Heart, MessageCircle } from 'lucide-react-native';

import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';
import { Avatar, Badge, Card, Header, Screen, SegmentedControl, Text } from '@/components/ui';
import { SettingsIntro } from '@/components/settings/Notes';
import { useI18n, useT } from '@/i18n';
import { levelLabelI18n, positionLabel } from '@/constants/sports';
import { metaLine } from '@/lib/format';

/** The stored preference never changes; only the word on the control does. */
const OPTION_KEYS: { value: ThemePreference; labelKey: string }[] = [
  { value: 'system', labelKey: 'settings.themeSystem' },
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
];

/**
 * A miniature of a feed post.
 *
 * It is built from the live theme rather than a screenshot, so switching the
 * segmented control above repaints it immediately — which is the whole point of
 * showing it.
 */
function PreviewPost() {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const { formatNumber } = useI18n();

  return (
    <Card level={1} padded="sm">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={t('settings.previewName')} size="sm" score={78} />
        <View style={{ flex: 1 }}>
          <Text variant="captionStrong" numberOfLines={1}>
            {t('settings.previewName')}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {metaLine(
              positionLabel(t, 'Winger'),
              levelLabelI18n(t, 'academy'),
              t('settings.previewCity'),
            )}
          </Text>
        </View>
        <Badge
          label={t('settings.previewBadge', {
            tier: t('common.tierGold'),
            score: formatNumber(78),
          })}
          tone="accent"
        />
      </View>

      <Text variant="caption" tone="secondary" style={{ marginTop: spacing.md }}>
        {t('settings.previewPost')}
      </Text>

      <View
        style={{
          height: 72,
          borderRadius: radii.sm,
          backgroundColor: colors.surfaceSunken,
          marginTop: spacing.md,
        }}
      />

      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Heart size={15} color={colors.primary} fill={colors.primary} />
          <Text variant="caption" tone="muted">
            {formatNumber(124)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <MessageCircle size={15} color={colors.textMuted} />
          <Text variant="caption" tone="muted">
            {formatNumber(18)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function AppearanceScreen() {
  const theme = useTheme();
  const { spacing, preference, setPreference, scheme } = theme;
  const t = useT();

  const options = useMemo(
    () => OPTION_KEYS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );

  /* Four separate sentences rather than one with the mode slotted in: the word
     for "light" changes shape inside a sentence in several of our languages. */
  const note =
    preference === 'system'
      ? scheme === 'dark'
        ? t('settings.themeSystemNoteDark')
        : t('settings.themeSystemNoteLight')
      : preference === 'dark'
        ? t('settings.themeAlwaysDark')
        : t('settings.themeAlwaysLight');

  return (
    <Screen
      header={<Header title={t('settings.appearanceTitle')} back bordered />}
      testID="settings-appearance"
    >
      <View style={{ paddingTop: spacing.lg, gap: spacing.xl }}>
        <View style={{ gap: spacing.md }}>
          <SettingsIntro title={t('settings.themeHeading')} body={t('settings.themeBody')} />
          <SegmentedControl
            options={options}
            value={preference}
            onChange={setPreference}
            testID="theme-segmented"
          />
        </View>

        <View style={{ gap: spacing.md }}>
          <Text variant="overline" tone="muted">
            {t('settings.preview')}
          </Text>
          <PreviewPost />
          <Text variant="caption" tone="muted">
            {note}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
