import React, { useEffect, useId, useRef, useState } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, TierLabels, tierForScore, tierGradient } from '@/theme/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** 0–100. Pass null while loading. */
  score: number | null;
  size?: number;
  thickness?: number;
  /** Show the tier name under the number. */
  showTier?: boolean;
  label?: string;
  style?: ViewStyle;
  animate?: boolean;
  testID?: string;
}

/**
 * The Talent Score dial. This is the single most important object in the app —
 * it is the reason a 14-year-old opens it twice a day, so it gets the only
 * Volt-coloured gradient in the entire design system.
 */
export function ScoreRing({
  score,
  size = 132,
  thickness,
  showTier = true,
  label,
  style,
  animate = true,
  testID,
}: Props) {
  const theme = useTheme();
  const { colors } = theme;

  const stroke = thickness ?? Math.max(6, Math.round(size * 0.085));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const target = Math.max(0, Math.min(100, score ?? 0));
  const tier = tierForScore(target);
  const tierColor = TierColors[tier];
  const [ringStart, ringEnd] = tierGradient(tier);

  /*
   * The gradient's id used to be the literal "scoreGradient".
   *
   * One ring per screen made that look safe, and it was not: the router keeps
   * the screen you came from mounted, so opening the score screen from the
   * profile put two <svg> elements carrying the same id in one document. The
   * browser resolved `url(#scoreGradient)` to the first — a gradient defined
   * inside the *other* svg, in another coordinate space — and painted nothing.
   * The arc simply vanished, on the one screen the app is built around.
   *
   * `useId` is per instance. The colons it contains are not legal in a URL
   * fragment, so they come out.
   */
  const gradientId = `score-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(animate ? 0 : target)).current;
  const [displayed, setDisplayed] = useState(animate ? 0 : target);

  /* Only a rise is celebrated, and never the first paint — a score that lights
     up every time the profile screen mounts would stop meaning anything. */
  const previous = useRef<number | null>(null);
  const glow = useRef(new Animated.Value(0)).current;
  const sheen = useRef(new Animated.Value(0)).current;
  const sheenFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (score == null) return;
    if (!animate || reduced) {
      progress.setValue(target);
      setDisplayed(target);
      return;
    }
    const id = progress.addListener(({ value }) => setDisplayed(Math.round(value)));
    Animated.timing(progress, {
      toValue: target,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => progress.removeListener(id);
  }, [target, score, animate, reduced, progress]);

  useEffect(() => {
    if (score == null) return;
    const before = previous.current;
    previous.current = target;
    if (before == null || target <= before || reduced) return;

    glow.setValue(0);
    sheen.setValue(0);
    sheenFade.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 620,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(sheenFade, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(340),
        Animated.timing(sheenFade, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      /* SVG geometry has no native-driver equivalent, so the travel runs on the
         JS thread — one value, on a screen the person is not scrolling. */
      Animated.timing(sheen, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [target, score, reduced, glow, sheen, sheenFade]);

  /* A highlight that walks the filled arc every few seconds, for ever. The
     score is the object people come back to look at; a still ring reads as a
     screenshot of one. It is one interpolated value on the JS thread, and
     reduce-motion switches it off entirely. */
  const orbit = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced || score == null) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbit, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.delay(1800),
        Animated.timing(orbit, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [orbit, reduced, score]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  /* A short bright dash that runs along the filled arc once, from its start to
     its end. Negative dash offsets move the dash forward along the path. */
  const arcLength = circumference * (target / 100);
  const sheenLength = Math.min(arcLength, circumference * 0.16);
  const sheenTravel = Math.max(0, arcLength - sheenLength);
  const sheenOffset = sheen.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -sheenTravel],
  });

  const orbitLength = Math.min(arcLength, circumference * 0.07);
  const orbitOffset = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -Math.max(0, arcLength - orbitLength)],
  });

  return (
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Talent score ${score ?? 'not calculated yet'} out of 100, ${TierLabels[tier]} tier`}
      accessibilityValue={{ min: 0, max: 100, now: score ?? 0 }}
      testID={testID}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: theme.alpha(tierColor, 0.45),
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
          transform: [
            { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }) },
          ],
        }}
      />

      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          {/* Two real stops. It used to be the tier colour to itself for every
              tier but Elite, which is a gradient in name only — and for the two
              grey tiers it made the app's hero object a grey circle. */}
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={ringStart} />
            <Stop offset="0.55" stopColor={ringEnd} />
            <Stop offset="1" stopColor={tier === 'elite' ? colors.accent : ringStart} />
          </LinearGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceSunken}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* The permanent orbit. */}
      {score != null && !reduced ? (
        <View pointerEvents="none" style={{ position: 'absolute' }}>
          <Svg width={size} height={size}>
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.alpha(colors.textOnBrand, 0.55)}
              strokeWidth={stroke * 0.42}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${orbitLength} ${circumference}`}
              strokeDashoffset={orbitOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
        </View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', opacity: sheenFade }}
      >
        <Svg width={size} height={size}>
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.alpha(colors.textOnBrand, 0.7)}
            strokeWidth={stroke * 0.5}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${sheenLength} ${circumference}`}
            strokeDashoffset={sheenOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
      </Animated.View>

      <View style={{ alignItems: 'center' }}>
        {score == null ? (
          <Text variant="heading" tone="muted">
            —
          </Text>
        ) : (
          <Text
            variant={size >= 120 ? 'display' : 'stat'}
            style={size >= 120 ? undefined : { fontSize: size * 0.28 }}
          >
            {displayed}
          </Text>
        )}
        {showTier && score != null ? (
          <Text variant="overline" color={tierColor}>
            {TierLabels[tier]}
          </Text>
        ) : label ? (
          <Text variant="overline" tone="muted">
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

interface BarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
  hint?: string;
}

/** One pillar of the score breakdown. */
export function ScoreBar({ label, value, max = 100, color, hint }: BarProps) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value / max));
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      width.setValue(pct);
      return;
    }
    Animated.timing(width, {
      toValue: pct,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, width, reduced]);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="captionStrong" tone="secondary">
          {label}
        </Text>
        <Text variant="captionStrong" color={color ?? colors.text}>
          {Math.round(value)}
          <Text variant="caption" tone="muted">
            /{max}
          </Text>
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: radii.pill,
          backgroundColor: colors.surfaceSunken,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            borderRadius: radii.pill,
            backgroundColor: color ?? colors.primary,
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>
      {hint ? (
        <Text variant="caption" tone="muted" style={{ marginTop: -2, marginBottom: spacing.xs }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
