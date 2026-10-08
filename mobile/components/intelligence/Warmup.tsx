import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { now } from '@/lib/gi/random';
import { median } from '@/lib/gi/metrics';
import { FAST_PRESS, RoundBar, useTimers } from './shared';
import { Ripple } from './art';

const TRIALS = 5;

/**
 * The warm-up: five simple reactions to a circle turning green.
 *
 * It does two jobs. It gets the hand going before anything counts, and its
 * median is stored on the session as `baseline_ms` — simple reaction time on
 * this phone, which folds in the phone's own touch latency. When there is
 * enough data to correct scores per device, this is the number that will do it.
 */
export function Warmup({ onDone }: { onDone: (baselineMs: number | null) => void }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const { later, cancel } = useTimers();

  const [index, setIndex] = useState(0);
  const [state, setState] = useState<'wait' | 'go' | 'early'>('wait');
  const greenAt = useRef(0);
  /* The circle's state as a ref too: two taps in one frame must not both
     count as reactions to the same green. */
  const phase = useRef<'wait' | 'go' | 'early'>('wait');
  const times = useRef<number[]>([]);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);

  const arm = () => {
    phase.current = 'wait';
    setState('wait');
    pending.current = later(() => {
      greenAt.current = now();
      phase.current = 'go';
      setState('go');
    }, 900 + Math.random() * 1400);
  };

  useEffect(() => {
    if (index >= TRIALS) {
      if (!done.current) {
        done.current = true;
        onDone(median(times.current));
      }
      return;
    }
    arm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const press = () => {
    if (index >= TRIALS) return;
    if (phase.current === 'wait') {
      cancel(pending.current);
      phase.current = 'early';
      setState('early');
      later(arm, 900);
      return;
    }
    if (phase.current !== 'go') return;
    phase.current = 'early'; // consumed; the next trial re-arms it
    Haptics.selectionAsync().catch(() => {});
    times.current.push(now() - greenAt.current);
    setIndex((i) => i + 1);
  };

  const fill = state === 'go' ? colors.play.mint : state === 'early' ? colors.danger : colors.surfaceSunken;
  const label =
    state === 'go'
      ? t('intelligence.warmupTap')
      : state === 'early'
        ? t('intelligence.warmupEarly')
        : t('intelligence.warmupWait');

  return (
    <View style={{ gap: spacing.xl, alignItems: 'center' }}>
      <View style={{ alignSelf: 'stretch' }}>
        <RoundBar index={index} total={TRIALS} label={t('intelligence.warmupTitle')} />
      </View>
      <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
      {/* Two rings burst out as it turns green: the cue arrives, it does not just appear. */}
      {state === 'go' ? (
        <>
          <Ripple key={`a${index}`} color={colors.play.mint} size={220} width={6} period={700} />
          <Ripple key={`b${index}`} color={colors.play.mint} size={220} width={3} period={1100} />
        </>
      ) : null}
      <Pressable
        {...FAST_PRESS}
        onPressIn={press}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID="warmup-circle"
        style={{
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: fill,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.border,
        }}
      >
        <Text variant="heading" color={state === 'wait' ? colors.textSecondary : '#FFFFFF'}>
          {label}
        </Text>
      </Pressable>
      </View>
    </View>
  );
}
