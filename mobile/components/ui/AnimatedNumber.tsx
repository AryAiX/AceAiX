import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Text } from './Text';
import type { TextTone, TextVariant } from './Text';

interface Props {
  value: number;
  variant?: TextVariant;
  tone?: TextTone;
  /** Overrides tone. Use only for tier/brand colours computed at runtime. */
  color?: string;
  /** Milliseconds for the count. Defaults to the theme's slow step. */
  duration?: number;
  /** e.g. `compactNumber`, or a locale-aware formatter. */
  format?: (value: number) => string;
  /** Count up from zero the first time it renders. Off by default. */
  animateOnMount?: boolean;
  style?: StyleProp<TextStyle>;
  /** Announced instead of the digits — always the final value, never a frame of the count. */
  accessibilityLabel?: string;
  testID?: string;
}

const identity = (n: number) => String(Math.round(n));

/**
 * A number that counts to its new value.
 *
 * Used for like counts, follower counts and stat tiles. Two rules keep it
 * honest: it never animates on first paint (a feed full of counters spinning up
 * looks like a slot machine), and it re-renders only itself — the count runs on
 * an `Animated.Value` and the parent never hears about it.
 *
 * The digits also step in from the direction they moved, because 12 → 13 is a
 * change no tween can show on its own.
 */
function AnimatedNumberBase({
  value,
  variant = 'captionStrong',
  tone,
  color,
  duration,
  format = identity,
  animateOnMount = false,
  style,
  accessibilityLabel,
  testID,
}: Props) {
  const theme = useTheme();
  const reduced = useReducedMotion();

  const start = animateOnMount ? 0 : value;
  const count = useRef(new Animated.Value(start)).current;
  const shift = useRef(new Animated.Value(0)).current;
  const previous = useRef(start);
  const mounted = useRef(false);
  const [displayed, setDisplayed] = useState(() => format(start));

  useEffect(() => {
    const from = previous.current;
    const first = !mounted.current;
    previous.current = value;
    mounted.current = true;

    if (first && !animateOnMount) return;
    if (!first && from === value) return;

    if (reduced) {
      count.setValue(value);
      shift.setValue(0);
      setDisplayed(format(value));
      return;
    }

    /* The listener drives local state, so this value can never run on the
       native driver — it is text content, not a transform. Re-rendering is
       gated on the formatted string, so a 12 → 13 like costs one render. */
    let last = format(from);
    const id = count.addListener(({ value: frame }) => {
      const next = format(frame);
      if (next !== last) {
        last = next;
        setDisplayed(next);
      }
    });

    shift.setValue(value >= from ? 1 : -1);

    Animated.parallel([
      Animated.timing(count, {
        toValue: value,
        duration: duration ?? theme.duration.slow,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.spring(shift, {
        toValue: 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
    ]).start(() => setDisplayed(format(value)));

    return () => count.removeListener(id);
    /* `format` is normally an inline arrow, so it changes identity on every
       parent render; depending on it would restart the count for no reason. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced, duration, animateOnMount, count, shift, theme.duration.slow]);

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: shift.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) },
        ],
      }}
    >
      <Text
        variant={variant}
        tone={tone}
        color={color}
        style={style}
        numberOfLines={1}
        accessibilityLabel={accessibilityLabel ?? format(value)}
        testID={testID}
      >
        {displayed}
      </Text>
    </Animated.View>
  );
}

export const AnimatedNumber = memo(AnimatedNumberBase);
