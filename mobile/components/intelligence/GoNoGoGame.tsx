import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { now, seededRng } from '@/lib/gi/random';
import { goNoGoPlan } from '@/lib/gi/trials';
import { goNoGoMetrics, type GoNoGoMetrics, type GoNoGoRow } from '@/lib/gi/metrics';
import { alpha } from '@/theme/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { NATIVE_DRIVER } from '@/lib/motion';
import { FAST_PRESS, RoundBar, useTimers, type GameProps } from './shared';
import { Football, StopSign, useSvgId } from './art';

/** A ball stays up this long; not tapping by then is a decision. */
const WINDOW_MS = 800;
const STIM = 128;
const RING = 176;

/**
 * Go / Stop — response inhibition.
 *
 * Three green balls in four: tap. The red one: hold. The prepotent tap is the
 * point — after a run of greens, the hand wants to go, and holding it back is
 * the skill a defender uses not to dive in.
 */
export function GoNoGoGame({ mode, seed, onDone }: GameProps<GoNoGoMetrics>) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const reduced = useReducedMotion();
  const { later, cancel } = useTimers();
  /* Decoration only: the ring that shrinks over the window, and the pop-in.
     Neither decides anything — the window is still the timeout below. */
  const ring = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;

  const plan = useMemo(() => goNoGoPlan(seededRng(seed), mode), [seed, mode]);
  const [index, setIndex] = useState(0);
  const [ball, setBall] = useState<'go' | 'stop' | null>(null);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);

  const shownAt = useRef(0);
  const answered = useRef(false);
  const rows = useRef<GoNoGoRow[]>([]);
  const windowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);

  const finishTrial = useCallback(
    (rt: number | null) => {
      /* The window timeout and a late tap can both land before a re-render;
         whichever is first answers the trial, the other is ignored. */
      if (answered.current) return;
      answered.current = true;
      cancel(windowTimer.current);
      const trial = plan[index];
      rows.current.push({ go: trial.go, rt });
      const good = trial.go ? rt != null : rt == null;
      setBall(null);
      setFlash(good ? 'good' : 'bad');
      later(() => {
        setFlash(null);
        setIndex((i) => i + 1);
      }, 180);
    },
    [cancel, later, plan, index],
  );

  useEffect(() => {
    if (index >= plan.length) {
      if (!done.current) {
        done.current = true;
        onDone(goNoGoMetrics(rows.current));
      }
      return;
    }
    answered.current = true;
    later(() => {
      answered.current = false;
      shownAt.current = now();
      setBall(plan[index].go ? 'go' : 'stop');
      windowTimer.current = later(() => finishTrial(null), WINDOW_MS);
      ring.stopAnimation();
      ring.setValue(1);
      if (!reduced) {
        Animated.timing(ring, {
          toValue: 0,
          duration: WINDOW_MS,
          easing: Easing.linear,
          useNativeDriver: NATIVE_DRIVER,
        }).start();
        pop.setValue(0.75);
        Animated.timing(pop, {
          toValue: 1,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }).start();
      }
    }, plan[index].gap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const tap = () => {
    if (answered.current) return;
    Haptics.selectionAsync().catch(() => {});
    finishTrial(now() - shownAt.current);
  };

  return (
    <View style={{ gap: spacing.xl }}>
      <RoundBar
        index={index}
        total={plan.length}
        label={t(mode === 'practice' ? 'intelligence.practice' : 'intelligence.scoredLabel')}
      />
      <Pressable
        {...FAST_PRESS}
        onPressIn={tap}
        testID="gonogo-arena"
        accessibilityRole="button"
        style={{
          height: 320,
          borderRadius: radii.xl,
          overflow: 'hidden',
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* Stadium light: a glow from above, two floodlights in the corners. */}
        <LinearGradient
          colors={[alpha(colors.play.mint, 0.22), alpha(colors.play.cyan, 0.06), 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Floodlights glow={colors.scheme === 'dark' ? 0.16 : 0.75} />
        {flash ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: flash === 'bad' ? colors.dangerSoft : colors.successSoft }]}
          />
        ) : null}
        <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {ball ? (
            <>
              <Animated.View
                style={{
                  position: 'absolute',
                  width: RING,
                  height: RING,
                  borderRadius: RING / 2,
                  borderWidth: 5,
                  borderColor: ball === 'go' ? colors.play.mint : colors.danger,
                  opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.9] }),
                  transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [STIM / RING, 1] }) }],
                }}
              />
              <Animated.View style={{ transform: [{ scale: pop }] }} testID={`gonogo-${ball}`}>
                {ball === 'go' ? (
                  <Football size={STIM} fill={colors.play.mint} patch="#0A7F5F" stroke="#0A7F5F" />
                ) : (
                  <StopSign size={STIM} color={colors.danger} label={t('intelligence.tests.goNoGo.stopSign')} />
                )}
              </Animated.View>
            </>
          ) : (
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.textMuted, opacity: 0.5 }} />
          )}
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xl }}>
        <Legend icon={<Football size={22} fill={colors.play.mint} patch="#0A7F5F" stroke="#0A7F5F" />} label={t('intelligence.tests.goNoGo.go')} />
        <Legend icon={<StopSign size={24} color={colors.danger} label="" />} label={t('intelligence.tests.goNoGo.stop')} />
      </View>
    </View>
  );
}

/** Two soft floodlights in the top corners — radial, so they fade instead of ending. */
function Floodlights({ glow }: { glow: number }) {
  const id = useSvgId('flood');
  return (
    <Svg width="100%" height={200} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={glow} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="6%" cy={0} r={120} fill={`url(#${id})`} />
      <Circle cx="94%" cy={0} r={120} fill={`url(#${id})`} />
    </Svg>
  );
}

function Legend({ icon, label }: { icon: React.ReactNode; label: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      {icon}
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}
