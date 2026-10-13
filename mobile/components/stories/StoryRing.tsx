import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { NATIVE_DRIVER } from '@/lib/motion';

/**
 * The ring around a story avatar.
 *
 * Unseen: the action → party sweep, turning slowly so the rail reads as live.
 * The gradient is a square rotating inside a circular mask, which is the one
 * way to animate a sweep without animating its stops. Seen: a thin muted line.
 * None: no ring at all, the same footprint.
 */

export type RingState = 'unseen' | 'seen' | 'none';

interface Props {
  size: number;
  state: RingState;
  children: React.ReactNode;
  /** Ring thickness. */
  thickness?: number;
}

export function StoryRing({ size, state, children, thickness = 3 }: Props) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const spin = useRef(new Animated.Value(0)).current;

  const spinning = state === 'unseen' && !reduced;

  useEffect(() => {
    if (!spinning) {
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 5200,
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin, spinning]);

  const gap = 2;
  const inner = size - thickness * 2;
  /* A rotating square has to cover the circle at every angle: √2 × size. */
  const sweep = Math.ceil(size * 1.42);
  const { action, party } = theme.gradients;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {state === 'unseen' ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: sweep,
            height: sweep,
            transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
          }}
        >
          <LinearGradient
            colors={[action[0], action[1], party[1], party[2]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : state === 'seen' ? (
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFill,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: theme.colors.borderStrong,
          }}
        />
      ) : null}

      {/* The gap between ring and photo is the screen colour, which is what
          makes the ring read as a ring. Wrapped so it paints above the
          absolutely-positioned sweep on the web. */}
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: theme.colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: inner - gap * 2,
            height: inner - gap * 2,
            borderRadius: (inner - gap * 2) / 2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}
