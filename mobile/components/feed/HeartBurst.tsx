import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Heart } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { NATIVE_DRIVER } from '@/lib/motion';

/**
 * The double-tap heart.
 *
 * One big heart springs up in the middle and six small ones fly outwards in the
 * play hues, then everything fades. It is driven by `trigger`: every time the
 * number changes, it plays once. Zero never plays, so a fresh mount is still.
 *
 * Under reduce-motion only the big heart appears and fades — the like is still
 * announced, nothing travels.
 */

const PARTICLES = 6;

interface Props {
  trigger: number;
  /** Size of the central heart. */
  size?: number;
}

export function HeartBurst({ trigger, size = 104 }: Props) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const spread = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger === 0) return;
    scale.setValue(reduced ? 1 : 0.3);
    opacity.setValue(0);
    spread.setValue(0);

    const animation = Animated.parallel([
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 110,
            easing: Easing.out(Easing.quad),
            useNativeDriver: NATIVE_DRIVER,
          }),
          reduced
            ? Animated.delay(0)
            : Animated.spring(scale, {
                toValue: 1.1,
                speed: 16,
                bounciness: 16,
                useNativeDriver: NATIVE_DRIVER,
              }),
        ]),
        Animated.delay(reduced ? 280 : 180),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: theme.duration.slow,
            easing: Easing.in(Easing.quad),
            useNativeDriver: NATIVE_DRIVER,
          }),
          reduced
            ? Animated.delay(0)
            : Animated.timing(scale, {
                toValue: 1.4,
                duration: theme.duration.slow,
                easing: Easing.out(Easing.quad),
                useNativeDriver: NATIVE_DRIVER,
              }),
        ]),
      ]),
      reduced
        ? Animated.delay(0)
        : Animated.timing(spread, {
            toValue: 1,
            duration: 720,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: NATIVE_DRIVER,
          }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [trigger, reduced, opacity, scale, spread, theme.duration.slow]);

  const hues = [
    theme.play.magenta,
    theme.play.flame,
    theme.play.amber,
    theme.play.violet,
    theme.play.cyan,
    theme.play.mint,
  ];

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
    >
      {reduced
        ? null
        : hues.slice(0, PARTICLES).map((hue, i) => {
            const angle = (Math.PI * 2 * i) / PARTICLES - Math.PI / 2;
            const distance = size * 0.95;
            return (
              <Animated.View
                key={hue}
                style={{
                  position: 'absolute',
                  opacity: spread.interpolate({
                    inputRange: [0, 0.15, 0.7, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    {
                      translateX: spread.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.cos(angle) * distance],
                      }),
                    },
                    {
                      translateY: spread.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, Math.sin(angle) * distance],
                      }),
                    },
                    {
                      scale: spread.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [0.2, 1, 0.6],
                      }),
                    },
                    { rotate: `${(i % 2 === 0 ? -1 : 1) * 18}deg` },
                  ],
                }}
              >
                <Heart size={size * 0.24} color={hue} fill={hue} strokeWidth={1} />
              </Animated.View>
            );
          })}

      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Heart
          size={size}
          color={theme.colors.textOnBrand}
          fill={theme.colors.primary}
          strokeWidth={1.4}
        />
      </Animated.View>
    </View>
  );
}
