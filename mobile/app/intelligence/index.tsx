import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Brain,
  CalendarClock,
  Clock,
  Eye,
  Lightbulb,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import Svg, { Polyline } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import {
  AnimatedGradient,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Header,
  Reveal,
  Screen,
  SectionHeader,
  SkeletonList,
  Switch,
  Text,
  useToast,
} from '@/components/ui';
import { Confetti } from '@/components/celebrate/Confetti';
import { InfoNote } from '@/components/settings/Notes';
import { GiRing, SubScoreBar } from '@/components/intelligence/shared';
import { TestIcon } from '@/components/intelligence/TestIcon';
import { useAsync } from '@/hooks/useAsync';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import { fullDate } from '@/lib/format';
import { getGiState, setGiSharing, type GiState } from '@/lib/api.intelligence';
import { GI_TESTS, topPercent, type GiTestKey } from '@/lib/gi/catalogue';

/**
 * Game Intelligence — the home of the feature.
 *
 * One screen, four shapes, decided by `gi_my_state`:
 *
 *   consent is not 'ok'   → why not, and the one thing that fixes it
 *   nothing played yet    → what this is, and "Let's play"
 *   a sitting in progress → carry on where you left off
 *   a result              → the result, what to work on, who can see it
 */
export default function GameIntelligenceScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const reduced = useReducedMotion();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ fresh?: string }>();

  const state = useAsync<GiState>(() => getGiState(), [], { refetchOnFocus: true });
  const [celebrate, setCelebrate] = useState(params.fresh === '1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.fresh === '1') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [params.fresh]);

  const header = <Header back title={t('intelligence.title')} />;

  const saveSharing = useCallback(
    async (share: boolean, badge: boolean) => {
      const current = state.data?.profile;
      if (!current) return;
      setSaving(true);
      state.mutate((s) =>
        s && s.profile
          ? { ...s, profile: { ...s.profile, share_with_clubs: share, show_badge: badge && share } }
          : s,
      );
      try {
        await setGiSharing(share, badge && share);
        toast.success(t('intelligence.shareSaved'));
      } catch (err) {
        toast.error(errorMessage(err));
        state.refresh();
      } finally {
        setSaving(false);
      }
    },
    [state, toast, t],
  );

  const ranked = useMemo(() => {
    const subs = state.data?.profile?.subscores ?? {};
    return GI_TESTS.filter((x) => subs[x.key] != null)
      .map((x) => ({ ...x, value: subs[x.key] as number }))
      .sort((a, b) => b.value - a.value);
  }, [state.data?.profile?.subscores]);

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
  const gi = data.profile;
  const open = data.open_session;

  // ── Not allowed yet ──
  if (data.consent !== 'ok') {
    let body: React.ReactNode;
    if (data.consent === 'guardian_required') {
      body = data.guardian_pending ? (
        <EmptyState
          icon={<Clock size={26} color={colors.warning} />}
          title={t('intelligence.consentPendingTitle')}
          body={t('intelligence.consentPendingBody')}
          actionLabel={t('intelligence.consentAction')}
          onAction={() => router.push({ pathname: Routes.settingsGuardian, params: { add: 'assessments' } })}
        />
      ) : (
        <EmptyState
          icon={<ShieldCheck size={26} color={colors.play.violet} />}
          title={t('intelligence.consentTitle')}
          body={t('intelligence.consentBody', { age: data.self_consent_age })}
          actionLabel={t('intelligence.consentAction')}
          onAction={() => router.push({ pathname: Routes.settingsGuardian, params: { add: 'assessments' } })}
        />
      );
    } else if (data.consent === 'age_unknown') {
      body = (
        <EmptyState
          icon={<CalendarClock size={26} color={colors.textMuted} />}
          title={t('intelligence.consentAgeUnknownTitle')}
          body={t('intelligence.consentAgeUnknownBody')}
          actionLabel={t('intelligence.consentAgeUnknownAction')}
          onAction={() => router.push(Routes.editProfile)}
        />
      );
    } else {
      body = (
        <EmptyState
          icon={<Lock size={26} color={colors.textMuted} />}
          title={t('intelligence.notAthleteTitle')}
          body={t(data.consent === 'suspended' ? 'intelligence.suspendedBody' : 'intelligence.notAthleteBody')}
        />
      );
    }
    return (
      <Screen header={header} testID="gi-gate">
        {body}
      </Screen>
    );
  }

  const continueCard = open ? (
    <Card padded level={1} tone="primarySoft">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Play size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{t('intelligence.cardContinue')}</Text>
          <Text variant="caption" tone="muted">
            {t('intelligence.cardContinueBody', { done: Object.keys(open.done ?? {}).length })}
          </Text>
        </View>
        <Button
          label={t('intelligence.cardContinue')}
          size="sm"
          onPress={() => router.push(Routes.intelligenceSession)}
          testID="gi-continue"
        />
      </View>
    </Card>
  ) : null;

  // ── Nothing yet: the intro ──
  if (!gi || gi.tests_completed === 0) {
    const points = [
      { Icon: Clock, text: t('intelligence.introPoint1') },
      { Icon: Eye, text: t('intelligence.introPoint2') },
      { Icon: TrendingUp, text: t('intelligence.introPoint3') },
    ];
    return (
      <Screen header={header} scroll contentStyle={{ gap: spacing.xl }} testID="gi-intro">
        {continueCard}
        <Reveal>
          <AnimatedGradient
            colors={theme.gradients.hero}
            radius={theme.radii.xl}
            style={{ padding: spacing.xl, gap: spacing.md }}
          >
            <Brain size={36} color="#FFFFFF" />
            <Text variant="title" color="#FFFFFF">
              {t('intelligence.introTitle')}
            </Text>
            <Text color="rgba(255,255,255,0.92)">{t('intelligence.introBody')}</Text>
          </AnimatedGradient>
        </Reveal>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
          {GI_TESTS.map((x, i) => (
            <Reveal key={x.key} index={i} from="scale">
              <TestIcon test={x.key} color={colors.play[x.hue]} size={48} />
            </Reveal>
          ))}
        </View>

        <Card padded style={{ gap: spacing.md }}>
          {points.map(({ Icon, text }) => (
            <View key={text} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <Icon size={20} color={colors.play.violet} />
              <Text style={{ flex: 1 }}>{text}</Text>
            </View>
          ))}
        </Card>

        {!open ? (
          <Button
            label={t('intelligence.introStart')}
            size="lg"
            fullWidth
            onPress={() => router.push(Routes.intelligenceSession)}
            testID="gi-start"
          />
        ) : null}
        <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
          {t('intelligence.introNotMedical')}
        </Text>
      </Screen>
    );
  }

  // ── A result ──
  const top = topPercent(gi.percentile);
  const confidenceLabel = t(
    gi.confidence === 'high'
      ? 'intelligence.confidenceHigh'
      : gi.confidence === 'medium'
        ? 'intelligence.confidenceMedium'
        : 'intelligence.confidenceLow',
  );
  const strengths = ranked.slice(0, 2);
  const weakest = ranked.length >= 3 ? ranked[ranked.length - 1] : null;
  const canReplay = !open && GI_TESTS.some((x) => (data.attempts_left?.[x.key] ?? 0) > 0);
  const history = data.history.filter((h) => h.overall != null) as { date: string; overall: number }[];

  return (
    <Screen header={header} scroll contentStyle={{ gap: spacing.xxl }} testID="gi-results">
      {continueCard}

      <View style={{ alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
        <Reveal from="scale">
          <GiRing score={gi.overall} subscores={gi.subscores} size={184} />
        </Reveal>
        <Text variant="heading">{t('intelligence.resultsTitle')}</Text>
        {gi.overall == null ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {t('intelligence.resultsNotEnough')}
          </Text>
        ) : null}
        {top != null ? (
          <Text variant="caption" tone="muted">
            {t('intelligence.cardTop', { percent: top })}
          </Text>
        ) : null}
        <Badge
          label={`${t('intelligence.confidence')}: ${confidenceLabel}`}
          tone={gi.confidence === 'high' ? 'success' : gi.confidence === 'medium' ? 'info' : 'warning'}
        />
        {gi.confidence !== 'high' ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {t('intelligence.confidenceHint')}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing.md }}>
        {GI_TESTS.map((x, i) => (
          <Reveal key={x.key} index={i}>
            <SubScoreBar
              label={t(`intelligence.tests.${x.i18n}.name`)}
              hint={t(`intelligence.tests.${x.i18n}.what`)}
              value={gi.subscores[x.key]}
              color={colors.play[x.hue]}
            />
          </Reveal>
        ))}
      </View>

      {strengths.length ? (
        <Card padded style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Sparkles size={18} color={colors.play.amber} />
            <Text variant="subheading">{t('intelligence.strengths')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {strengths.map((s) => (
              <Badge key={s.key} label={t(`intelligence.tests.${s.i18n}.what`)} tone="success" size="md" />
            ))}
          </View>
          {weakest ? (
            <>
              <Divider />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Lightbulb size={18} color={colors.play.violet} />
                <Text variant="subheading">
                  {t('intelligence.workOn')}: {t(`intelligence.tests.${weakest.i18n}.what`)}
                </Text>
              </View>
              <Text tone="secondary">{t(`intelligence.tip.${weakest.key as GiTestKey}`)}</Text>
            </>
          ) : null}
        </Card>
      ) : null}

      {history.length >= 2 ? (
        <View style={{ gap: spacing.sm }}>
          <SectionHeader title={t('intelligence.history')} />
          <Sparkline values={history.map((h) => h.overall)} color={colors.play.violet} />
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {gi.next_retest_at ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {t('intelligence.nextRetest', { date: fullDate(gi.next_retest_at) })}
          </Text>
        ) : null}
        {canReplay ? (
          <Button
            label={
              gi.tests_completed < GI_TESTS.length
                ? t('intelligence.cardContinue')
                : t('intelligence.introStart')
            }
            variant="secondary"
            fullWidth
            onPress={() => router.push(Routes.intelligenceSession)}
            testID="gi-replay"
          />
        ) : null}
      </View>

      <Card padded style={{ gap: spacing.lg }}>
        <Text variant="subheading">{t('intelligence.shareTitle')}</Text>
        <ToggleRow
          title={t('intelligence.shareClubs')}
          body={t('intelligence.shareClubsBody')}
          value={gi.share_with_clubs}
          disabled={saving || gi.overall == null}
          onChange={(v) => saveSharing(v, v ? gi.show_badge : false)}
          testID="gi-share-clubs"
        />
        <ToggleRow
          title={t('intelligence.shareBadge')}
          body={t('intelligence.shareBadgeBody')}
          value={gi.show_badge}
          disabled={saving || !gi.share_with_clubs}
          onChange={(v) => saveSharing(gi.share_with_clubs, v)}
          testID="gi-share-badge"
        />
        {profile?.is_minor ? (
          <Text variant="caption" tone="muted">
            {t('intelligence.shareMinorNote')}
          </Text>
        ) : null}
      </Card>

      <InfoNote tone="info" icon="info">
        {`${t('intelligence.footnote')} ${t('intelligence.notInTalentScore')}`}
      </InfoNote>

      {celebrate && !reduced && gi.overall != null ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <Confetti
            origin={{ x: Dimensions.get('window').width / 2, y: 180 }}
            colors={[...theme.gradients.hero, colors.play.amber]}
            onDone={() => setCelebrate(false)}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function ToggleRow({
  title,
  body,
  value,
  disabled,
  onChange,
  testID,
}: {
  title: string;
  body: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  testID?: string;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }} testID={testID}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" tone="muted">
          {body}
        </Text>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={title} />
    </View>
  );
}

/** A small line of the overall over time. No axes: the trend is the point. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const [width, setWidth] = useState(300);
  const h = 64;
  const max = Math.max(100, ...values);
  const min = Math.min(0, ...values);
  const pts = values
    .map((v, i) => {
      const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * (width - 8) + 4;
      const y = h - 4 - ((v - min) / Math.max(1, max - min)) * (h - 8);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <View onLayout={(e) => setWidth(Math.max(1, Math.round(e.nativeEvent.layout.width)))}>
      <Svg width={width} height={h}>
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
