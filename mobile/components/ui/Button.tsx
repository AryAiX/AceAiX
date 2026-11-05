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
import { NATIVE_DRIVER } from '@/lib/motion';
import { Text } from './Text';

export type ButtonVariant =
  | 'primary'   // flat cobalt — the default
  | 'gradient'  // the blue ombre: at most one per screen
  | 'warm'      // the warm ombre: stakes only (Ask for sponsorship, challenges, streaks)
  | 'soft'      // soft blue fill, cobalt text: Follow, View, Apply in lists, Post a game
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'accent';
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
  const shouldHaptic =
    haptic ??
    (variant === 'primary' || variant === 'gradient' || variant === 'warm' || variant === 'accent');

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
    /* Flat cobalt. One flat colour is the rule; the ombre is the exception. */
    primary: {
      bg: colors.primary,
      border: 'transparent',
      fg: colors.textOnBrand,
      pressedBg: colors.primaryPressed,
    },
    /* The blue ombre — the + on tab screens, or the one main button on any
       other screen (Apply, Post, Create account…). `bg`/`pressedBg` show
       through the gradient when it dims on press. */
    gradient: {
      bg: colors.primary,
      border: 'transparent',
      fg: colors.textOnBrand,
      pressedBg: colors.primaryPressed,
    },
    /* The warm ombre — stakes only. */
    warm: {
      bg: colors.warning,
      border: 'transparent',
      fg: colors.textOnBrand,
      pressedBg: colors.warning,
    },
    /* Soft blue fill with cobalt text, no shadow — small list actions. */
    soft: {
      bg: colors.primarySoft,
      border: 'transparent',
      fg: colors.primary,
      pressedBg: colors.primaryBorder,
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

  /* Only the two ombre variants paint a gradient. Gradient underneath,
     transparent fill on top; the pressed state dims it so the press still
     reads. Everything else is one flat colour. */
  const gradient =
    variant === 'gradient'
      ? theme.gradients.action
      : variant === 'warm'
        ? theme.gradients.warm
        : null;

  const animate = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: NATIVE_DRIVER,
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
            borderRadius: radii.button,
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
