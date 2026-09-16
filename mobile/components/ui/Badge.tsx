import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  /** Solid fill instead of the soft tint. */
  solid?: boolean;
}

export function Badge({ label, tone = 'neutral', icon, size = 'sm', style, solid }: BadgeProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  const map: Record<BadgeTone, { bg: string; fg: string; solidBg: string; solidFg: string }> = {
    neutral: {
      bg: colors.surfaceAlt,
      fg: colors.textSecondary,
      solidBg: colors.textSecondary,
      solidFg: colors.surface,
    },
    primary: {
      bg: colors.primarySoft,
      fg: colors.primary,
      solidBg: colors.primary,
      solidFg: colors.textOnBrand,
    },
    accent: {
      bg: colors.accentSoft,
      fg: colors.scheme === 'dark' ? colors.accent : '#5E7A00',
      solidBg: colors.accent,
      solidFg: colors.onAccent,
    },
    info: { bg: colors.infoSoft, fg: colors.info, solidBg: colors.info, solidFg: '#FFFFFF' },
    success: {
      bg: colors.successSoft,
      fg: colors.success,
      solidBg: colors.success,
      solidFg: '#FFFFFF',
    },
    warning: {
      bg: colors.warningSoft,
      fg: colors.warning,
      solidBg: colors.warning,
      solidFg: '#14161A',
    },
    danger: { bg: colors.dangerSoft, fg: colors.danger, solidBg: colors.danger, solidFg: '#FFFFFF' },
  };

  const skin = map[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: solid ? skin.solidBg : skin.bg,
          borderRadius: radii.pill,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
          paddingVertical: size === 'sm' ? 3 : 6,
          gap: 4,
        },
        style,
      ]}
    >
      {icon}
      <Text variant={size === 'sm' ? 'overline' : 'captionStrong'} color={solid ? skin.solidFg : skin.fg}>
        {label}
      </Text>
    </View>
  );
}

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

/** Filter chip — tappable, with a clear selected state. */
export function Chip({ label, selected, onPress, icon, disabled, style, testID }: ChipProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || !onPress}
      testID={testID}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 38,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.pill,
          borderWidth: 1.5,
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text variant="captionStrong" color={selected ? colors.textOnBrand : colors.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}
