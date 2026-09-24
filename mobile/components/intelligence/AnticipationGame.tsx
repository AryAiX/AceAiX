import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, GestureResponderEvent, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { seededRng } from '@/lib/gi/random';
import { anticipationPlan, ballAt } from '@/lib/gi/trials';
import {
  anticipationMetrics,
  type AnticipationMetrics,
  type AnticipationRow,
} from '@/lib/gi/metrics';
import { FAST_PRESS, RoundBar, useArenaWidth, useTimers, type GameProps } from './shared';

const BALL = 26;
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
    setPhase('wait');
    const current = plan[index];
    const start = ballAt(current, 0);
    pos.setValue({
      x: start.x * size.current.width - BALL / 2,
      y: start.y * size.current.height - BALL / 2,
    });

    later(() => {
      setPhase('flight');
      let t0 = 0;
      const tick = (ts: number) => {
        if (!t0) t0 = ts;
        const p = (ts - t0) / current.duration;
        if (p >= current.visible) {
          waiting.current = true;
          setPhase('guess');
          guessTimer.current = later(() => settle(null), GUESS_MS);
          return;
        }
        const at = ballAt(current, p);
        pos.setValue({
          x: at.x * size.current.width - BALL / 2,
          y: at.y * size.current.height - BALL / 2,
        });
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
    later(() => setIndex((i) => i + 1), REVEAL_MS);
  };

  const tap = (e: GestureResponderEvent) => {
    if (!waiting.current) return;
    Haptics.selectionAsync().catch(() => {});
    const x = Math.max(0, Math.min(1, e.nativeEvent.locationX / Math.max(1, width)));
    settle(x);
  };

  const goalW = width * 0.44;

  return (
    <View style={{ gap: spacing.lg }}>
      <RoundBar
        index={index}
        total={plan.length}
        label={t(mode === 'practice' ? 'intelligence.practice' : 'intelligence.scoredLabel')}
      />
      <Text variant="subheading" style={{ textAlign: 'center' }}>
        {phase === 'guess' ? t('intelligence.tests.anticipation.tapLine') : ' '}
      </Text>
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
          backgroundColor: '#1F7A3A',
        }}
      >
        <View pointerEvents="none" style={{ flex: 1 }}>
          {/* Stripes and the goal line — decoration, never a hit target. */}
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: (i * height) / 6,
                height: height / 12,
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
            />
          ))}
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, backgroundColor: '#FFFFFF' }} />
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: (width - goalW) / 2,
              width: goalW,
              height: 14,
              borderWidth: 3,
              borderTopWidth: 0,
              borderColor: '#FFFFFF',
            }}
          />
          {phase === 'guess' ? (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: 36,
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
            />
          ) : null}

          {phase === 'wait' || phase === 'flight' ? (
            <Animated.View
              style={{
                position: 'absolute',
                width: BALL,
                height: BALL,
                borderRadius: BALL / 2,
                backgroundColor: '#FFFFFF',
                borderWidth: 3,
                borderColor: '#14161A',
                transform: pos.getTranslateTransform(),
              }}
            />
          ) : null}

          {phase === 'reveal' ? (
            <>
              <Marker x={trial.endX * width} color={colors.play.lime} />
              {guessX != null ? <Marker x={guessX * width} color={colors.play.magenta} /> : null}
            </>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

function Marker({ x, color }: { x: number; color: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: x - 3,
        width: 6,
        height: 44,
        borderRadius: 3,
        backgroundColor: color,
      }}
    />
  );
}
