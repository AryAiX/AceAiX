import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { randInt, seededRng, shuffle } from '@/lib/gi/random';
import {
  TRACKING_BALLS,
  nextTrackingLevel,
  trackingLevel,
  trackingStart,
  trackingStep,
  type TrackingBall,
} from '@/lib/gi/trials';
import { trackingMetrics, type TrackingMetrics, type TrackingRow } from '@/lib/gi/metrics';
import { FAST_PRESS, RoundBar, useArenaWidth, useTimers, type GameProps } from './shared';

const RADIUS = 0.06;
const SHOW_MS = 2000;
const MOVE_MS = 5000;
const REVEAL_MS = 1300;

type Phase = 'show' | 'move' | 'pick' | 'reveal';

/**
 * Track the Runners — multiple-object tracking.
 *
 * A few balls flash; then all eight move and bounce, identical. Follow the
 * ones that flashed. It is what a midfielder does with three runners and a
 * ball: keep them all in mind without looking at any one of them.
 *
 * The level staircase (lib/gi/trials) speeds the balls up after a perfect
 * round and slows them after a poor one, so every player ends up working at
 * the edge of what they can follow.
 */
export function TrackingGame({ mode, seed, onDone }: GameProps<TrackingMetrics>) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const { later, frame } = useTimers();
  const { width, onLayout } = useArenaWidth();

  const rounds = mode === 'practice' ? 1 : 6;
  const rng = useMemo(() => seededRng(seed), [seed]);

  const [round, setRound] = useState(0);
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<Phase>('show');
  const [targets, setTargets] = useState<number[]>([]);
  const [picked, setPicked] = useState<number[]>([]);

  const balls = useRef<TrackingBall[]>([]);
  const xy = useRef(
    Array.from({ length: TRACKING_BALLS }, () => new Animated.ValueXY({ x: 0, y: 0 })),
  ).current;
  const rows = useRef<TrackingRow[]>([]);
  /* What has been picked this round, and whether picking is open — refs, so
     two taps inside one frame both land and a round is scored exactly once. */
  const pickedRef = useRef<number[]>([]);
  const pickOpen = useRef(false);
  const targetsRef = useRef<number[]>([]);
  const done = useRef(false);
  const size = width;

  const place = useCallback(() => {
    balls.current.forEach((b, i) => {
      xy[i].setValue({ x: (b.x - RADIUS) * size, y: (b.y - RADIUS) * size });
    });
  }, [size, xy]);

  // Each round: new balls, new targets, show → move → pick.
  useEffect(() => {
    if (round >= rounds) {
      if (!done.current) {
        done.current = true;
        onDone(trackingMetrics(rows.current));
      }
      return;
    }
    const { targets: count, speed } = trackingLevel(level);
    balls.current = trackingStart(rng, speed, RADIUS);
    place();
    const chosen = shuffle(rng, Array.from({ length: TRACKING_BALLS }, (_, i) => i)).slice(0, count);
    targetsRef.current = chosen;
    pickedRef.current = [];
    pickOpen.current = false;
    setTargets(chosen);
    setPicked([]);
    setPhase('show');

    later(() => {
      setPhase('move');
      const started = { t: 0, last: 0 };
      const tick = (ts: number) => {
        if (!started.t) {
          started.t = ts;
          started.last = ts;
        }
        const dt = Math.min(0.05, (ts - started.last) / 1000);
        started.last = ts;
        balls.current = trackingStep(balls.current, dt, RADIUS);
        place();
        if (ts - started.t < MOVE_MS) frame(tick);
        else {
          pickOpen.current = true;
          setPhase('pick');
        }
      };
      frame(tick);
    }, SHOW_MS + randInt(rng, 0, 200));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Keep balls in place if the arena is resized mid-round.
  useEffect(() => {
    place();
  }, [place]);


  const tapBall = (i: number) => {
    if (!pickOpen.current || pickedRef.current.includes(i)) return;
    Haptics.selectionAsync().catch(() => {});
    const goal = targetsRef.current;
    const next = [...pickedRef.current, i];
    pickedRef.current = next;
    setPicked(next);
    if (next.length === goal.length) {
      pickOpen.current = false;
      const found = next.filter((p) => goal.includes(p)).length;
      rows.current.push({ level, targets: goal.length, found });
      setPhase('reveal');
      later(() => {
        setLevel((l) => nextTrackingLevel(l, found, goal.length));
        setRound((r) => r + 1);
      }, REVEAL_MS);
    }
  };

  const ballSize = RADIUS * 2 * size;
  const caption =
    phase === 'show'
      ? t('intelligence.tests.tracking.watch')
      : phase === 'move'
        ? t('intelligence.tests.tracking.follow')
        : t('intelligence.tests.tracking.pick', { found: picked.length, count: targets.length });

  return (
    <View style={{ gap: spacing.lg }}>
      <RoundBar
        index={round}
        total={rounds}
        label={`${t(mode === 'practice' ? 'intelligence.practice' : 'intelligence.scoredLabel')} · ${t(
          'intelligence.tests.tracking.level',
          { n: level },
        )}`}
      />
      <Text variant="subheading" style={{ textAlign: 'center' }}>
        {caption}
      </Text>
      <View
        onLayout={onLayout}
        testID="tracking-arena"
        style={{
          width: '100%',
          aspectRatio: 1,
          borderRadius: radii.xl,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {xy.map((pos, i) => {
          const isTarget = targets.includes(i);
          const isPicked = picked.includes(i);
          let fill: string = colors.play.azure;
          let ring = 'transparent';
          if (phase === 'show' && isTarget) fill = colors.play.amber;
          if (phase === 'pick' && isPicked) ring = colors.text;
          if (phase === 'reveal') {
            if (isTarget) ring = colors.success;
            if (isPicked && !isTarget) ring = colors.danger;
            if (isTarget) fill = colors.play.amber;
          }
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                width: ballSize,
                height: ballSize,
                transform: pos.getTranslateTransform(),
              }}
            >
              <Pressable
                {...FAST_PRESS}
                onPressIn={() => tapBall(i)}
                disabled={phase !== 'pick'}
                accessibilityRole="button"
                accessibilityLabel={`ball ${i + 1}`}
                testID={`tracking-ball-${i}`}
                hitSlop={8}
                style={{
                  flex: 1,
                  borderRadius: ballSize / 2,
                  backgroundColor: fill,
                  borderWidth: 4,
                  borderColor: ring,
                }}
              />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
