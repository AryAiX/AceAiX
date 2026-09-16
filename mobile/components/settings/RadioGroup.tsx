import React from 'react';
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Divider, Text } from '@/components/ui';
import { useT } from '@/i18n';

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  /** One short line explaining what choosing this actually does. */
  hint?: string;
}

interface Props<T extends string> {
  options: RadioOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * A single-choice list.
 *
 * Rendered as a card of rows rather than platform radio buttons so the hint
 * text under each option has room — the hints are how a 14-year-old works out
 * what "verified coaches and clubs" means.
 */
export function RadioGroup<T extends string>({
  options,
  value,
  onChange,
  disabled,
  testID,
}: Props<T>) {
  const theme = useTheme();
  const { colors, radii, spacing, hit } = theme;
  const t = useT();

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <View key={option.value}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !!disabled }}
              accessibilityLabel={
                option.hint
                  ? t('settings.radioA11y', { label: option.label, hint: option.hint })
                  : option.label
              }
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: hit.min,
                paddingVertical: spacing.md,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{option.label}</Text>
                {option.hint ? (
                  <Text variant="caption" tone="muted" style={{ marginTop: 1 }}>
                    {option.hint}
                  </Text>
                ) : null}
              </View>

              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: selected ? 0 : 1.5,
                  borderColor: colors.borderStrong,
                  backgroundColor: selected ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected ? <Check size={15} color={colors.textOnBrand} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
