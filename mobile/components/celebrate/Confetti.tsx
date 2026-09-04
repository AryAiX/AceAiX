import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors } from '@/theme/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Props {
  /** Number of particles. Clamped to 12–60; 30–40 is the sweet spot. */
  count?: number;
  /** Where the burst starts, in points from the top-left of the container. */
  origin?: { x: number; y: number };
  /** Overrides the theme + tier palette. */
  colors?: string[];
  /** Milliseconds from burst to the last particle leaving. */
  duration?: number;
  onDone?: () => void;
}

interface Particle {
  x: number;
  y: number;
  drift: number;
  fall: number;
  spin: number;
  size: number;
  ratio: number;
  round: boolean;
  color: string;
  delay: number;
}

const MIN_COUNT = 12;
const MAX_COUNT = 60;

/**
 * A one-shot burst of confetti.
 *
 * One shared `Animated.Value` runs 0 → 1 and every particle interpolates its
 * own path out of it. That is deliberate: 35 separate drivers means 35 things
 * the scheduler has to keep in step, whereas one driver interpolated 35 ways
 * runs entirely on the UI thread and cannot drift apart.
 *
 * Each particle is an `Animated.View` (transforms, native driver) wrapping a
 * tiny SVG shape (the paper itself). Animating SVG geometry directly would
 * force `useNativeDriver: false` and put every frame back on the JS thread.
 *
 * Renders nothing at all when Reduce Motion is on — the caller shows the same
 * information with a fade instead.
 */
export function Confetti({ count = 34, origin, colors, duration = 2200, onDone }: Props) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Held in a ref rather than read from the closure: an inline `onDone` changes
     identity on every render, and in the dependency list that would restart the
     burst from the top each time the parent re-rendered. */
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  const window = Dimensions.get('window');

  const palette = useMemo(() => {
    if (colors && colors.length > 0) return colors;
    return [
      theme.colors.primary,
      theme.colors.accent,
      theme.colors.info,
      TierColors.gold,
      TierColors.silver,
      theme.colors.success,
    ];
  }, [colors, theme.colors]);

  const particles = useMemo<Particle[]>(() => {
    const total = Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(count)));
    const startX = origin?.x ?? window.width / 2;
    const startY = origin?.y ?? window.height * 0.28;

    return Array.from({ length: total }, (_, index) => {
      const spread = window.width * 0.42;
      return {
        x: startX + (Math.random() - 0.5) * spread,
        y: startY + (Math.random() - 0.5) * 60,
        drift: (Math.random() - 0.5) * window.width * 0.5,
        fall: window.height * (0.55 + Math.random() * 0.55),
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
        size: 7 + Math.random() * 7,
        ratio: 0.4 + Math.random() * 0.5,
        round: index % 4 === 0,
        color: palette[index % palette.length],
        // Staggered so it reads as a burst rather than a curtain.
        delay: Math.random() * 0.22,
      };
    });
  }, [count, origin?.x, origin?.y, palette, window.width, window.height]);

  useEffect(() => {
    if (reduceMotion) {
      // Nothing will be drawn, so hand the moment straight back to the caller.
      done.current?.();
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    animation.start();

    /* `onDone` fires from a timer rather than the animation callback so a
       cancelled animation (unmount mid-flight) cannot call back into a screen
       that has already gone. */
    timer.current = setTimeout(() => {
      done.current?.();
    }, duration);

    return () => {
      animation.stop();
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [duration, reduceMotion, progress]);

  if (reduceMotion) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
    >
      {particles.map((particle, index) => {
        /* Every particle reads the same 0 → 1 clock, offset by its own delay,
           so the whole burst stays in step no matter how many there are. */
        const start = particle.delay;
        const clamp = { extrapolate: 'clamp' as const };

        const translateY = progress.interpolate({
          inputRange: [start, 1],
          outputRange: [0, particle.fall],
          ...clamp,
        });

        // Two-stage drift: out fast, then float. Paper does not travel straight.
        const translateX = progress.interpolate({
          inputRange: [start, start + (1 - start) * 0.35, 1],
          outputRange: [0, particle.drift * 0.75, particle.drift],
          ...clamp,
        });

        const rotate = progress.interpolate({
          inputRange: [start, 1],
          outputRange: ['0deg', `${particle.spin}deg`],
          ...clamp,
        });

        const opacity = progress.interpolate({
          inputRange: [start, start + 0.05, 0.75, 1],
          outputRange: [0, 1, 1, 0],
          ...clamp,
        });

        const width = particle.size;
        const height = particle.round ? particle.size : particle.size * particle.ratio;

        return (
          <Animated.View
            key={index}
            style={{
              position: 'absolute',
              left: particle.x,
              top: particle.y,
              width,
              height,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          >
            <Svg width={width} height={height}>
              {particle.round ? (
                <Circle cx={width / 2} cy={height / 2} r={width / 2} fill={particle.color} />
              ) : (
                <Rect
                  x={0}
                  y={0}
                  width={width}
                  height={height}
                  rx={1.5}
                  fill={particle.color}
                />
              )}
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}
