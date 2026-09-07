import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The motion kit.
 *
 * Three things, used everywhere, so that "the app moves" is a property of the
 * design system rather than of whichever screen someone remembered to animate.
 * All three collapse to a still frame under reduce-motion — not to *nothing*,
 * to the finished state, immediately.
 *
 * `react-native-reanimated` is stubbed out in this project, so everything here
 * is RN's own `Animated`, native-driven wherever the property allows it.
 */

// ── Reveal ────────────────────────────────────────────────────────────────────
interface RevealProps {
  children: React.ReactNode;
  /** Position in a list. Each index waits 55ms longer than the one before. */
  index?: number;
  /** Extra delay in ms, on top of the index stagger. */
  delay?: number;
  /** Where it comes from. `up` is the default — content arriving from below. */
  from?: 'up' | 'down' | 'left' | 'right' | 'scale';
  /** How far it travels, in points. */
  distance?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Cap the stagger so the twelfth card is not a second and a half late. */
const MAX_STAGGER = 6;

/**
 * Content arrives rather than appearing. A short rise with a fade, sprung so it
 * settles instead of stopping — the difference between a screen that loads and
 * a screen that turns up.
 */
export function Reveal({
  children,
  index = 0,
  delay = 0,
  from = 'up',
  distance = 14,
  style,
  testID,
}: RevealProps) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      t.setValue(1);
      return;
    }
    const wait = delay + Math.min(index, MAX_STAGGER) * 55;
    const animation = Animated.sequence([
      Animated.delay(wait),
      Animated.spring(t, {
        toValue: 1,
        useNativeDriver: true,
        speed: 14,
        bounciness: 6,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, index, reduced, t]);

  const travel = t.interpolate({
    inputRange: [0, 1],
    outputRange: [from === 'down' ? -distance : from === 'up' ? distance : 0, 0],
  });
  const slide = t.interpolate({
    inputRange: [0, 1],
    outputRange: [from === 'right' ? distance : from === 'left' ? -distance : 0, 0],
  });

  return (
    <Animated.View
      testID={testID}
      style={[
        {
          opacity: t,
          transform: [
            { translateY: travel },
            { translateX: slide },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [from === 'scale' ? 0.9 : 0.985, 1] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ── AnimatedGradient ──────────────────────────────────────────────────────────
type GradientStops = readonly [string, string, ...string[]];

interface DriftProps {
  colors: GradientStops;
  /** Seconds for one full there-and-back. Slower is better; 9 is the default. */
  period?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Rounds the gradient itself, so it can sit under rounded content. */
  radius?: number;
  testID?: string;
}

/**
 * A gradient that will not sit still.
 *
 * `expo-linear-gradient` cannot animate its own stops, so this lays two copies
 * of the sweep on top of each other — one running the other way — and
 * cross-fades between them for ever. The result is a slow hue drift with no
 * per-frame JS: one opacity value, on the native driver.
 *
 * The period is long on purpose. A background that visibly cycles is a
 * background you end up fighting; this one you notice once.
 */
export function AnimatedGradient({
  colors,
  period = 9,
  style,
  children,
  radius,
  testID,
}: DriftProps) {
  const reduced = useReducedMotion();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      drift.setValue(0);
      return;
    }
    const half = (period * 1000) / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, period, reduced]);

  const reversed = [...colors].reverse() as unknown as GradientStops;
  const rounded = radius != null ? { borderRadius: radius, overflow: 'hidden' as const } : null;

  return (
    <View style={[rounded, style]} testID={testID}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, rounded]}
      />
      <Animated.View style={[StyleSheet.absoluteFill, rounded, { opacity: drift }]}>
        <LinearGradient
          colors={reversed}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, rounded]}
        />
      </Animated.View>
      {children}
    </View>
  );
}

// ── Shine ─────────────────────────────────────────────────────────────────────
interface ShineProps {
  /** How wide the highlight is, as a fraction of the surface. */
  width?: number;
  /** Seconds between passes. */
  every?: number;
  color?: string;
  radius?: number;
}

/**
 * A highlight that sweeps across a surface every few seconds — the thing that
 * makes a card read as glossy rather than printed. Absolutely positioned, so it
 * goes inside whatever it is lighting up and needs `overflow: 'hidden'` there.
 */
export function Shine({ width = 0.35, every = 5, color, radius }: ShineProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(every * 1000),
        Animated.timing(x, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(x, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [every, reduced, x]);

  if (reduced) return null;

  const tint = color ?? theme.alpha(theme.colors.textOnBrand, 0.28);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        ...StyleSheet.absoluteFillObject,
        borderRadius: radius,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: -40,
          bottom: -40,
          width: `${width * 100}%`,
          transform: [
            { rotate: '18deg' },
            {
              translateX: x.interpolate({
                inputRange: [0, 1],
                outputRange: [-260, 460],
              }),
            },
          ],
        }}
      >
        <LinearGradient
          colors={['transparent', tint, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ── Pulse ─────────────────────────────────────────────────────────────────────
/**
 * A soft halo behind a small element — a live badge, an unread dot, a button
 * that wants to be found. Returns nothing under reduce-motion, because a
 * pulsing ring is exactly the kind of thing that setting is for.
 */
export function Pulse({
  color,
  size,
  radius,
  period = 2.4,
}: {
  color: string;
  size: number;
  radius?: number;
  period?: number;
}) {
  const reduced = useReducedMotion();
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(p, {
        toValue: 1,
        duration: period * 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [p, period, reduced]);

  if (reduced) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: radius ?? size / 2,
        backgroundColor: color,
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
        transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] }) }],
      }}
    />
  );
}
