import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { RotateCcw } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  ConfirmSheet,
  EmptyState,
  Header,
  Loader,
  Reveal,
  Screen,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import { submitSportFit, type SfQuality } from '@/lib/api.sportfit';
import {
  SF_ITEMS,
  SF_SCALE,
  answeredCount,
  isComplete,
  type SfAnswer,
  type SfAnswers,
} from '@/lib/sportfit/catalogue';

/**
 * Sport Fit — the statements, one at a time.
 *
 * One statement per screen, five answers as big buttons, and the next
 * statement arrives on its own after a tap. Back steps to the previous
 * statement; leaving the screen asks before throwing the answers away.
 * Nothing is saved until the last answer: the server scores the whole set or
 * nothing (`sport_fit_submit`).
 */
export default function SportFitQuestions() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const navigation = useNavigation();
  const t = useT();
  const toast = useToast();

  const [answers, setAnswers] = useState<SfAnswers>({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [retry, setRetry] = useState<Exclude<SfQuality, 'ok'> | null>(null);
  const [leaving, setLeaving] = useState(false);
  const startedAt = useRef(Date.now());
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(answers);
  const submittingRef = useRef(false);
  /** Set before replaying a leave the player already confirmed, so the listener does not ask again. */
  const allowLeave = useRef(false);
  /** Set before the successful replace, so that removal is not a discard. */
  const submitted = useRef(false);
  const pendingAction = useRef<Parameters<typeof navigation.dispatch>[0] | null>(null);
  answersRef.current = answers;
  submittingRef.current = submitting;

  useEffect(() => () => {
    if (advance.current) clearTimeout(advance.current);
  }, []);

  // One listener for the header (via router.back), the hardware button, and the back gesture.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeave.current || submitted.current) return;
      if (submittingRef.current || answeredCount(answersRef.current) === 0) {
        if (submittingRef.current) e.preventDefault();
        return;
      }
      e.preventDefault();
      pendingAction.current = e.data.action;
      setLeaving(true);
    });
    return unsubscribe;
  }, [navigation]);

  const total = SF_ITEMS.length;
  const item = SF_ITEMS[index];
  const chosen = answers[item];

  const submit = useCallback(
    async (final: SfAnswers) => {
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const out = await submitSportFit(final, (Date.now() - startedAt.current) / 1000);
        if (out.quality === 'ok') {
          submitted.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          router.replace({ pathname: Routes.sportFit, params: { fresh: '1' } });
          return;
        }
        setRetry(out.quality);
      } catch (err) {
        toast.error(errorMessage(err));
      }
      submittingRef.current = false;
      setSubmitting(false);
    },
    [router, toast],
  );

  const choose = useCallback(
    (value: SfAnswer) => {
      Haptics.selectionAsync().catch(() => {});
      const next = { ...answers, [item]: value };
      answersRef.current = next;
      setAnswers(next);
      if (advance.current) clearTimeout(advance.current);
      advance.current = setTimeout(() => {
        if (index < total - 1) setIndex(index + 1);
        else if (isComplete(next)) submit(next);
      }, 180);
    },
    [answers, item, index, total, submit],
  );

  const back = useCallback(() => {
    if (submitting) return;
    if (index > 0) setIndex(index - 1);
    else router.back();
  }, [index, submitting, router]);

  const restart = useCallback(() => {
    answersRef.current = {};
    submittingRef.current = false;
    setAnswers({});
    setIndex(0);
    setRetry(null);
    setSubmitting(false);
    startedAt.current = Date.now();
  }, []);

  const confirmLeave = () => {
    setLeaving(false);
    allowLeave.current = true;
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) navigation.dispatch(action);
    else router.back();
  };

  const leaveSheet = (
    <ConfirmSheet
      visible={leaving}
      title={t('sportFit.leaveTitle')}
      message={t('sportFit.leaveBody')}
      confirmLabel={t('sportFit.leaveConfirm')}
      cancelLabel={t('sportFit.leaveCancel')}
      destructive
      onConfirm={confirmLeave}
      onCancel={() => {
        pendingAction.current = null;
        setLeaving(false);
      }}
    />
  );

  const header = <Header back title={t('sportFit.questionsTitle')} onBack={back} />;

  if (retry) {
    const body =
      retry === 'too_fast' ? t('sportFit.retryTooFast') : retry === 'check_failed' ? t('sportFit.retryCheck') : t('sportFit.retryStraight');
    return (
      <Screen header={header} testID="sf-retry">
        <EmptyState
          icon={<RotateCcw size={26} color={colors.play.violet} />}
          title={t('sportFit.retryTitle')}
          body={body}
          actionLabel={t('sportFit.retryAction')}
          onAction={restart}
        />
        {leaveSheet}
      </Screen>
    );
  }

  if (submitting) {
    return (
      <Screen header={header} testID="sf-submitting">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.xxl }}>
          <Loader />
          <Text tone="secondary">{t('sportFit.submitting')}</Text>
        </View>
        {leaveSheet}
      </Screen>
    );
  }

  const labels: Record<SfAnswer, string> = {
    1: t('sportFit.answer1'),
    2: t('sportFit.answer2'),
    3: t('sportFit.answer3'),
    4: t('sportFit.answer4'),
    5: t('sportFit.answer5'),
  };

  return (
    <Screen header={header} scroll contentStyle={{ gap: spacing.xl }} testID="sf-questions">
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="captionStrong" tone="muted">
            {t('sportFit.progress', { n: index + 1, total })}
          </Text>
          <Text variant="caption" tone="muted">
            {t('sportFit.questionHint')}
          </Text>
        </View>
        <View
          style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: total, now: index + 1 }}
        >
          <View
            style={{
              width: `${((index + 1) / total) * 100}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.play.violet,
            }}
          />
        </View>
      </View>

      <Reveal key={item}>
        <View style={{ minHeight: 120, justifyContent: 'center', paddingVertical: spacing.lg }}>
          <Text variant="title" style={{ textAlign: 'center' }} testID="sf-statement">
            {t(`sportFit.item.${item}`)}
          </Text>
        </View>
      </Reveal>

      <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
        {SF_SCALE.map((value) => {
          const selected = chosen === value;
          return (
            <Tappable
              key={value}
              onPress={() => choose(value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={labels[value]}
              testID={`sf-answer-${value}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                borderRadius: theme.radii.lg,
                borderWidth: 2,
                borderColor: selected ? colors.play.violet : colors.border,
                backgroundColor: selected ? colors.primarySoft : colors.surface,
              }}
            >
              <ScaleDots value={value} color={selected ? colors.play.violet : colors.textMuted} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {labels[value]}
              </Text>
            </Tappable>
          );
        })}
      </View>

      {index > 0 ? (
        <Button label={t('sportFit.back')} variant="ghost" onPress={back} testID="sf-back" />
      ) : null}

      {leaveSheet}
    </Screen>
  );
}

/** Five dots, filled up to the answer: the scale reads at a glance in any language. */
function ScaleDots({ value, color }: { value: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          key={n}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: n <= value ? color : colors.surfaceSunken,
          }}
        />
      ))}
    </View>
  );
}
