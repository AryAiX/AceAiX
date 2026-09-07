import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { Shine, Text } from '@/components/ui';

/**
 * The logotype at the top of Home.
 *
 * It was "Ace" in flat orange beside "AiX" in the text colour — two words and
 * no object. This is a lockup: the name on the brand gradient, with the same
 * highlight that crosses the spotlight tiles below it, so the first thing on
 * the first screen is the one that looks most like the app.
 *
 * A gradient *through* the letters would need `MaskedView`, which is a native
 * module this project does not carry and would not survive the web build. The
 * gradient goes behind them instead, which costs nothing and works everywhere.
 */
export function Wordmark({ testID }: { testID?: string }) {
  const theme = useTheme();
  const { spacing, radii } = theme;

  return (
    <View style={{ flex: 1 }} testID={testID}>
      <LinearGradient
        colors={theme.gradients.action}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.md,
          paddingVertical: 5,
          borderRadius: radii.pill,
          overflow: 'hidden',
          ...theme.elevation(1),
        }}
      >
        <Text variant="subheading" color="#FFFFFF" accessibilityRole="header" numberOfLines={1}>
          AceAiX
        </Text>
        <Shine every={6} radius={radii.pill} />
      </LinearGradient>
    </View>
  );
}
