import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

/**
 * Text tabs with an underline under the open one, over a hairline.
 *
 * Lighter than a switch, so a screen's tabs read as pages of one list rather
 * than as a setting. `color` paints the underline; it defaults to cobalt.
 */
export function TextTabs<T extends string>({
  options,
  value,
  onChange,
  color,
  testID,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  color?: string;
  testID?: string;
}) {
  const { colors, spacing } = useTheme();
  const line = color ?? colors.primary;

  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      style={{
        flexDirection: 'row',
        gap: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            testID={testID ? `${testID}-${opt.value}` : undefined}
            hitSlop={{ top: 8, bottom: 0, left: 8, right: 8 }}
            style={{ paddingVertical: spacing.sm, minHeight: 40, justifyContent: 'center' }}
          >
            <Text variant="bodyStrong" color={active ? colors.text : colors.textMuted}>
              {opt.label}
            </Text>
            {/* The underline sits on the hairline, so it reads as part of it. */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -1,
                height: 2,
                borderRadius: 1,
                backgroundColor: active ? line : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
