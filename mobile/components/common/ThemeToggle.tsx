import React, { useCallback } from 'react';
import { Moon, Smartphone, Sun } from 'lucide-react-native';

import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';
import { IconButton } from '@/components/ui';
import { useT } from '@/i18n';

/**
 * One tap between light, dark and following the phone.
 *
 * Settings → Appearance has the full control with a live preview, and it stays
 * the place to explain the choice. This is the shortcut, because switching
 * theme is the one setting people change on a whim — walking outside, sitting
 * in a dark room — and three taps into a settings tree is enough friction that
 * they simply put up with the wrong one.
 *
 * The cycle is system → light → dark → system, and the icon always shows what
 * is currently in force rather than what the next tap will do; an icon that
 * predicts the future is a coin toss for the reader.
 */
const NEXT: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

export function ThemeToggle({ testID }: { testID?: string }) {
  const theme = useTheme();
  const { colors, preference, setPreference } = theme;
  const t = useT();

  const cycle = useCallback(() => setPreference(NEXT[preference]), [preference, setPreference]);

  const icon =
    preference === 'system' ? (
      <Smartphone size={20} color={colors.text} strokeWidth={1.9} />
    ) : preference === 'light' ? (
      <Sun size={20} color={colors.text} strokeWidth={1.9} />
    ) : (
      <Moon size={20} color={colors.text} strokeWidth={1.9} />
    );

  const label =
    preference === 'system'
      ? t('settings.themeSystem')
      : preference === 'light'
        ? t('settings.themeLight')
        : t('settings.themeDark');

  return (
    <IconButton
      icon={icon}
      label={`${t('settings.themeHeading')}: ${label}`}
      onPress={cycle}
      testID={testID}
    />
  );
}
