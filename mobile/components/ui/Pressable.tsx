import React, { useCallback, useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface TappableProps extends Omit<PressableProps, 'style'> {
  /** Same shape as `Pressable`'s — object, array, or `({ pressed }) => style`. */
  style?: PressableProps['style'];
  /** Layout styles for the animated wrapper (flex, alignSelf, margins). */
  containerStyle?: StyleProp<ViewStyle>;
  /** How far it presses in. Small targets want a little more. */
  scaleTo?: number;
  /** `true` is a light tap. Off by default — not every target should buzz. */
  haptic?: boolean | 'light' | 'medium' | 'selection';
  children?: React.ReactNode;
}

/**
 * The kit's general-purpose tap target: it springs in under a thumb and back
 * out on release, the way `Button` does.
 *
 * Exported as `Tappable` so it never shadows React Native's own `Pressable` at
 * a call site. Under reduce-motion the spring is replaced by an instant dim —
 * the feedback stays, the movement goes.
 */
export function Tappable({
  style,
  containerStyle,
  scaleTo = 0.96,
  haptic = false,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  children,
  ...rest
}: TappableProps) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const dim = useRef(new Animated.Value(1)).current;

  const settle = useCallback(
    (pressed: boolean) => {
      if (disabled) return;
      if (reduced) {
        scale.setValue(1);
        dim.setValue(pressed ? 0.72 : 1);
        return;
      }
      dim.setValue(1);
      Animated.spring(scale, {
        toValue: pressed ? scaleTo : 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: pressed ? 0 : 6,
      }).start();
    },
    [disabled, reduced, scale, dim, scaleTo],
  );

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      settle(true);
      onPressIn?.(e);
    },
    [settle, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      settle(false);
      onPressOut?.(e);
    },
    [settle, onPressOut],
  );

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      /* Fire the action first — the haptic is feedback, never a gate. */
      onPress?.(e);
      if (!haptic || Platform.OS === 'web') return;
      const kind = haptic === true ? 'light' : haptic;
      if (kind === 'selection') {
        Haptics.selectionAsync().catch(() => {});
      } else {
        Haptics.impactAsync(
          kind === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        ).catch(() => {});
      }
    },
    [haptic, onPress],
  );

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }], opacity: dim }]}>
      <Pressable
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
