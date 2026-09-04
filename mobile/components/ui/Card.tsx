import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, View, ViewProps, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props extends ViewProps {
  /** 0 = flat with border, 1–3 = raised. */
  level?: 0 | 1 | 2 | 3;
  padded?: boolean | 'sm' | 'lg';
  tone?: 'surface' | 'alt' | 'sunken' | 'primarySoft' | 'accentSoft';
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  radius?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Card({
  level = 0,
  padded = true,
  tone = 'surface',
  radius = 'lg',
  onPress,
  style,
  children,
  ...rest
}: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  /* A card is a big surface, so it takes almost nothing to read as pressed —
     0.985 is felt more than seen. */
  const press = useCallback(
    (pressed: boolean) => {
      if (reduced) {
        scale.setValue(1);
        return;
      }
      Animated.spring(scale, {
        toValue: pressed ? 0.985 : 1,
        useNativeDriver: true,
        speed: 45,
        bounciness: pressed ? 0 : 5,
      }).start();
    },
    [reduced, scale],
  );

  const bg = {
    surface: colors.surface,
    alt: colors.surfaceAlt,
    sunken: colors.surfaceSunken,
    primarySoft: colors.primarySoft,
    accentSoft: colors.accentSoft,
  }[tone];

  const pad =
    padded === false ? 0 : padded === 'sm' ? spacing.md : padded === 'lg' ? spacing.xl : spacing.lg;

  const base: ViewStyle = {
    backgroundColor: bg,
    borderRadius: radii[radius],
    padding: pad,
    borderWidth: level === 0 ? 1 : 0,
    borderColor: colors.border,
    ...theme.elevation(level),
  };

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          onPressIn={() => press(true)}
          onPressOut={() => press(false)}
          style={({ pressed }) => [
            base,
            pressed && { opacity: reduced ? 0.85 : 0.94 },
            style as ViewStyle,
          ]}
          {...rest}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={[base, style as ViewStyle]} {...rest}>
      {children}
    </View>
  );
}
