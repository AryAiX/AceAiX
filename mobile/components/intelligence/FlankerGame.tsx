import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';
import { now, seededRng } from '@/lib/gi/random';
import { flankerPlan } from '@/lib/gi/trials';
import { flankerMetrics, type FlankerMetrics, type FlankerRow } from '@/lib/gi/metrics';
import { BigChoice, RoundBar, useTimers, type GameProps } from './shared';

const WINDOW_MS = 1500;

/**
 * Focus Arrows — the flanker task.
 *
 * Five arrows; answer for the middle one. When the four around it disagree the
 * answer takes longer, and how much longer is the measure: it is a difference
 * between two times on the same screen, so the phone's touch latency cancels
 * out of it.
 */
export function FlankerGame({ mode, seed, onDone }: GameProps<FlankerMetrics>) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const { later, cancel } = useTimers();

  const plan = useMemo(() => flankerPlan(seededRng(seed), mode), [seed, mode]);
  const [index, setIndex] = useState(0);
  const [showing, setShowing] = useState(false);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);

  const shownAt = useRef(0);
  /* Answered-yet, as a ref: a tap and the timeout can both arrive before a
     re-render, and only the first may record the trial. */
  const resolved = useRef(true);
  const rows = useRef<FlankerRow[]>([]);
  const windowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);

  const answer = useCallback(
    (dir: 'left' | 'right' | null) => {
      if (resolved.current) return;
      resolved.current = true;
      cancel(windowTimer.current);
      const trial = plan[index];
      const rt = dir == null ? null : now() - shownAt.current;
      const correct = dir === trial.dir;
      rows.current.push({ congruent: trial.congruent, correct, rt });
      setShowing(false);
      setFlash(correct ? 'good' : 'bad');
      later(() => {
        setFlash(null);
        setIndex((i) => i + 1);
      }, 200);
    },
    [cancel, later, plan, index],
  );

  useEffect(() => {
    if (index >= plan.length) {
      if (!done.current) {
        done.current = true;
        onDone(flankerMetrics(rows.current));
      }
      return;
    }
    later(() => {
      shownAt.current = now();
      resolved.current = false;
      setShowing(true);
      windowTimer.current = later(() => answer(null), WINDOW_MS);
    }, plan[index].gap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const trial = plan[Math.min(index, plan.length - 1)];
  const flankDir = trial.congruent ? trial.dir : trial.dir === 'left' ? 'right' : 'left';

  return (
    <View style={{ gap: spacing.xl }}>
      <RoundBar
        index={index}
        total={plan.length}
        label={t(mode === 'practice' ? 'intelligence.practice' : 'intelligence.scoredLabel')}
      />
      <View
        testID="flanker-arrows"
        style={{
          height: 180,
          borderRadius: radii.xl,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.xs,
          backgroundColor:
            flash === 'bad' ? colors.dangerSoft : flash === 'good' ? colors.successSoft : colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {showing ? (
          <>
            <Arrow dir={flankDir} color={colors.textSecondary} />
            <Arrow dir={flankDir} color={colors.textSecondary} />
            <Arrow dir={trial.dir} color={colors.text} centre />
            <Arrow dir={flankDir} color={colors.textSecondary} />
            <Arrow dir={flankDir} color={colors.textSecondary} />
          </>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <BigChoice
          label={t('intelligence.tests.flanker.left')}
          icon={<ArrowLeft size={22} color={colors.text} />}
          onPress={() => answer('left')}
          testID="flanker-left"
        />
        <BigChoice
          label={t('intelligence.tests.flanker.right')}
          iconRight={<ArrowRight size={22} color={colors.text} />}
          onPress={() => answer('right')}
          testID="flanker-right"
        />
      </View>
    </View>
  );
}

function Arrow({ dir, color, centre }: { dir: 'left' | 'right'; color: string; centre?: boolean }) {
  const Icon = dir === 'left' ? ArrowLeft : ArrowRight;
  return <Icon size={centre ? 48 : 40} color={color} strokeWidth={3} />;
}
