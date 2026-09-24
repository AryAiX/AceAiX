import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { now, seededRng } from '@/lib/gi/random';
import { goNoGoPlan } from '@/lib/gi/trials';
import { goNoGoMetrics, type GoNoGoMetrics, type GoNoGoRow } from '@/lib/gi/metrics';
import { FAST_PRESS, RoundBar, useTimers, type GameProps } from './shared';

/** A ball stays up this long; not tapping by then is a decision. */
const WINDOW_MS = 800;

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
  const { later, cancel } = useTimers();

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
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor:
            flash === 'bad' ? colors.dangerSoft : flash === 'good' ? colors.successSoft : colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {ball ? (
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: ball === 'go' ? colors.play.mint : colors.danger,
              borderWidth: 6,
              borderColor: ball === 'go' ? '#0A9E77' : '#B3261E',
            }}
          />
        ) : null}
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xl }}>
        <Legend color={colors.play.mint} label={t('intelligence.tests.goNoGo.go')} />
        <Legend color={colors.danger} label={t('intelligence.tests.goNoGo.stop')} />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color }} />
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  );
}
