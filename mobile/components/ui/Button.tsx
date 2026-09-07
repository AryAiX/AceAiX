import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: ViewStyle;
  /** Fire a light haptic tap on press. Defaults to true for primary actions. */
  haptic?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconRight,
  style,
  haptic,
  disabled,
  onPress,
  ...rest
}: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const scale = useRef(new Animated.Value(1)).current;

  const isDisabled = disabled || loading;
  const shouldHaptic = haptic ?? (variant === 'primary' || variant === 'accent');

  const heights: Record<ButtonSize, number> = { sm: 40, md: 52, lg: 58 };
  const paddings: Record<ButtonSize, number> = {
    sm: spacing.lg,
    md: spacing.xl,
    lg: spacing.xxl,
  };

  const skins: Record<
    ButtonVariant,
    { bg: string; border: string; fg: string; pressedBg: string }
  > = {
    primary: {
      bg: colors.primary,
      border: 'transparent',
      fg: colors.textOnBrand,
      pressedBg: colors.primaryPressed,
    },
    accent: {
      bg: colors.accent,
      border: 'transparent',
      fg: colors.onAccent,
      pressedBg: colors.accent,
    },
    secondary: {
      bg: colors.surfaceAlt,
      border: colors.border,
      fg: colors.text,
      pressedBg: colors.surfaceSunken,
    },
    ghost: {
      bg: 'transparent',
      border: 'transparent',
      fg: colors.primary,
      pressedBg: colors.primarySoft,
    },
    danger: {
      bg: colors.dangerSoft,
      border: colors.danger,
      fg: colors.danger,
      pressedBg: colors.dangerSoft,
    },
  };

  const skin = skins[variant];

  /* The primary action is the one thing on most screens that has permission to
     be loud, and a flat fill wastes it. Gradient underneath, transparent fill
     on top; the pressed state stays a flat colour so the press still reads. */
  const gradient = variant === 'primary' ? theme.gradients.action : null;

  const animate = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled, busy: loading }}
        accessibilityLabel={label}
        disabled={isDisabled}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        onPress={(e) => {
          if (shouldHaptic && Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          onPress?.(e);
        }}
        style={({ pressed }) => [
          styles.base,
          {
            height: heights[size],
            paddingHorizontal: paddings[size],
            borderRadius: radii.pill,
            backgroundColor: gradient ? skin.pressedBg : pressed ? skin.pressedBg : skin.bg,
            borderColor: skin.border,
            borderWidth: skin.border === 'transparent' ? 0 : 1.5,
            opacity: isDisabled ? 0.45 : 1,
            overflow: 'hidden',
          },
        ]}
        {...rest}
      >
        {({ pressed }: { pressed: boolean }) => (
          <>
            {gradient ? (
              /* Dimmed rather than swapped on press: a gradient that vanished
                 for a flat colour would read as a different button. */
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { opacity: pressed ? 0.82 : 1 }]}
                pointerEvents="none"
              />
            ) : null}
            {loading ? (
              <ActivityIndicator color={skin.fg} size="small" />
            ) : (
              <View style={styles.content}>
                {icon ? <View style={{ marginRight: spacing.sm }}>{icon}</View> : null}
                <Text
                  variant={size === 'sm' ? 'captionStrong' : 'subheading'}
                  color={skin.fg}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                {iconRight ? <View style={{ marginLeft: spacing.sm }}>{iconRight}</View> : null}
              </View>
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
