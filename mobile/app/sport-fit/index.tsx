import React, { useEffect, useState } from 'react';
import { Dimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Brain,
  CalendarClock,
  Clock,
  Compass,
  EyeOff,
  Lightbulb,
  ListChecks,
  Lock,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  AnimatedGradient,
  Badge,
  Button,
  Card,
  ConfirmSheet,
  Divider,
  EmptyState,
  ErrorState,
  Header,
  Reveal,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { Confetti } from '@/components/celebrate/Confetti';
import { InfoNote } from '@/components/settings/Notes';
import { SubScoreBar } from '@/components/intelligence/shared';
import { useAsync } from '@/hooks/useAsync';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import { fullDate } from '@/lib/format';
import { canRetake, deleteMySportFit, getSportFitState, type SfFit, type SfState } from '@/lib/api.sportfit';
import { SF_HUE, SF_MINDSET, type SfDimension } from '@/lib/sportfit/catalogue';

/**
 * Sport Fit — the home of the feature.
 *
 * One screen, three shapes, decided by `sport_fit_my_state`:
 *
 *   no result, consent not 'ok' → why not, and the one thing that fixes it
 *   no result yet                → what this is, and "Start"
 *   a result                     → the three best sports and why, every sport,
 *                                  the mindset behind it, and a way to delete
 *                                  it all — even after a parent turns "mindset"
 *                                  off. Then "Answer again" stays hidden.
 */
export default function SportFitScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const reduced = useReducedMotion();
  const params = useLocalSearchParams<{ fresh?: string }>();

  const state = useAsync<SfState>(() => getSportFitState(), [], { refetchOnFocus: true });
  const [celebrate, setCelebrate] = useState(params.fresh === '1');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (params.fresh === '1') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [params.fresh]);

  const header = <Header back title={t('sportFit.title')} />;

  if (state.loading && !state.data) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (state.error || !state.data) {
    return (
      <Screen header={header}>
        <ErrorState message={state.error} onRetry={state.reload} />
      </Screen>
    );
  }

  const data = state.data;

  // ── Not allowed yet, and nothing saved to show ──
  // A result stays readable and deletable after a parent turns "mindset" off.
  if (data.consent !== 'ok' && !data.result) {
    let body: React.ReactNode;
    const askParent = () => router.push({ pathname: Routes.settingsGuardian, params: { add: 'mindset' } });
    if (data.consent === 'guardian_required') {
      body = data.guardian_pending ? (
        <EmptyState
          icon={<Clock size={26} color={colors.warning} />}
          title={t('sportFit.consentPendingTitle')}
          body={t('sportFit.consentPendingBody')}
          actionLabel={t('sportFit.consentAction')}
          onAction={askParent}
        />
      ) : (
        <EmptyState
          icon={<ShieldCheck size={26} color={colors.play.violet} />}
          title={t('sportFit.consentTitle')}
          body={t('sportFit.consentBody', { age: data.self_consent_age })}
          actionLabel={t('sportFit.consentAction')}
          onAction={askParent}
        />
      );
    } else if (data.consent === 'age_unknown') {
      body = (
        <EmptyState
          icon={<CalendarClock size={26} color={colors.textMuted} />}
          title={t('sportFit.consentAgeUnknownTitle')}
          body={t('sportFit.consentAgeUnknownBody')}
          actionLabel={t('sportFit.consentAgeUnknownAction')}
          onAction={() => router.push(Routes.editProfile)}
        />
      );
    } else {
      body = (
        <EmptyState
          icon={<Lock size={26} color={colors.textMuted} />}
          title={t('sportFit.notAthleteTitle')}
          body={t(data.consent === 'suspended' ? 'sportFit.suspendedBody' : 'sportFit.notAthleteBody')}
        />
      );
    }
    return (
      <Screen header={header} testID="sf-gate">
        {body}
      </Screen>
    );
  }

  // ── Nothing yet: the intro ──
  const result = data.result;
  if (!result) {
    const points = [
      { Icon: ListChecks, text: t('sportFit.introPoint1') },
      { Icon: EyeOff, text: t('sportFit.introPoint2') },
      { Icon: Brain, text: t('sportFit.introPoint3') },
    ];
    return (
      <Screen header={header} scroll contentStyle={{ gap: spacing.xl }} testID="sf-intro">
        <Reveal>
          <AnimatedGradient colors={theme.gradients.cool} radius={theme.radii.xl} style={{ padding: spacing.xl, gap: spacing.md }}>
            <Compass size={36} color="#FFFFFF" />
            <Text variant="title" color="#FFFFFF">
              {t('sportFit.introTitle')}
            </Text>
            <Text color="rgba(255,255,255,0.92)">{t('sportFit.introBody')}</Text>
          </AnimatedGradient>
        </Reveal>

        <Card padded style={{ gap: spacing.md }}>
          {points.map(({ Icon, text }) => (
            <View key={text} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <Icon size={20} color={colors.play.cyan} />
              <Text style={{ flex: 1 }}>{text}</Text>
            </View>
          ))}
        </Card>

        {!data.has_game_intelligence ? (
          <Card padded tone="primarySoft" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Lightbulb size={20} color={colors.primary} />
            <Text variant="caption" style={{ flex: 1 }}>
              {t('sportFit.introGiHint')}
            </Text>
            <Button label={t('sportFit.introGiAction')} size="sm" variant="secondary" onPress={() => router.push(Routes.intelligence)} />
          </Card>
        ) : null}

        <Button
          label={t('sportFit.introStart')}
          size="lg"
          fullWidth
          onPress={() => router.push(Routes.sportFitQuestions)}
          testID="sf-start"
        />
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          {t('sportFit.introNotMedical')}
        </Text>
      </Screen>
    );
  }

  // ── A result ──
  const top = result.fits.slice(0, 3);
  const rest = result.fits.slice(3);
  const team = result.dimensions.team;
  const retakeOpen = canRetake(data);

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteMySportFit();
      setConfirmDelete(false);
      toast.info(t('sportFit.deleted'));
      await state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen header={header} scroll contentStyle={{ gap: spacing.xxl }} testID="sf-results">
      <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
        <Text variant="heading">{t('sportFit.resultsTitle')}</Text>
        <Text tone="secondary">{t('sportFit.resultsSubtitle')}</Text>
      </View>

      <View style={{ gap: spacing.md }}>
        {top.map((fit, i) => (
          <Reveal key={fit.sport} index={i}>
            <FitCard fit={fit} rank={i} />
          </Reveal>
        ))}
      </View>

      {rest.length ? (
        <View style={{ gap: spacing.md }}>
          <SectionHeader title={t('sportFit.allSportsTitle')} />
          {rest.map((fit) => (
            <SubScoreBar key={fit.sport} label={t(`sports.${fit.sport}`)} value={fit.fit} color={colors.play.cyan} />
          ))}
        </View>
      ) : null}

      <View style={{ gap: spacing.md }}>
        <SectionHeader title={t('sportFit.mindsetTitle')} />
        {SF_MINDSET.filter((d) => d !== 'team').map((d) => (
          <SubScoreBar
            key={d}
            label={t(`sportFit.dimension.${d}`)}
            hint={t(`sportFit.dimensionWhat.${d}`)}
            value={result.dimensions[d]}
            color={colors.play[SF_HUE[d]]}
          />
        ))}
        {team != null ? <TeamSpectrum value={team} /> : null}
        {(['reading', 'speed'] as const).map((d) =>
          result.gi_signals[d] != null ? (
            <SubScoreBar
              key={d}
              label={t(`sportFit.dimension.${d}`)}
              hint={t('sportFit.fromGames')}
              value={result.gi_signals[d]}
              color={colors.play[SF_HUE[d]]}
            />
          ) : null,
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Button
          label={t('sportFit.findCoaches')}
          variant="secondary"
          fullWidth
          icon={<Users size={18} color={colors.text} />}
          onPress={() => router.push({ pathname: Routes.discover, params: { view: 'coaches' } })}
        />
        {data.consent === 'ok' && retakeOpen ? (
          <Button
            label={t('sportFit.answerAgain')}
            variant="ghost"
            fullWidth
            onPress={() => router.push(Routes.sportFitQuestions)}
            testID="sf-retake"
          />
        ) : null}
        {data.consent !== 'ok' ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }} testID="sf-needs-parent">
            {t('sportFit.answerAgainNeedsParent')}
          </Text>
        ) : null}
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          {t('sportFit.takenOn', { date: fullDate(result.created_at) })}
          {!retakeOpen && data.next_retake_at ? ` · ${t('sportFit.nextRetake', { date: fullDate(data.next_retake_at) })}` : ''}
        </Text>
      </View>

      <Card padded style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <EyeOff size={18} color={colors.success} />
          <Text variant="subheading">{t('sportFit.privacyTitle')}</Text>
        </View>
        <Text tone="secondary">{t('sportFit.privacyBody')}</Text>
        <Divider />
        <Button
          label={t('sportFit.deleteAction')}
          variant="ghost"
          icon={<Trash2 size={18} color={colors.danger} />}
          onPress={() => setConfirmDelete(true)}
          testID="sf-delete"
        />
      </Card>

      <InfoNote tone="info" icon="info">
        {t('sportFit.footnote')}
      </InfoNote>

      <ConfirmSheet
        visible={confirmDelete}
        title={t('sportFit.deleteTitle')}
        message={t('sportFit.deleteBody')}
        confirmLabel={t('sportFit.deleteConfirm')}
        destructive
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />

      {celebrate && !reduced ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <Confetti
            origin={{ x: Dimensions.get('window').width / 2, y: 160 }}
            colors={[...theme.gradients.cool, colors.play.amber]}
            onDone={() => setCelebrate(false)}
          />
        </View>
      ) : null}
    </Screen>
  );
}

/** One of the three best sports: the fit, why it fits, and one thing to develop. */
function FitCard({ fit, rank }: { fit: SfFit; rank: number }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const first = rank === 0;
  const reasons: string[] = [
    ...fit.strengths.map((d: SfDimension) => t(`sportFit.strength.${d}`)),
    ...(fit.team_match ? [t(`sportFit.teamMatch.${fit.team}`)] : []),
  ];

  const heading = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: first ? 'rgba(255,255,255,0.22)' : colors.surfaceSunken,
        }}
      >
        {first ? <Trophy size={22} color="#FFFFFF" /> : <Text variant="heading">{rank + 1}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        {first ? (
          <Text variant="overline" color="rgba(255,255,255,0.85)">
            {t('sportFit.topPick')}
          </Text>
        ) : null}
        <Text variant="heading" color={first ? '#FFFFFF' : undefined}>
          {t(`sports.${fit.sport}`)}
        </Text>
      </View>
      <Badge label={t('sportFit.fitLabel', { fit: fit.fit })} tone={first ? 'success' : 'info'} size="md" />
    </View>
  );

  const body = (
    <View style={{ gap: spacing.sm }}>
      <Text variant="caption" color={first ? 'rgba(255,255,255,0.92)' : undefined} tone={first ? undefined : 'secondary'}>
        {t(`sportFit.sportWhy.${fit.sport}`)}
      </Text>
      {reasons.length ? (
        <View style={{ gap: 6 }}>
          {reasons.map((r) => (
            <View key={r} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
              <Sparkles size={14} color={first ? '#FFFFFF' : colors.play.amber} style={{ marginTop: 3 }} />
              <Text variant="caption" style={{ flex: 1 }} color={first ? '#FFFFFF' : undefined}>
                {r}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {fit.develop ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
          <Lightbulb size={14} color={first ? '#FFFFFF' : colors.play.violet} style={{ marginTop: 3 }} />
          <Text variant="caption" style={{ flex: 1 }} color={first ? 'rgba(255,255,255,0.92)' : undefined} tone={first ? undefined : 'secondary'}>
            {t('sportFit.developTitle')}: {t(`sportFit.develop.${fit.develop}`)}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (first) {
    return (
      <AnimatedGradient colors={theme.gradients.cool} radius={theme.radii.xl} style={{ padding: spacing.lg, gap: spacing.md }}>
        {heading}
        {body}
      </AnimatedGradient>
    );
  }
  return (
    <Card padded level={1} style={{ gap: spacing.md }} testID={`sf-fit-${fit.sport}`}>
      {heading}
      {body}
    </Card>
  );
}

/** Team or solo is a preference, not a score: a marker on a line between the two. */
function TeamSpectrum({ value }: { value: number }) {
  const { colors, spacing } = useTheme();
  const t = useT();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="bodyStrong">
        {t('sportFit.dimension.team')}
        <Text variant="caption" tone="muted">
          {'  '}
          {t('sportFit.dimensionWhat.team')}
        </Text>
      </Text>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceSunken }}>
        {/* The marker travels an inset track, so at 0 and 100 it stays inside the bar. */}
        <View style={{ position: 'absolute', left: 8, right: 8, top: -4, height: 16 }}>
          <View
            style={{
              position: 'absolute',
              left: `${pct}%`,
              marginLeft: -8,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: colors.play.cyan,
              borderWidth: 3,
              borderColor: colors.surface,
            }}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" tone="muted">
          {t('sportFit.teamSpectrumSolo')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('sportFit.teamSpectrumTeam')}
        </Text>
      </View>
    </View>
  );
}
