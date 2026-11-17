import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { LogoColors } from '@/theme/tokens';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  /** The logo's fire: something to act on, like being open to offers. */
  | 'flame';

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
      fg: colors.accent,
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
    flame: {
      bg: theme.alpha(LogoColors.flame, theme.scheme === 'dark' ? 0.2 : 0.12),
      fg: theme.scheme === 'dark' ? LogoColors.flameInkDark : LogoColors.flameInk,
      solidBg: LogoColors.flame,
      solidFg: '#FFFFFF',
    },
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

/** Which colour a selected chip takes. Sport pickers are `accent` (violet);
 *  type, date, level and every other filter are `primary` (cobalt). */
export type ChipTone = 'primary' | 'accent';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  /** Drawn after the label, e.g. a ▾ on a chip that opens a picker. */
  trailing?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  tone?: ChipTone;
}

/**
 * Filter chip — tappable, with a clear selected state.
 *
 * Selected is an OUTLINE, not a fill: surface background, a 1.5pt border in
 * the tone colour and the label in the tone colour. Pass the same tone colour
 * to any `icon` you draw for the selected state.
 */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  trailing,
  disabled,
  style,
  testID,
  tone = 'primary',
}: ChipProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const toneColor = tone === 'accent' ? colors.accent : colors.primary;

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
          borderRadius: radii.button,
          borderWidth: 1.5,
          /* Dark mode: unselected chips are raised controls; a picked one
             takes a soft fill of its colour so it reads as pressed in. */
          backgroundColor: selected && theme.scheme === 'dark' ? theme.alpha(toneColor, 0.18) : colors.field,
          borderColor: selected ? toneColor : colors.fieldBorder,
          ...(selected ? null : theme.raised('control')),
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text variant="captionStrong" color={selected ? toneColor : colors.textSecondary}>
        {label}
      </Text>
      {trailing}
    </Pressable>
  );
}
