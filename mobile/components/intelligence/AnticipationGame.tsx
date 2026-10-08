import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, GestureResponderEvent, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { seededRng } from '@/lib/gi/random';
import { anticipationPlan, ballAt, type AnticipationTrial } from '@/lib/gi/trials';
import {
  anticipationMetrics,
  anticipationVerdict,
  type AnticipationMetrics,
  type AnticipationRow,
} from '@/lib/gi/metrics';
import { alpha } from '@/theme/tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { NATIVE_DRIVER } from '@/lib/motion';
import { FAST_PRESS, RoundBar, useArenaWidth, useTimers, type GameProps } from './shared';
import { Football, GoalTop, Keeper, PitchInk } from './art';

const BALL = 26;
/** Net depth above the goal line. Flight y 0 is the line, drawn this far down. */
const LINE = 26;
/** Dots in the trail the ball leaves while it is visible. */
const TRAIL = 14;
const KEEPER = 30;

/** A flight point in arena points: y 0 (goal line) sits at LINE, y 1 at the bottom. */
function toPx(pt: { x: number; y: number }, width: number, height: number) {
  return { x: pt.x * width, y: LINE + pt.y * (height - LINE) };
}

function samples(trial: AnticipationTrial, from: number, to: number, n: number) {
  return Array.from({ length: n + 1 }, (_, i) => ballAt(trial, from + ((to - from) * i) / n));
}
const GUESS_MS = 2500;
const REVEAL_MS = 900;

type Phase = 'wait' | 'flight' | 'guess' | 'reveal';

/**
 * Read the Ball — coincidence anticipation with occlusion.
 *
 * The ball is launched towards the goal line on a curve and disappears part of
 * the way. Tap where it will cross. The error, as a share of the pitch width,
 * is the measure — the same judgement a keeper or a centre-back makes about a
 * cross before it is anywhere near them.
 */
export function AnticipationGame({ mode, seed, onDone }: GameProps<AnticipationMetrics>) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const { later, frame, cancel } = useTimers();
  const { width, onLayout } = useArenaWidth();
  const height = Math.round(width * 1.15);

  const plan = useMemo(() => anticipationPlan(seededRng(seed), mode), [seed, mode]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('wait');
  const [guessX, setGuessX] = useState<number | null>(null);
  const [trail, setTrail] = useState(0);
  const reduced = useReducedMotion();
  const keeperX = useRef(new Animated.Value(0.5)).current;

  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const rows = useRef<AnticipationRow[]>([]);
  const guessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Waiting for a guess — a ref, so a tap and the timeout cannot both settle
     the same ball. */
  const waiting = useRef(false);
  const done = useRef(false);
  const size = useRef({ width, height });
  size.current = { width, height };

  const trial = plan[Math.min(index, plan.length - 1)];

  useEffect(() => {
    if (index >= plan.length) {
      if (!done.current) {
        done.current = true;
        onDone(anticipationMetrics(rows.current));
      }
      return;
    }
    setGuessX(null);
    setTrail(0);
    keeperX.setValue(0.5);
    setPhase('wait');
    const current = plan[index];
    const start = toPx(ballAt(current, 0), size.current.width, size.current.height);
    pos.setValue({ x: start.x - BALL / 2, y: start.y - BALL / 2 });

    later(() => {
      setPhase('flight');
      let t0 = 0;
      let dots = 0;
      const tick = (ts: number) => {
        if (!t0) t0 = ts;
        const p = (ts - t0) / current.duration;
        if (p >= current.visible) {
          waiting.current = true;
          setPhase('guess');
          guessTimer.current = later(() => settle(null), GUESS_MS);
          return;
        }
        const at = toPx(ballAt(current, p), size.current.width, size.current.height);
        pos.setValue({ x: at.x - BALL / 2, y: at.y - BALL / 2 });
        // The trail grows a dot at a time — a re-render per dot, not per frame.
        const n = Math.min(TRAIL, Math.floor((p / current.visible) * TRAIL));
        if (n !== dots) {
          dots = n;
          setTrail(n);
        }
        frame(tick);
      };
      frame(tick);
    }, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const settle = (x: number | null) => {
    if (!waiting.current) return;
    waiting.current = false;
    cancel(guessTimer.current);
    const current = plan[index];
    rows.current.push({ error: x == null ? null : Math.abs(x - current.endX) });
    setGuessX(x);
    setPhase('reveal');
    // The keeper goes where you said — it is your read, after all.
    if (x != null) {
      if (reduced) keeperX.setValue(x);
      else
        Animated.timing(keeperX, {
          toValue: x,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }).start();
    }
    later(() => setIndex((i) => i + 1), REVEAL_MS);
  };

  const tap = (e: GestureResponderEvent) => {
    if (!waiting.current) return;
    Haptics.selectionAsync().catch(() => {});
    const x = Math.max(0, Math.min(1, e.nativeEvent.locationX / Math.max(1, width)));
    settle(x);
  };

  const goalW = width * 0.44;
  const seen = useMemo(
    () => samples(trial, 0, trial.visible, TRAIL).map((q) => toPx(q, width, height)),
    [trial, width, height],
  );
  const rest = useMemo(
    () => samples(trial, trial.visible, 1, 16).map((q) => toPx(q, width, height)),
    [trial, width, height],
  );
  const error = guessX == null ? null : Math.abs(guessX - trial.endX);
  const verdict = anticipationVerdict(error);
  const verdictColor =
    verdict === 'spotOn' ? colors.success : verdict === 'close' ? colors.play.amber : colors.danger;
  const trueX = trial.endX * width;

  return (
    <View style={{ gap: spacing.lg }}>
      <RoundBar
        index={index}
        total={plan.length}
        label={t(mode === 'practice' ? 'intelligence.practice' : 'intelligence.scoredLabel')}
      />
      {/* One fixed-height slot above the arena: the prompt, then the verdict —
          so nothing is drawn over the ball's path. */}
      <View style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
        {phase === 'reveal' ? (
          <View
            testID="anticipation-verdict"
            style={{
              paddingHorizontal: spacing.lg,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: verdictColor,
            }}
          >
            <Text variant="subheading" color="#FFFFFF">
              {guessX == null ? t('intelligence.timeUp') : t(`intelligence.tests.anticipation.${verdict}`)}
            </Text>
          </View>
        ) : (
          <Text variant="subheading" style={{ textAlign: 'center' }}>
            {phase === 'guess' ? t('intelligence.tests.anticipation.tapLine') : ' '}
          </Text>
        )}
      </View>
      <Pressable
        {...FAST_PRESS}
        onLayout={onLayout}
        onPressIn={tap}
        testID="anticipation-arena"
        style={{
          width: '100%',
          height,
          borderRadius: radii.xl,
          overflow: 'hidden',
          backgroundColor: PitchInk.grass,
        }}
      >
        <View pointerEvents="none" style={{ flex: 1 }}>
          {/* Stripes, the box, the goal — decoration, never a hit target. */}
          <Svg width={width} height={height} style={{ position: 'absolute' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Rect key={i} x={0} y={(i * height) / 6} width={width} height={height / 12} fill="rgba(255,255,255,0.05)" />
            ))}
            <Rect
              x={width * 0.2}
              y={LINE}
              width={width * 0.6}
              height={height * 0.3}
              stroke={PitchInk.chalkSoft}
              strokeWidth={2}
              fill="none"
            />
            <Rect
              x={width * 0.36}
              y={LINE}
              width={width * 0.28}
              height={height * 0.1}
              stroke={PitchInk.chalkSoft}
              strokeWidth={2}
              fill="none"
            />
          </Svg>
          <GoalTop x={(width - goalW) / 2} width={goalW} depth={LINE} />
          {phase === 'guess' ? (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: LINE - 18,
                height: 36,
                backgroundColor: alpha('#FFFFFF', 0.16),
                borderTopWidth: 2,
                borderBottomWidth: 2,
                borderColor: alpha(colors.play.lime, 0.8),
                borderStyle: 'dashed',
              }}
            />
          ) : null}
          <View style={{ position: 'absolute', left: 0, right: 0, top: LINE - 2, height: 4, backgroundColor: '#FFFFFF' }} />

          <Animated.View
            style={{
              position: 'absolute',
              top: LINE - KEEPER + 4,
              left: 0,
              transform: [
                {
                  translateX: keeperX.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-KEEPER * 0.65, width - KEEPER * 0.65],
                  }),
                },
              ],
            }}
          >
            <Keeper size={KEEPER} kit={colors.play.amber} glove={colors.play.lime} />
          </Animated.View>

          {/* The trail: dots where the ball has been, fading behind it. */}
          {phase !== 'wait' ? (
            <Svg width={width} height={height} style={{ position: 'absolute' }}>
              {seen.slice(0, Math.max(0, trail)).map((pt, i) => (
                <Circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={3}
                  fill="#FFFFFF"
                  opacity={phase === 'flight' ? 0.25 + (0.6 * (i + 1)) / Math.max(1, trail) : 0.5}
                />
              ))}
              {phase === 'reveal' ? (
                <>
                  <Path
                    d={`M ${rest.map((r) => `${r.x.toFixed(1)} ${r.y.toFixed(1)}`).join(' L ')}`}
                    stroke={colors.play.lime}
                    strokeWidth={3}
                    strokeDasharray="7 6"
                    fill="none"
                  />
                  {guessX != null ? (
                    <Line
                      x1={guessX * width}
                      y1={LINE + 14}
                      x2={trueX}
                      y2={LINE + 14}
                      stroke={verdictColor}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  ) : null}
                </>
              ) : null}
            </Svg>
          ) : null}

          {phase === 'wait' || phase === 'flight' ? (
            <Animated.View
              style={{
                position: 'absolute',
                width: BALL,
                height: BALL,
                transform: pos.getTranslateTransform(),
              }}
            >
              <Football size={BALL} />
            </Animated.View>
          ) : null}

          {phase === 'reveal' ? (
            <>
              <Marker x={trueX} color={colors.play.lime} />
              {guessX != null ? <Marker x={guessX * width} color={colors.play.magenta} /> : null}
            </>
          ) : null}
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xl }}>
        <Key color={colors.play.lime} label={t('intelligence.tests.anticipation.keyTrue')} />
        <Key color={colors.play.magenta} label={t('intelligence.tests.anticipation.keyGuess')} />
      </View>
    </View>
  );
}

/** A pin on the goal line: where the ball crossed, or where you said. */
function Marker({ x, color }: { x: number; color: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: LINE - 10, left: x - 10, width: 20, alignItems: 'center' }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: color, borderWidth: 3, borderColor: '#FFFFFF' }} />
      <View style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

function Key({ color, label }: { color: string; label: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}
