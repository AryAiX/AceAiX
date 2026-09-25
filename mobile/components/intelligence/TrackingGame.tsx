import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Check, X } from 'lucide-react-native';

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
import { Jersey, PitchInk, Ripple } from './art';

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
  const found = picked.filter((p) => targets.includes(p)).length;
  const caption =
    phase === 'show'
      ? t('intelligence.tests.tracking.watch')
      : phase === 'move'
        ? t('intelligence.tests.tracking.follow')
        : phase === 'reveal'
          ? t('intelligence.tests.tracking.found', { found, count: targets.length })
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
      <Text
        variant="subheading"
        style={{ textAlign: 'center' }}
        color={phase === 'reveal' ? (found === targets.length ? colors.success : colors.text) : undefined}
      >
        {caption}
      </Text>
      <View
        onLayout={onLayout}
        testID="tracking-arena"
        style={{
          width: '100%',
          aspectRatio: 1,
          borderRadius: radii.xl,
          backgroundColor: PitchInk.grass,
          overflow: 'hidden',
        }}
      >
        {/* Mown stripes, the halfway line and the centre circle. */}
        <Svg width={size} height={size} style={{ position: 'absolute' }} pointerEvents="none">
          {Array.from({ length: 4 }).map((_, i) => (
            <Rect key={i} x={(i * 2 * size) / 8} y={0} width={size / 8} height={size} fill="rgba(255,255,255,0.045)" />
          ))}
          <Rect x={3} y={3} width={size - 6} height={size - 6} stroke={PitchInk.chalkSoft} strokeWidth={2} fill="none" rx={radii.xl - 4} />
          <Line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={PitchInk.chalkSoft} strokeWidth={2} />
          <Circle cx={size / 2} cy={size / 2} r={size * 0.17} stroke={PitchInk.chalkSoft} strokeWidth={2} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={4} fill={PitchInk.chalkSoft} />
        </Svg>
        {/* On reveal the targets are drawn last, so a missed one is never hidden under another. */}
        {(phase === 'reveal'
          ? [...xy.keys()].sort((a, b) => Number(targets.includes(a)) - Number(targets.includes(b)))
          : [...xy.keys()]
        ).map((i) => {
          const pos = xy[i];
          const isTarget = targets.includes(i);
          const isPicked = picked.includes(i);
          /* The balls are identical on purpose — no numbers — so the only way
             to find the targets again is to have followed them. */
          let fill: string = colors.play.azure;
          let ring = 'transparent';
          if (phase === 'show' && isTarget) {
            fill = colors.play.amber;
            ring = colors.play.amber;
          }
          if (phase === 'pick' && isPicked) ring = '#FFFFFF';
          if (phase === 'reveal') {
            if (isTarget) {
              fill = colors.play.amber;
              ring = isPicked ? colors.success : '#FFFFFF';
            } else if (isPicked) ring = colors.danger;
          }
          const mark =
            (phase === 'pick' && isPicked) || (phase === 'reveal' && isPicked)
              ? phase === 'reveal' && !isTarget
                ? 'wrong'
                : 'right'
              : null;
          const halo = ballSize + 10;
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
              {phase === 'show' && isTarget ? (
                <Ripple color={colors.play.amber} size={ballSize} loop period={900} width={4} />
              ) : null}
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: -5,
                  top: -5,
                  width: halo,
                  height: halo,
                  borderRadius: halo / 2,
                  borderWidth: 3,
                  borderColor: ring,
                  borderStyle: phase === 'reveal' && isTarget && !isPicked ? 'dashed' : 'solid',
                }}
              />
              <Pressable
                {...FAST_PRESS}
                onPressIn={() => tapBall(i)}
                disabled={phase !== 'pick'}
                accessibilityRole="button"
                accessibilityLabel={`ball ${i + 1}`}
                testID={`tracking-ball-${i}`}
                hitSlop={8}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Jersey size={ballSize} fill={fill} />
              </Pressable>
              {mark ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    right: -6,
                    top: -6,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                      mark === 'wrong' ? colors.danger : phase === 'reveal' ? colors.success : colors.play.violet,
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }}
                >
                  {mark === 'wrong' ? (
                    <X size={12} color="#FFFFFF" strokeWidth={4} />
                  ) : (
                    <Check size={12} color="#FFFFFF" strokeWidth={4} />
                  )}
                </View>
              ) : null}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
