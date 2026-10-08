import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { dayParts } from '@/lib/coaching';
import { currentLanguage } from '@/lib/i18n-bridge';

export interface StripDay {
  key: string;
  date: Date;
  /** A small number under the date: free times, or bookings. Hidden when absent. */
  count?: number;
  disabled?: boolean;
}

interface Props {
  days: StripDay[];
  /** One key, or several when `multi`. */
  selected: string | string[] | null;
  onSelect: (key: string) => void;
  testID?: string;
}

/**
 * A row of days to pick from — the calendar, at the size a thumb can use.
 *
 * A month grid is the wrong shape for "which of the next two weeks": most of
 * it is days nobody can book. This shows only days that matter, in order.
 */
export function DayStrip({ days, selected, onSelect, testID }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const locale = currentLanguage();
  const isSelected = (key: string) => (Array.isArray(selected) ? selected.includes(key) : selected === key);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
      style={{ flexGrow: 0, marginHorizontal: -spacing.lg }}
      testID={testID}
    >
      {days.map((day) => {
        const on = isSelected(day.key);
        const parts = dayParts(day.date, locale);
        return (
          <Pressable
            key={day.key}
            onPress={() => onSelect(day.key)}
            disabled={day.disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled: !!day.disabled }}
            accessibilityLabel={`${parts.weekday} ${parts.day} ${parts.month}`}
            testID={testID ? `${testID}-${day.key}` : undefined}
            style={({ pressed }) => ({
              width: 58,
              paddingVertical: spacing.sm,
              borderRadius: radii.lg,
              alignItems: 'center',
              gap: 1,
              borderWidth: 1.5,
              borderColor: on ? colors.primary : colors.border,
              backgroundColor: on ? colors.primary : colors.surface,
              opacity: day.disabled ? 0.4 : pressed ? 0.7 : 1,
            })}
          >
            <Text variant="caption" color={on ? colors.textOnBrand : colors.textMuted}>
              {parts.weekday}
            </Text>
            <Text variant="subheading" color={on ? colors.textOnBrand : colors.text}>
              {parts.day}
            </Text>
            <Text variant="caption" color={on ? colors.textOnBrand : colors.textMuted}>
              {parts.month}
            </Text>
            {day.count != null ? (
              <View
                style={{
                  marginTop: 3,
                  minWidth: 20,
                  paddingHorizontal: 5,
                  height: 18,
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? 'rgba(255,255,255,0.25)' : day.count > 0 ? colors.primarySoft : colors.surfaceAlt,
                }}
              >
                <Text
                  variant="captionStrong"
                  color={on ? colors.textOnBrand : day.count > 0 ? colors.primary : colors.textMuted}
                  style={{ fontSize: 11, lineHeight: 14 }}
                >
                  {day.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
