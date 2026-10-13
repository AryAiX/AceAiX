import React from 'react';
import { Pressable, ScrollView } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

/**
 * Tabs that scroll sideways.
 *
 * A SegmentedControl divides the width evenly, which stops working at five
 * labels on a phone — and worse in German. These are as wide as their words
 * and the row scrolls, so a sixth tab costs nothing.
 */
export function ScrollTabs<T extends string>({ options, value, onChange, testID }: Props<T>) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
      style={{ flexGrow: 0 }}
      testID={testID}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            testID={testID ? `${testID}-${option.value}` : undefined}
            style={({ pressed }) => ({
              minHeight: 40,
              paddingHorizontal: spacing.lg,
              borderRadius: radii.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.text : colors.surfaceSunken,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text variant="captionStrong" color={selected ? colors.bg : colors.textSecondary}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
