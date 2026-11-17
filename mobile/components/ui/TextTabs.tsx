import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

/**
 * Text tabs with an underline under the open one, over a hairline.
 *
 * Each tab takes an equal share of the width and centres its label. A long
 * label wraps onto a second line, or shrinks slightly, instead of being cut
 * off. `color` paints the underline; it defaults to cobalt.
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
        alignSelf: 'stretch',
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
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.xs,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              variant="bodyStrong"
              color={active ? colors.text : colors.textMuted}
              align="center"
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{ width: '100%' }}
            >
              {opt.label}
            </Text>
            {/* The underline sits on the hairline and spans this tab. */}
            <View
              style={{
                position: 'absolute',
                start: 0,
                end: 0,
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
