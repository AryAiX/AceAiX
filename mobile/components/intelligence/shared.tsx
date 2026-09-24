import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, View, ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { alpha } from '@/theme/tokens';
import { GI_TESTS, type GiTestKey } from '@/lib/gi/catalogue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Text } from '@/components/ui';
import type { Mode } from '@/lib/gi/trials';

/**
 * Props that make a Pressable fire `onPressIn` the instant a finger lands.
 *
 * react-native-web delays press-in by 50 ms by default (to tell a tap from a
 * scroll) and drops it altogether for a click released inside that window —
 * which would add 50 ms to every reaction time measured in a browser, and lose
 * the fastest taps outright. On iOS and Android the equivalent is
 * `unstable_pressDelay`. Every timed surface in the games spreads this.
 */
export const FAST_PRESS = { unstable_pressDelay: 0, delayPressIn: 0 } as unknown as Record<string, never>;

/** What every game receives. It plays its plan, then calls `onDone` once. */
export interface GameProps<M> {
  mode: Mode;
  seed: number;
  onDone: (metrics: M) => void;
}

/**
 * Timers that die with the component.
 *
 * A game is a chain of timeouts, and a player can leave mid-chain — back
 * button, phone call, app switch. Every timeout goes through here so unmounting
 * clears all of them; nothing fires into a game that is no longer on screen.
 */
export function useTimers() {
  const ids = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const frames = useRef<Set<number>>(new Set());

  useEffect(() => {
    const t = ids.current;
    const f = frames.current;
    return () => {
      t.forEach(clearTimeout);
      t.clear();
      f.forEach((id) => cancelAnimationFrame(id));
      f.clear();
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      ids.current.delete(id);
      fn();
    }, ms);
    ids.current.add(id);
    return id;
  }, []);

  const cancel = useCallback((id: ReturnType<typeof setTimeout> | null | undefined) => {
    if (id == null) return;
    clearTimeout(id);
    ids.current.delete(id);
  }, []);

  const frame = useCallback((fn: (t: number) => void) => {
    const id = requestAnimationFrame((t) => {
      frames.current.delete(id);
      fn(t);
    });
    frames.current.add(id);
    return id;
  }, []);

  const clearAll = useCallback(() => {
    ids.current.forEach(clearTimeout);
    ids.current.clear();
    frames.current.forEach((id) => cancelAnimationFrame(id));
    frames.current.clear();
  }, []);

  return { later, cancel, frame, clearAll };
}

/** Measures its own width so a game can lay out in points, not guesses. */
export function useArenaWidth(initial = 320) {
  const [width, setWidth] = useState(initial);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setWidth(w);
  }, []);
  return { width, onLayout };
}

/** "Round 3 of 16" and a slim progress bar, above every game. */
export function RoundBar({ index, total, label }: { index: number; total: number; label?: string }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const shown = Math.min(total, index + 1);
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="captionStrong" tone="secondary">
          {label ?? ''}
        </Text>
        <Text variant="caption" tone="muted">
          {shown}/{total}
        </Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }}>
        <View
          style={{
            width: `${(100 * Math.min(total, index)) / Math.max(1, total)}%`,
            height: 4,
            backgroundColor: colors.play.violet,
          }}
        />
      </View>
    </View>
  );
}

/**
 * The Game Intelligence dial: six segments, one per game, each in that game's
 * colour and filled to its sub-score, with the overall in the middle.
 *
 * Deliberately not `ScoreRing`. The Talent Score's single sweep is the most
 * recognisable object in the app, and the two numbers must never be read as
 * each other — so this one is visibly made of parts, because it is.
 * Without sub-scores (another player's badge) every segment shows the overall.
 */
export function GiRing({
  score,
  subscores,
  size = 120,
  style,
}: {
  score: number | null;
  subscores?: Partial<Record<GiTestKey, number>> | null;
  size?: number;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const reduced = useReducedMotion();

  const stroke = Math.max(6, Math.round(size * 0.085));
  const r = (size - stroke) / 2;
  const c = size / 2;
  const target = Math.max(0, Math.min(100, score ?? 0));

  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const [p, setP] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      setP(1);
      return;
    }
    progress.setValue(0);
    const sub = progress.addListener(({ value }) => setP(value));
    Animated.timing(progress, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => progress.removeListener(sub);
  }, [target, reduced, progress]);

  const SEG = 360 / GI_TESTS.length;
  const GAP = 7;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {GI_TESTS.map((test, i) => {
          const a0 = i * SEG + GAP / 2;
          const span = SEG - GAP;
          const value = subscores ? subscores[test.key] ?? null : score;
          const fill = value == null ? 0 : (Math.max(0, Math.min(100, value)) / 100) * span * p;
          const hue = colors.play[test.hue];
          return (
            <G key={test.key}>
              <Path
                d={arc(c, c, r, a0, a0 + span)}
                stroke={alpha(hue, 0.18)}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
              />
              {fill > 0.5 ? (
                <Path
                  d={arc(c, c, r, a0, a0 + fill)}
                  stroke={hue}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  fill="none"
                />
              ) : null}
            </G>
          );
        })}
      </Svg>
      <Text variant="display" style={{ fontSize: size * 0.3, lineHeight: size * 0.34 }}>
        {score == null ? '–' : Math.round(target * p)}
      </Text>
    </View>
  );
}

/** An SVG arc from angle a0 to a1 (degrees, 0 = twelve o'clock, clockwise). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(rad(a0));
  const y0 = cy + r * Math.sin(rad(a0));
  const x1 = cx + r * Math.cos(rad(a1));
  const y1 = cy + r * Math.sin(rad(a1));
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** One horizontal bar per game, coloured by the game's hue. */
export function SubScoreBar({
  label,
  hint,
  value,
  color,
}: {
  label: string;
  hint?: string;
  value: number | null | undefined;
  color: string;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
          {label}
          {hint ? (
            <Text variant="caption" tone="muted">
              {'  '}
              {hint}
            </Text>
          ) : null}
        </Text>
        <Text variant="captionStrong" tone={value == null ? 'muted' : 'default'}>
          {value == null ? '–' : Math.round(value)}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }}>
        <View
          style={{
            width: `${Math.max(0, Math.min(100, value ?? 0))}%`,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}

/**
 * A large answer button that responds on touch-down, not release.
 *
 * `Button` answers on release, which adds the length of the press — 60 to
 * 120 ms, and different for every player — to every reaction time. The games
 * time from the moment the finger lands.
 */
export function BigChoice({
  label,
  icon,
  iconRight,
  onPress,
  disabled,
  color,
  testID,
  style,
}: {
  label: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  testID?: string;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  return (
    <Pressable
      {...FAST_PRESS}
      onPressIn={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => [
        {
          flex: 1,
          minHeight: 72,
          borderRadius: radii.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          backgroundColor: pressed ? colors.surfaceSunken : color ?? colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon}
      <Text variant="bodyStrong" color={color ? '#FFFFFF' : undefined}>
        {label}
      </Text>
      {iconRight}
    </Pressable>
  );
}
