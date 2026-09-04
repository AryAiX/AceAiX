import React from 'react';
import { Pressable, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';

interface Props {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Rendered after the number, e.g. "yrs". */
  suffix?: string;
  onChange: (next: number) => void;
}

/**
 * A plain +/- stepper.
 *
 * The project stubs out reanimated, and a slider would mean another native
 * dependency for three numbers — so age and score bounds are stepped instead.
 * Each button is a 44pt target.
 */
export function Stepper({ label, hint, value, min, max, step = 1, suffix, onChange }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing, hit } = theme;
  const t = useT();

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const button = (dir: -1 | 1, icon: React.ReactNode, a11y: string) => {
    const next = clamp(value + dir * step);
    const inert = next === value;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityState={{ disabled: inert }}
        disabled={inert}
        onPress={() => onChange(next)}
        style={({ pressed }) => ({
          width: hit.min,
          height: hit.min,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
          opacity: inert ? 0.35 : pressed ? 0.6 : 1,
        })}
      >
        {icon}
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: hit.comfortable,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {button(
          -1,
          <Minus size={18} color={colors.text} />,
          t('settings.stepperDecrease', { label }),
        )}
        <View style={{ minWidth: 56, alignItems: 'center' }}>
          <Text variant="stat" accessibilityLabel={t('settings.stepperValue', { label, value })}>
            {value}
            {suffix ? (
              <Text variant="caption" tone="muted">
                {` ${suffix}`}
              </Text>
            ) : null}
          </Text>
        </View>
        {button(
          1,
          <Plus size={18} color={colors.text} />,
          t('settings.stepperIncrease', { label }),
        )}
      </View>
    </View>
  );
}
