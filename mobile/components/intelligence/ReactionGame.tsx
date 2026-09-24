import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';
import { now, seededRng } from '@/lib/gi/random';
import { reactionPlan } from '@/lib/gi/trials';
import { reactionMetrics, type ReactionMetrics, type ReactionRow } from '@/lib/gi/metrics';
import { FAST_PRESS, RoundBar, useTimers, type GameProps } from './shared';

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

  const size = 132;

  return (
    <View style={{ gap: spacing.xl }}>
      <RoundBar
        index={index}
        total={plan.length}
        label={t(mode === 'practice' ? 'intelligence.practice' : 'intelligence.scoredLabel')}
      />
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: spacing.lg,
          paddingVertical: spacing.xl,
          borderRadius: radii.xl,
          backgroundColor:
            flash === 'miss' ? colors.dangerSoft : flash === 'hit' ? colors.successSoft : 'transparent',
        }}
      >
        {[0, 1, 2, 3].map((pad) => {
          const on = lit === pad;
          return (
            <Pressable
              {...FAST_PRESS}
              key={pad}
              onPressIn={() => press(pad)}
              accessibilityRole="button"
              accessibilityLabel={`pad ${pad + 1}`}
              testID={`reaction-pad-${pad}`}
              style={{
                width: size,
                height: size,
                borderRadius: radii.xl,
                backgroundColor: on ? colors.play.azure : colors.surfaceAlt,
                borderWidth: 2,
                borderColor: on ? colors.play.cyan : colors.border,
                transform: [{ scale: on ? 1.04 : 1 }],
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
