import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { now, seededRng } from '@/lib/gi/random';
import { reactionPlan } from '@/lib/gi/trials';
import { reactionMetrics, type ReactionMetrics, type ReactionRow } from '@/lib/gi/metrics';
import { FAST_PRESS, RoundBar, useArenaWidth, useTimers, type GameProps } from './shared';
import { GoalFront, PitchInk, Ripple } from './art';

/** How long a lit pad waits for a tap before the round counts as missed. */
const WINDOW_MS = 1500;

/**
 * Quick Hands — choice reaction time.
 *
 * Four pads; one lights after an unpredictable wait; tap it. A wrong pad or no
 * tap is a miss. The delay range (0.6–1.6 s) is wide enough that tapping on a
 * rhythm produces anticipations, which the metrics count separately.
 */
export function ReactionGame({ mode, seed, onDone }: GameProps<ReactionMetrics>) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const { later, cancel } = useTimers();
  const { width, onLayout } = useArenaWidth();

  const plan = useMemo(() => reactionPlan(seededRng(seed), mode), [seed, mode]);
  const [index, setIndex] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);

  const litAt = useRef(0);
  /* The pad that is lit, and whether this trial has been answered — as refs,
     because a timeout and a tap can both arrive before React re-renders, and
     a check against state would let both of them record the trial. */
  const litPad = useRef<number | null>(null);
  const resolved = useRef(true);
  const rows = useRef<ReactionRow[]>([]);
  const windowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);

  const record = useCallback(
    (row: ReactionRow) => {
      if (resolved.current) return;
      resolved.current = true;
      litPad.current = null;
      cancel(windowTimer.current);
      rows.current.push(row);
      setLit(null);
      setFlash(row.correct ? 'hit' : 'miss');
      later(() => {
        setFlash(null);
        setIndex((i) => i + 1);
      }, 250);
    },
    [cancel, later],
  );

  useEffect(() => {
    if (index >= plan.length) {
      if (!done.current) {
        done.current = true;
        onDone(reactionMetrics(rows.current));
      }
      return;
    }
    later(() => {
      litAt.current = now();
      litPad.current = plan[index].target;
      resolved.current = false;
      setLit(plan[index].target);
      windowTimer.current = later(() => record({ rt: null, correct: false }), WINDOW_MS);
    }, plan[index].delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const press = (pad: number) => {
    const target = litPad.current;
    if (target == null || resolved.current) return; // taps before anything lights are ignored
    const rt = now() - litAt.current;
    Haptics.selectionAsync().catch(() => {});
    record({ rt, correct: pad === target });
  };

  // The goal: posts, bar and net; the four pads are its four corners.
  const post = 10;
  const pad = 14;
  const gw = Math.max(200, width - 2 * pad - 6); // 6: the 3-point flash border
  const gh = Math.round(gw * 0.62);
  const cellW = (gw - 2 * post) / 2;
  const cellH = (gh - post) / 2;
  const target = Math.min(88, Math.round(cellH * 0.78));

  return (
    <View style={{ gap: spacing.xl }}>
      <RoundBar
        index={index}
        total={plan.length}
        label={t(mode === 'practice' ? 'intelligence.practice' : 'intelligence.scoredLabel')}
      />
      <Text variant="subheading" style={{ textAlign: 'center' }}>
        {t('intelligence.tests.reaction.tapCorner')}
      </Text>
      <View
        onLayout={onLayout}
        testID="reaction-goal"
        style={{
          width: '100%',
          paddingTop: pad,
          paddingHorizontal: pad,
          paddingBottom: pad * 2,
          borderRadius: radii.xl,
          overflow: 'hidden',
          backgroundColor: PitchInk.grass,
          borderWidth: 3,
          borderColor: flash === 'miss' ? colors.danger : flash === 'hit' ? colors.success : 'transparent',
        }}
      >
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: pad * 2 + 4, backgroundColor: PitchInk.grassDark }} />
        <View style={{ width: gw, height: gh }}>
          <GoalFront width={gw} height={gh} post={post} />
          {[0, 1, 2, 3].map((padIndex) => {
            const on = lit === padIndex;
            const col = padIndex % 2;
            const row = padIndex < 2 ? 0 : 1;
            return (
              <Pressable
                {...FAST_PRESS}
                key={padIndex}
                onPressIn={() => press(padIndex)}
                accessibilityRole="button"
                accessibilityLabel={`pad ${padIndex + 1}`}
                testID={`reaction-pad-${padIndex}`}
                style={{
                  position: 'absolute',
                  left: post + col * cellW,
                  top: post + row * cellH,
                  width: cellW,
                  height: cellH,
                  alignItems: col === 0 ? 'flex-start' : 'flex-end',
                  justifyContent: row === 0 ? 'flex-start' : 'flex-end',
                  padding: 10,
                }}
              >
                <View style={{ width: target, height: target, alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <Ripple key={index} color={colors.play.cyan} size={target} loop period={700} width={4} /> : null}
                  <View
                    style={{
                      width: target,
                      height: target,
                      borderRadius: target / 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3,
                      borderColor: on ? '#FFFFFF' : PitchInk.chalkSoft,
                      backgroundColor: on ? colors.play.azure : 'rgba(255,255,255,0.08)',
                      transform: [{ scale: on ? 1.06 : 1 }],
                      shadowColor: colors.play.cyan,
                      shadowOpacity: on ? 0.9 : 0,
                      shadowRadius: on ? 18 : 0,
                      shadowOffset: { width: 0, height: 0 },
                    }}
                  >
                    <View
                      style={{
                        width: target * 0.5,
                        height: target * 0.5,
                        borderRadius: target * 0.25,
                        borderWidth: 3,
                        borderColor: on ? colors.play.cyan : PitchInk.chalkSoft,
                        backgroundColor: on ? '#FFFFFF' : 'transparent',
                      }}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
