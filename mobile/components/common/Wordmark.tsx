import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { LogoMark } from '@/components/common/Logo';

/**
 * The logotype at the top of Home.
 *
 * It has been three things. First "Ace" in flat orange beside "AiX" in the
 * text colour — two words and no object. Then the name on a gradient pill,
 * which was better but was still the app drawing its own logo when it has one.
 *
 * This is the real mark, beside the real name. The supplied lockup stacks the
 * mark above the word, which is square and wrong for a header — at a height a
 * header can spare, the word inside it would be four pixels tall. So the
 * lockup is composed here instead: the mark from `assets/images/logo-mark.png`,
 * the name in the display face. Same two objects, laid out sideways.
 *
 * The mark carries its own colour, so it needs no light and dark variant; the
 * name takes the theme's ink with the brand accent on `AiX`, which is where
 * the lockup puts its colour too.
 */
export function Wordmark({ testID }: { testID?: string }) {
  const { spacing } = useTheme();

  return (
    <View
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      testID={testID}
      accessible
      accessibilityRole="header"
      accessibilityLabel="AceAiX"
    >
      <LogoMark size={26} />
      <Text variant="subheading" numberOfLines={1} style={{ letterSpacing: 0.2 }}>
        Ace
        <Text variant="subheading" tone="primary">
          AiX
        </Text>
      </Text>
    </View>
  );
}
