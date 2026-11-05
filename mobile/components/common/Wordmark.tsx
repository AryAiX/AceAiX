import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { LogoMark, LogoWord } from '@/components/common/Logo';

/**
 * The logotype at the top of Home: the real mark beside the real word.
 *
 * Both are the brand's own pixels. The supplied lockup stacks the mark above
 * the word, which is square and wrong for a header, so the two are laid out
 * sideways here: the mark from `logo-mark.png`, and the word clipped from the
 * themed splash lockups by `LogoWord` — dark ink on light, white on dark.
 *
 * 24pt + 14pt keeps the pair about 140pt wide, which leaves room for the
 * streak chip and both inbox buttons on a 360pt phone.
 */
export function Wordmark({ testID }: { testID?: string }) {
  const { spacing } = useTheme();

  return (
    <View
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}
      testID={testID}
      accessible
      accessibilityRole="header"
      accessibilityLabel="AceAiX"
    >
      <LogoMark size={24} />
      <LogoWord height={14} />
    </View>
  );
}
