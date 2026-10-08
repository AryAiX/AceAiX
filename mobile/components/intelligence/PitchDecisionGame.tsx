import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Footprints, Goal } from 'lucide-react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { now } from '@/lib/gi/random';
import { decisionMetrics, type DecisionMetrics, type DecisionRow } from '@/lib/gi/metrics';
import type { GiScenario, GiScenarioEntity } from '@/lib/api.intelligence';
import { NATIVE_DRIVER } from '@/lib/motion';
import { FAST_PRESS, BigChoice, RoundBar, useArenaWidth, useTimers } from './shared';
import { Pitch, PITCH_ASPECT } from './Pitch';
import { Football, Jersey, Ripple } from './art';

const PLAY_MS = 1500;
const CHOOSE_MS = 3000;
const DOT = 32;
/** Shirt numbers for teammates, in layout order. Decoration — the id is the answer. */
const MATE_NUMBERS = [7, 9, 11, 8, 6];
const token = { position: 'absolute' as const, width: DOT, height: DOT };

type Phase = 'wait' | 'play' | 'choose' | 'chosen';

/**
 * The practice clip. It lives in the app, not the database, because it is not
 * scored and because showing it cannot spoil a scored one: a clean 2-v-1 with
 * a free teammate, where the answer is not in doubt and the player can be told
 * so.
 */
export const PRACTICE_SCENARIOS: GiScenario[] = [
  {
    id: 'practice-1',
    layout: {
      title: 'practice',
      you: { x: 0.5, y: 0.7, tx: 0.5, ty: 0.55 },
      mates: [{ id: 'a', x: 0.22, y: 0.62, tx: 0.2, ty: 0.4 }],
      opps: [{ x: 0.5, y: 0.42, tx: 0.48, ty: 0.46 }],
      keeper: { x: 0.5, y: 0.04, tx: 0.5, ty: 0.05 },
    },
  },
];
const PRACTICE_ANSWER: Record<string, string> = { 'practice-1': 'a' };

interface Props {
  mode: 'practice' | 'scored';
  scenarios: GiScenario[];
  onDone: (metrics: DecisionMetrics) => void;
}

/**
 * Pitch Decision — the football one, and the one that counts most.
 *
 * A short passage of play runs on a top-down pitch, then freezes. Three
 * seconds to choose: tap a teammate to pass, or Shoot, or Dribble. The answer
 * key is on the server; this component records the choice and the time taken,
 * and never learns whether it was right.
 */
export function PitchDecisionGame({ mode, scenarios, onDone }: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const { later, cancel } = useTimers();
  const { width, onLayout } = useArenaWidth();

  const list = mode === 'practice' ? PRACTICE_SCENARIOS : scenarios;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('wait');
  const [chosen, setChosen] = useState<string | null>(null);

  const progress = useRef(new Animated.Value(0)).current;
  const clock = useRef(new Animated.Value(1)).current;
  const frozenAt = useRef(0);
  /* Open for a choice — a ref, so a tap and the three-second timeout cannot
     both record the same scenario before React re-renders. */
  const open = useRef(false);
  const rows = useRef<DecisionRow[]>([]);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (index >= list.length) {
      if (!done.current) {
        done.current = true;
        onDone(decisionMetrics(rows.current));
      }
      return;
    }
    setChosen(null);
    setPhase('wait');
    progress.setValue(0);
    clock.setValue(1);

    later(() => {
      setPhase('play');
      Animated.timing(progress, {
        toValue: 1,
        duration: PLAY_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (!finished) return;
        frozenAt.current = now();
        open.current = true;
        setPhase('choose');
        Animated.timing(clock, {
          toValue: 0,
          duration: CHOOSE_MS,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start();
        timeout.current = later(() => choose(null), CHOOSE_MS);
      });
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const choose = (option: string | null) => {
    if (!open.current) return;
    open.current = false;
    cancel(timeout.current);
    clock.stopAnimation();
    const scenario = list[index];
    const ms = option == null ? null : now() - frozenAt.current;
    rows.current.push({ scenario: scenario.id, option, ms });
    if (option) Haptics.selectionAsync().catch(() => {});
    setChosen(option ?? '__timeout');
    setPhase('chosen');
    later(() => setIndex((i) => i + 1), mode === 'practice' ? 1400 : 450);
  };

  const h = Math.round(width * PITCH_ASPECT);
  const scenario = list[Math.min(index, list.length - 1)];
  const lay = scenario?.layout;

  const at = (e: GiScenarioEntity) => ({
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [e.x * width - DOT / 2, e.tx * width - DOT / 2],
        }),
      },
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [e.y * h - DOT / 2, e.ty * h - DOT / 2],
        }),
      },
    ],
  });

  const canChoose = phase === 'choose';
  const frozen = phase === 'choose' || phase === 'chosen';
  const practiceRight =
    mode === 'practice' && phase === 'chosen' && chosen === PRACTICE_ANSWER[scenario?.id ?? ''];
  const px = (x: number) => x * width;
  const py = (y: number) => y * h;
  const everyone: GiScenarioEntity[] = lay ? [lay.you, ...lay.mates, ...lay.opps, lay.keeper] : [];

  return (
    <View style={{ gap: spacing.md }}>
      <RoundBar
        index={index}
        total={list.length}
        label={t(mode === 'practice' ? 'intelligence.practice' : 'intelligence.scoredLabel')}
      />

      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }}>
        <Animated.View
          style={{
            height: 6,
            backgroundColor: colors.play.flame,
            width: clock.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>

      <View onLayout={onLayout} style={{ width: '100%' }} testID="pitch-decision">
        {lay ? (
          <Pitch width={width}>
            {/* Where everyone ran from: faint trails that fade in with the run. */}
            <Animated.View
              pointerEvents="none"
              style={{ position: 'absolute', left: 0, top: 0, opacity: phase === 'wait' ? 0 : progress }}
            >
              <Svg width={width} height={h}>
                {everyone.map((e, i) => (
                  <React.Fragment key={i}>
                    <Line
                      x1={px(e.x)}
                      y1={py(e.y)}
                      x2={px(e.tx)}
                      y2={py(e.ty)}
                      stroke="rgba(255,255,255,0.45)"
                      strokeWidth={3}
                      strokeDasharray="1 7"
                      strokeLinecap="round"
                    />
                    <Circle cx={px(e.x)} cy={py(e.y)} r={3} fill="rgba(255,255,255,0.35)" />
                  </React.Fragment>
                ))}
              </Svg>
            </Animated.View>

            {/* When it freezes, a lane from you to every teammate. */}
            {frozen ? (
              <Svg width={width} height={h} style={{ position: 'absolute' }} pointerEvents="none">
                {lay.mates.map((m) => {
                  const picked = chosen === m.id;
                  return (
                    <Line
                      key={m.id}
                      x1={px(lay.you.tx)}
                      y1={py(lay.you.ty)}
                      x2={px(m.tx)}
                      y2={py(m.ty)}
                      stroke={picked ? colors.play.lime : 'rgba(255,255,255,0.85)'}
                      strokeWidth={picked ? 4 : 2.5}
                      strokeDasharray="8 7"
                      strokeLinecap="round"
                      opacity={phase === 'chosen' && !picked ? 0.35 : 1}
                    />
                  );
                })}
              </Svg>
            ) : null}

            {lay.opps.map((o, i) => (
              <Animated.View key={`o${i}`} pointerEvents="none" style={[token, at(o)]}>
                <Jersey size={DOT} fill={colors.danger} />
              </Animated.View>
            ))}
            <Animated.View pointerEvents="none" style={[token, at(lay.keeper)]}>
              <Jersey size={DOT} fill={colors.play.amber} number={1} numberColor="#14161A" />
            </Animated.View>
            {lay.mates.map((m, i) => {
              const picked = chosen === m.id;
              return (
                <Animated.View key={m.id} style={[token, at(m)]}>
                  {canChoose ? (
                    <Ripple color="#FFFFFF" size={DOT + 12} loop period={1000} style={{ left: -6, top: -6 }} />
                  ) : null}
                  {canChoose || picked ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: -6,
                        top: -6,
                        width: DOT + 12,
                        height: DOT + 12,
                        borderRadius: (DOT + 12) / 2,
                        borderWidth: 3,
                        borderColor: picked ? colors.play.lime : '#FFFFFF',
                      }}
                    />
                  ) : null}
                  <Pressable
                    {...FAST_PRESS}
                    onPressIn={() => choose(m.id ?? null)}
                    disabled={!canChoose}
                    hitSlop={14}
                    accessibilityRole="button"
                    accessibilityLabel={t('intelligence.tests.pitchDecision.pass')}
                    testID={`mate-${m.id}`}
                    style={{
                      width: DOT,
                      height: DOT,
                      transform: picked ? [{ scale: 1.2 }] : undefined,
                    }}
                  >
                    <Jersey size={DOT} fill={colors.play.azure} number={MATE_NUMBERS[i % MATE_NUMBERS.length]} />
                  </Pressable>
                </Animated.View>
              );
            })}
            <Animated.View pointerEvents="none" style={[token, at(lay.you)]}>
              <Jersey size={DOT} fill={colors.play.flame} number={10} />
              {/* The ball, glowing at your feet — you are the one on it. */}
              <View style={{ position: 'absolute', right: -9, bottom: -7, width: 16, height: 16 }}>
                <View
                  style={{
                    position: 'absolute',
                    left: -5,
                    top: -5,
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: 'rgba(255,255,255,0.35)',
                    shadowColor: '#FFFFFF',
                    shadowOpacity: 0.9,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                />
                <Football size={16} />
              </View>
              <View
                style={{
                  position: 'absolute',
                  top: DOT + 2,
                  left: -14,
                  width: DOT + 28,
                  alignItems: 'center',
                }}
              >
                <View style={{ paddingHorizontal: 5, borderRadius: 4, backgroundColor: colors.play.flame }}>
                  <Text variant="captionStrong" color="#FFFFFF" style={{ fontSize: 10, lineHeight: 14 }}>
                    {t('intelligence.tests.pitchDecision.you')}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </Pitch>
        ) : null}
      </View>

      <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {practiceRight
          ? t('intelligence.practiceDone')
          : canChoose
            ? t('intelligence.tests.pitchDecision.pass')
            : phase === 'chosen' && chosen === '__timeout'
              ? t('intelligence.timeUp')
              : ' '}
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <BigChoice
          label={t('intelligence.tests.pitchDecision.shoot')}
          icon={<Goal size={20} color={colors.text} />}
          disabled={!canChoose}
          onPress={() => choose('shoot')}
          testID="choice-shoot"
        />
        <BigChoice
          label={t('intelligence.tests.pitchDecision.dribble')}
          icon={<Footprints size={20} color={colors.text} />}
          disabled={!canChoose}
          onPress={() => choose('dribble')}
          testID="choice-dribble"
        />
      </View>
    </View>
  );
}

