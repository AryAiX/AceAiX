import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Dimensions, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BatteryFull,
  BellOff,
  Check,
  ChevronRight,
  CircleAlert,
  Clock,
  Headphones,
  RotateCcw,
} from 'lucide-react-native';

import { alpha } from '@/theme/tokens';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  Chip,
  ErrorState,
  Header,
  Loader,
  Reveal,
  Screen,
  Shine,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import {
  deviceClass,
  finishGiSession,
  getGiScenarios,
  getGiState,
  startGiSession,
  submitGiResult,
  type GiResultSummary,
  type GiScenario,
} from '@/lib/api.intelligence';
import { GI_MIN_TESTS_FOR_OVERALL, GI_TESTS, giTest, type GiTestKey } from '@/lib/gi/catalogue';
import { looksComplete, type GiMetrics } from '@/lib/gi/metrics';
import { seedFrom } from '@/lib/gi/random';
import { Warmup } from '@/components/intelligence/Warmup';
import { ReactionGame } from '@/components/intelligence/ReactionGame';
import { GoNoGoGame } from '@/components/intelligence/GoNoGoGame';
import { FlankerGame } from '@/components/intelligence/FlankerGame';
import { TrackingGame } from '@/components/intelligence/TrackingGame';
import { AnticipationGame } from '@/components/intelligence/AnticipationGame';
import { PitchDecisionGame } from '@/components/intelligence/PitchDecisionGame';
import { TestIcon } from '@/components/intelligence/TestIcon';
import { CountdownGate } from '@/components/intelligence/Countdown';
import { HowToPlay } from '@/components/intelligence/HowTo';
import { MedalChip, ResultMoment } from '@/components/intelligence/Result';
import { Confetti } from '@/components/celebrate/Confetti';

type Step = 'loading' | 'ready' | 'warmup' | 'starting' | 'hub' | 'game' | 'finishing' | 'error';

type GamePhase =
  | 'intro'
  | 'practice'
  | 'practiceDone'
  | 'scored'
  | 'submitting'
  | 'result'
  | 'incomplete'
  | 'interrupted';

interface GameState {
  test: GiTestKey;
  phase: GamePhase;
  result?: GiResultSummary;
  /** Bumped on every retry so a fresh component — and fresh timers — mount. */
  attempt: number;
}

/**
 * One sitting of Game Intelligence: get ready → warm up → play the six games
 * in any order → results.
 *
 * Everything is one screen with a small state machine rather than a route per
 * step, for two reasons. The back button must mean "back to the games" during
 * a game, never "out of the feature". And leaving the app mid-round must kill
 * that round — the timers live in the game components, so unmounting the game
 * is what stops them, and one screen owns when that happens.
 */
export default function GiSessionScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [done, setDone] = useState<Partial<Record<GiTestKey, GiResultSummary>>>({});
  const [left, setLeft] = useState<Partial<Record<GiTestKey, number>>>({});
  const [fatigue, setFatigue] = useState<number | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [scenarios, setScenarios] = useState<GiScenario[] | null>(null);
  /* Confetti for a silver or gold, owned here so it can fall over the whole screen. */
  const [burst, setBurst] = useState<string[] | null>(null);
  const baseline = useRef<number | null>(null);

  // ── Load: resume an open session, or start from "get ready". ──
  const load = useCallback(async () => {
    setStep('loading');
    try {
      const state = await getGiState();
      if (state.consent !== 'ok') {
        router.replace(Routes.intelligence);
        return;
      }
      setLeft(state.attempts_left ?? {});
      if (state.open_session) {
        setSessionId(state.open_session.id);
        setDone(state.open_session.done ?? {});
        setStep('hub');
      } else {
        setStep('ready');
      }
    } catch (err) {
      setError(errorMessage(err));
      setStep('error');
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Leaving the app cancels the round in play. ──
  const gameRef = useRef(game);
  gameRef.current = game;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const g = gameRef.current;
      if (next !== 'active' && g && (g.phase === 'practice' || g.phase === 'scored')) {
        setGame({ ...g, phase: 'interrupted' });
      }
    });
    return () => sub.remove();
  }, []);

  const begin = useCallback(
    async (baselineMs: number | null) => {
      baseline.current = baselineMs;
      setStep('starting');
      try {
        const id = await startGiSession({
          deviceClass: deviceClass(width),
          baselineMs: baselineMs == null ? null : Math.round(baselineMs),
          fatigue,
        });
        setSessionId(id);
        setDone({});
        setStep('hub');
      } catch (err) {
        toast.error(errorMessage(err));
        setStep('ready');
      }
    },
    [fatigue, toast, width],
  );

  const openGame = useCallback(
    async (test: GiTestKey) => {
      setGame({ test, phase: 'intro', attempt: 0 });
      setStep('game');
      if (test === 'pitch_decision' && !scenarios && sessionId) {
        try {
          setScenarios(await getGiScenarios(sessionId));
        } catch (err) {
          toast.error(errorMessage(err));
        }
      }
    },
    [scenarios, sessionId, toast],
  );

  const onScored = useCallback(
    async (metrics: GiMetrics) => {
      const g = gameRef.current;
      if (!g || !sessionId) return;
      if (!looksComplete(g.test, metrics)) {
        setGame({ ...g, phase: 'incomplete' });
        return;
      }
      setGame({ ...g, phase: 'submitting' });
      try {
        const result = await submitGiResult(sessionId, g.test, metrics);
        setDone((d) => ({ ...d, [g.test]: result }));
        setLeft((l) => ({ ...l, [g.test]: Math.max(0, (l[g.test] ?? 1) - 1) }));
        setGame({ ...g, phase: 'result', result });
      } catch (err) {
        toast.error(errorMessage(err));
        setGame({ ...g, phase: 'intro' });
      }
    },
    [sessionId, toast],
  );

  const finish = useCallback(async () => {
    if (!sessionId) return;
    setStep('finishing');
    try {
      await finishGiSession(sessionId);
      router.replace({ pathname: Routes.intelligence, params: { fresh: '1' } });
    } catch (err) {
      toast.error(errorMessage(err));
      setStep('hub');
    }
  }, [sessionId, router, toast]);

  const backToHub = () => {
    setBurst(null);
    setGame(null);
    setStep('hub');
  };

  const header = (
    <Header
      back
      title={game && step === 'game' ? t(`intelligence.tests.${giTest(game.test)?.i18n}.name`) : t('intelligence.title')}
      onBack={step === 'game' ? backToHub : undefined}
    />
  );

  // ── Render by step ──
  if (step === 'loading' || step === 'starting' || step === 'finishing') {
    return (
      <Screen header={header}>
        <Loader label={step === 'finishing' ? t('intelligence.analyzing') : undefined} />
      </Screen>
    );
  }

  if (step === 'error') {
    return (
      <Screen header={header}>
        <ErrorState message={error} onRetry={load} />
      </Screen>
    );
  }

  if (step === 'ready') {
    const checks = [
      { Icon: Headphones, text: t('intelligence.readyQuiet') },
      { Icon: BellOff, text: t('intelligence.readyNotifications') },
      { Icon: BatteryFull, text: t('intelligence.readyBattery') },
    ];
    const levels = [1, 2, 3, 4, 5];
    return (
      <Screen header={header} scroll contentStyle={{ gap: spacing.xl }} testID="gi-ready">
        <View style={{ gap: spacing.xs }}>
          <Text variant="title">{t('intelligence.readyTitle')}</Text>
          <Text tone="secondary">{t('intelligence.readyBody')}</Text>
        </View>
        <Card padded style={{ gap: spacing.md }}>
          {checks.map(({ Icon, text }) => (
            <View key={text} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <Icon size={20} color={colors.play.violet} />
              <Text style={{ flex: 1 }}>{text}</Text>
            </View>
          ))}
        </Card>
        <View style={{ gap: spacing.sm }}>
          <Text variant="subheading">{t('intelligence.readyFatigue')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {levels.map((n) => (
              <Chip
                key={n}
                label={t(`intelligence.fatigue${n}`)}
                selected={fatigue === n}
                onPress={() => setFatigue(n)}
                testID={`fatigue-${n}`}
              />
            ))}
          </View>
          {fatigue != null && fatigue >= 4 ? (
            <Text variant="caption" tone="warning">
              {t('intelligence.readyTiredHint')}
            </Text>
          ) : null}
        </View>
        <Button
          label={t('intelligence.readyContinue')}
          fullWidth
          size="lg"
          disabled={fatigue == null}
          onPress={() => setStep('warmup')}
          testID="gi-ready-continue"
        />
      </Screen>
    );
  }

  if (step === 'warmup') {
    return (
      <Screen header={header} scroll contentStyle={{ gap: spacing.xl }} testID="gi-warmup">
        <View style={{ gap: spacing.xs }}>
          <Text variant="title">{t('intelligence.warmupTitle')}</Text>
          <Text tone="secondary">{t('intelligence.warmupBody')}</Text>
        </View>
        <Warmup onDone={begin} />
      </Screen>
    );
  }

  if (step === 'hub' || !game) {
    const valid = GI_TESTS.filter((x) => done[x.key]?.valid).length;
    const anyPlayed = Object.keys(done).length > 0;
    const remaining = Math.max(0, GI_MIN_TESTS_FOR_OVERALL - valid);
    /* The next game to play: the first in order not yet played with attempts
       left. It gets the shine and an "Up next" badge. */
    const next = GI_TESTS.find((x) => !done[x.key] && (left[x.key] ?? 2) > 0)?.key;
    return (
      <Screen header={header} scroll contentStyle={{ gap: spacing.lg }} testID="gi-hub">
        <View style={{ gap: spacing.xs }}>
          <Text variant="title">{t('intelligence.hubTitle')}</Text>
          <Text tone="secondary">{t('intelligence.hubBody')}</Text>
        </View>

        {GI_TESTS.map((info, i) => {
          const result = done[info.key];
          const attempts = left[info.key] ?? 2;
          const blocked = !result && attempts <= 0;
          const hue = colors.play[info.hue];
          return (
            <Reveal key={info.key} index={i}>
              <Tappable
                onPress={() => (!result && !blocked ? openGame(info.key) : undefined)}
                disabled={!!result || blocked}
                testID={`gi-tile-${info.key}`}
              >
                <Card
                  padded
                  level={1}
                  style={next === info.key ? { borderWidth: 1.5, borderColor: alpha(hue, 0.55) } : undefined}
                >
                  {next === info.key ? <Shine color={alpha(hue, 0.2)} radius={theme.radii.lg} every={3.5} /> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <TestIcon test={info.key} color={hue} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                        <Text variant="bodyStrong">{t(`intelligence.tests.${info.i18n}.name`)}</Text>
                        {info.weight >= 0.3 ? (
                          <Badge label={t('intelligence.hubCountsMost')} tone="primary" />
                        ) : null}
                        {next === info.key ? <Badge label={t('intelligence.hubNext')} tone="info" /> : null}
                      </View>
                      <Text variant="caption" tone="muted">
                        {t(`intelligence.tests.${info.i18n}.what`)} ·{' '}
                        {info.seconds >= 60
                          ? t('intelligence.hubMinutes', { n: Math.round(info.seconds / 60) })
                          : t('intelligence.hubSeconds', { n: info.seconds })}
                      </Text>
                      {/* Status sits under the name, not beside it: a long
                          label in a narrow column squeezes the game's name. */}
                      {result && !result.valid ? (
                        <Badge label={t('intelligence.hubRetry')} tone="warning" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                      ) : blocked ? (
                        <Badge label={t('intelligence.hubNoAttempts')} tone="neutral" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                      ) : null}
                    </View>
                    {result?.valid ? (
                      <View style={{ alignItems: 'center', minWidth: 40 }} testID={`gi-tile-medal-${info.key}`}>
                        <MedalChip score={result.score} size={34} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Check size={12} color={colors.success} strokeWidth={3} />
                          <Text variant="captionStrong">{Math.round(result.score ?? 0)}</Text>
                        </View>
                      </View>
                    ) : !result && !blocked ? (
                      <ChevronRight size={20} color={colors.textMuted} />
                    ) : null}
                  </View>
                </Card>
              </Tappable>
            </Reveal>
          );
        })}

        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {remaining > 0 ? (
            <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
              {t('intelligence.hubFinishNeeds', { count: remaining })}
            </Text>
          ) : null}
          <Button
            label={t('intelligence.hubFinish')}
            fullWidth
            size="lg"
            disabled={!anyPlayed}
            onPress={finish}
            testID="gi-finish"
          />
          <Button
            label={t('intelligence.hubPause')}
            variant="ghost"
            fullWidth
            onPress={() => router.back()}
          />
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {t('intelligence.hubPauseBody')}
          </Text>
        </View>
      </Screen>
    );
  }

  // ── A game ──
  const info = giTest(game.test)!;
  const stem = `intelligence.tests.${info.i18n}`;
  const hue = colors.play[info.hue];
  const seed = seedFrom(`${sessionId}:${game.test}:${game.attempt}`);
  const playing = game.phase === 'practice' || game.phase === 'scored';
  const mode = game.phase === 'practice' ? 'practice' : 'scored';
  const key = `${game.test}-${game.phase}-${game.attempt}`;

  const renderGame = () => {
    const onDone = (m: GiMetrics) => {
      if (mode === 'practice') setGame((g) => (g ? { ...g, phase: 'practiceDone' } : g));
      else onScored(m);
    };
    switch (game.test) {
      case 'reaction':
        return <ReactionGame key={key} mode={mode} seed={seed} onDone={onDone} />;
      case 'go_no_go':
        return <GoNoGoGame key={key} mode={mode} seed={seed} onDone={onDone} />;
      case 'flanker':
        return <FlankerGame key={key} mode={mode} seed={seed} onDone={onDone} />;
      case 'tracking':
        return <TrackingGame key={key} mode={mode} seed={seed} onDone={onDone} />;
      case 'anticipation':
        return <AnticipationGame key={key} mode={mode} seed={seed} onDone={onDone} />;
      case 'pitch_decision':
        return scenarios || mode === 'practice' ? (
          <PitchDecisionGame key={key} mode={mode} scenarios={scenarios ?? []} onDone={onDone} />
        ) : (
          <Loader />
        );
    }
  };

  return (
    <Screen header={header} scroll={!playing} contentStyle={{ gap: spacing.xl }} testID="gi-game">
      {playing ? (
        <CountdownGate key={key} hue={hue}>
          {renderGame()}
        </CountdownGate>
      ) : (
        <Reveal>
          <Card padded style={{ gap: spacing.lg, alignItems: 'center' }}>
            <TestIcon test={game.test} color={hue} size={56} />
            <View style={{ gap: spacing.xs, alignItems: 'center' }}>
              <Text variant="overline" tone="muted">
                {t(`${stem}.what`)}
              </Text>
              <Text variant="title" style={{ textAlign: 'center' }}>
                {t(`${stem}.name`)}
              </Text>
            </View>

            {game.phase === 'intro' ? (
              <>
                <HowToPlay test={game.test} />
                <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
                  {t('intelligence.practiceBody')}
                </Text>
                <Button
                  label={t('intelligence.practice')}
                  fullWidth
                  size="lg"
                  onPress={() => setGame({ ...game, phase: 'practice' })}
                  testID="gi-practice"
                />
              </>
            ) : null}

            {game.phase === 'practiceDone' ? (
              <>
                <Text variant="heading">{t('intelligence.practiceDone')}</Text>
                <Text tone="secondary" style={{ textAlign: 'center' }}>
                  {t(`${stem}.how`)}
                </Text>
                <Button
                  label={t('intelligence.startScored')}
                  fullWidth
                  size="lg"
                  onPress={() => setGame({ ...game, phase: 'scored' })}
                  testID="gi-start-scored"
                />
              </>
            ) : null}

            {game.phase === 'submitting' ? <Loader label={t('intelligence.submitting')} /> : null}

            {game.phase === 'result' && game.result ? (
              game.result.valid ? (
                <>
                  <Text variant="heading">{t('intelligence.gameDone')}</Text>
                  <ResultMoment score={game.result.score ?? 0} hue={hue} onBurst={setBurst} />
                  <Button label={t('intelligence.backToHub')} fullWidth size="lg" onPress={backToHub} testID="gi-back-hub" />
                </>
              ) : (
                <>
                  <CircleAlert size={28} color={colors.warning} />
                  <Text variant="heading">{t('intelligence.gameInvalid')}</Text>
                  <Text tone="secondary" style={{ textAlign: 'center' }}>
                    {t('intelligence.gameInvalidBody')}
                  </Text>
                  <Button label={t('intelligence.backToHub')} fullWidth onPress={backToHub} />
                </>
              )
            ) : null}

            {game.phase === 'incomplete' || game.phase === 'interrupted' ? (
              <>
                {game.phase === 'interrupted' ? (
                  <Clock size={28} color={colors.warning} />
                ) : (
                  <CircleAlert size={28} color={colors.warning} />
                )}
                <Text variant="heading" style={{ textAlign: 'center' }}>
                  {t(game.phase === 'interrupted' ? 'intelligence.interrupted' : 'intelligence.gameIncomplete')}
                </Text>
                <Text tone="secondary" style={{ textAlign: 'center' }}>
                  {t(game.phase === 'interrupted' ? 'intelligence.interruptedBody' : 'intelligence.gameIncompleteBody')}
                </Text>
                <Button
                  label={t('intelligence.tryAgain')}
                  icon={<RotateCcw size={18} color={colors.textOnBrand} />}
                  fullWidth
                  size="lg"
                  onPress={() => setGame({ ...game, phase: 'intro', attempt: game.attempt + 1 })}
                />
                <Button label={t('intelligence.backToHub')} variant="ghost" fullWidth onPress={backToHub} />
              </>
            ) : null}
          </Card>
        </Reveal>
      )}
      {burst && game.phase === 'result' ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <Confetti
            origin={{ x: Dimensions.get('window').width / 2, y: 200 }}
            colors={burst}
            count={40}
            onDone={() => setBurst(null)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
