import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { currentLanguage, tr, type Translate } from '@/lib/i18n-bridge';

/**
 * Day helpers shared by the thread.
 *
 * Everything compares *local* calendar days, not UTC: a message sent at
 * 00:30 in Madrid belongs to that day for the person reading it, whatever the
 * database stored.
 *
 * `dayLabel` takes a translator so the component can hand it the live one from
 * context and re-render the moment the language changes; called without one it
 * falls back to the translator bridge, like the formatters in `lib/format`.
 */
function localDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function sameDay(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const keyA = localDayKey(a);
  return keyA !== '' && keyA === localDayKey(b);
}

/** Used when `dayLabel` is called from outside React. */
const bridgeTranslate: Translate = (key) =>
  tr(key, key === 'common.yesterday' ? 'Yesterday' : 'Today');

export function dayLabel(
  iso: string,
  t: Translate = bridgeTranslate,
  language: string = currentLanguage(),
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (localDayKey(iso) === localDayKey(now.toISOString())) {
    return t('common.today');
  }
  if (localDayKey(iso) === localDayKey(yesterday.toISOString())) {
    return t('common.yesterday');
  }

  const withinAWeek = now.getTime() - d.getTime() < 6 * 86_400_000;
  if (withinAWeek) {
    return d.toLocaleDateString(language, { weekday: 'long' });
  }

  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(
    language,
    sameYear
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' },
  );
}

export function DaySeparator({ iso }: { iso: string }) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const { t, language } = useI18n();
  const label = dayLabel(iso, t, language);

  if (!label) return null;

  return (
    <View
      style={{
        alignItems: 'center',
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
      }}
    >
      <View
        style={{
          backgroundColor: colors.surfaceAlt,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
        }}
      >
        <Text variant="overline" tone="muted" accessibilityRole="header">
          {label}
        </Text>
      </View>
    </View>
  );
}
