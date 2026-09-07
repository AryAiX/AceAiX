import React, { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Svg, { Defs, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';
import { ChevronRight, Info, Sparkles, TrendingDown, TrendingUp, Trophy } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  Screen,
  ScoreRing,
  SectionHeader,
  Sheet,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { PillarList } from '@/components/profile/PillarList';
import { ScoreInsight } from '@/components/score/ScoreInsight';
import { ScoreSimulator } from '@/components/score/ScoreSimulator';
import { tierLabel } from '@/components/profile/ScoreCard';
import { TipList } from '@/components/profile/TipList';
import { TierProgress } from '@/components/celebrate/TierProgress';
import { useProgress } from '@/providers/ProgressProvider';
import { useAsync } from '@/hooks/useAsync';
import { getMyTalentScore, getScoreHistory, refreshMyTalentScore } from '@/lib/api';
import { ScoreHistoryPoint, toHistoryPoints } from '@/lib/api.profile';
import { Routes } from '@/lib/routes';
import { fullDate } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { useT } from '@/i18n';
import type { ScoreTip } from '@/types/models';

/** Where each tip actually takes you. Keys match private.build_score_tips. */
function targetFor(tip: ScoreTip): Href {
  switch (tip.key) {
    case 'add_highlights':
      return { pathname: Routes.myProfile, params: { tab: 'highlights' } };
    case 'log_matches':
      return { pathname: Routes.myProfile, params: { tab: 'career' } };
    case 'get_verified':
      return Routes.settingsAccount;
    case 'ask_endorsement':
      return Routes.discover;
    case 'post_update':
      return Routes.compose;
    case 'complete_profile':
    case 'link_club':
    default:
      return Routes.editProfile;
  }
}

export default function ScoreScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  /* The next-tier target comes from the progress provider, which already has
     it — asking the score screen to recompute a tier floor would be a second
     source of truth for the same number. */
  const { progress } = useProgress();
  const progressScore = progress?.score ?? null;
  const toast = useToast();
  const t = useT();

  const [refreshing, setRefreshing] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  const score = useAsync(() => getMyTalentScore(), [], { refetchOnFocus: true });
  const athleteId = score.data?.athlete_id ?? null;

  const history = useAsync(
    async () => toHistoryPoints(await getScoreHistory(athleteId as string)),
    [athleteId],
    { enabled: !!athleteId },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await refreshMyTalentScore();
      score.mutate(() => next);
      history.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score.mutate, history.refresh, toast]);

  const header = (
    <Header
      back
      title={t('common.talentScore')}
      right={
        <IconButton
          icon={<Info size={20} color={colors.text} />}
          label={t('score.howCalculated')}
          onPress={() => setHowOpen(true)}
        />
      }
    />
  );

  const points = useMemo(() => history.data ?? [], [history.data]);

  if (score.loading && !score.data) {
    return (
      <Screen header={header}>
        <SkeletonList count={2} />
      </Screen>
    );
  }

  if (score.error) {
    return (
      <Screen header={header}>
        <ErrorState message={score.error} onRetry={score.reload} />
      </Screen>
    );
  }

  const data = score.data;

  if (!data) {
    return (
      <Screen header={header}>
        <EmptyState
          icon={<Sparkles size={26} color={colors.textMuted} />}
          title={t('score.notReadyTitle')}
          body={t('score.notReadyBody')}
          actionLabel={t('score.notReadyAction')}
          onAction={() => router.push(Routes.editProfile)}
        />
        <HowSheet visible={howOpen} onClose={() => setHowOpen(false)} />
      </Screen>
    );
  }

  const tier = tierForScore(data.overall);
  const tierColor = TierColors[tier];
  const delta = data.previous_overall != null ? data.overall - data.previous_overall : null;
  const topPercent = data.percentile != null ? Math.max(1, 100 - data.percentile) : null;

  return (
    <Screen
      header={header}
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentStyle={{ gap: spacing.xxl }}
      testID="score-screen"
    >
      {/* ── The number ── */}
      <View style={{ alignItems: 'center', marginTop: spacing.md, gap: spacing.sm }}>
        <ScoreRing score={data.overall} size={180} showTier={false} />
        <Text variant="heading" color={tierColor}>
          {tierLabel(t, tier)}
        </Text>
        {topPercent != null ? (
          <Text variant="caption" tone="muted">
            {t('score.topPercent', { percent: topPercent })}
          </Text>
        ) : null}
        {delta !== null && delta !== 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {delta > 0 ? (
              <TrendingUp size={15} color={colors.success} />
            ) : (
              <TrendingDown size={15} color={colors.danger} />
            )}
            <Text variant="captionStrong" tone={delta > 0 ? 'success' : 'danger'}>
              {t(delta > 0 ? 'score.deltaUpSince' : 'score.deltaDownSince', {
                count: Math.abs(delta),
              })}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Next tier, and the wall ──
          The score itself moves slowly. These two give the same screen
          something that moves this week. */}
      <View style={{ gap: theme.spacing.md }}>
        <TierProgress score={progressScore} />
        <Card onPress={() => router.push(Routes.achievements)} padded>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Trophy size={22} color={theme.colors.primary} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{t('progress.title')}</Text>
              <Text variant="caption" tone="muted">
                {t('progress.subtitle')}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textMuted} />
          </View>
        </Card>
      </View>

      {/* ── History ── */}
      <View>
        <SectionHeader title={t('score.curveTitle')} />
        {history.loading ? (
          <Card padded>
            <Text variant="caption" tone="muted">
              {t('score.historyLoading')}
            </Text>
          </Card>
        ) : points.length < 2 ? (
          <Card tone="alt" padded>
            <Text variant="caption" tone="secondary">
              {t('score.historyEmpty')}
            </Text>
          </Card>
        ) : (
          <Card padded>
            <Sparkline points={points} color={tierColor} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: spacing.sm,
              }}
            >
              <Text variant="caption" tone="muted">
                {fullDate(points[0].recorded_on)}
              </Text>
              <Text variant="caption" tone="muted">
                {fullDate(points[points.length - 1].recorded_on)}
              </Text>
            </View>
          </Card>
        )}
      </View>

      {/* ── The written read, then the what-if ── */}
      <ScoreInsight />

      <ScoreSimulator />

      {/* ── Pillars ── */}
      <View>
        <SectionHeader title={t('score.pillarsTitle')} />
        <Card padded>
          <PillarList pillars={data.pillars} />
        </Card>
      </View>

      {/* ── Tips ── */}
      <View>
        <SectionHeader title={t('score.tipsTitle')} />
        {/* The tips themselves come from talent_scores.tips in English — see
            TipList for the known gap. */}
        <TipList
          tips={data.tips ?? []}
          onAction={(tip) => {
            const target = targetFor(tip);
            router.push(target);
          }}
        />
      </View>

      <Button
        label={t('score.howCalculated')}
        variant="ghost"
        fullWidth
        onPress={() => setHowOpen(true)}
      />

      <HowSheet visible={howOpen} onClose={() => setHowOpen(false)} />
    </Screen>
  );
}

/**
 * The honest disclosure. Short sentences, no jargon, no AI claims.
 *
 * Three claims have to survive translation: the score comes from the profile
 * and nothing else, checkable data outweighs self-reported data, and the
 * number measures a profile rather than a person.
 */
function HowSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();

  return (
    <Sheet visible={visible} onClose={onClose} title={t('score.howCalculated')}>
      <Text variant="body" tone="secondary">
        {t('score.howIntro')}
      </Text>

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Bullet text={t('score.howBulletProfile')} />
        <Bullet text={t('score.howBulletPerformance')} />
        <Bullet text={t('score.howBulletMedia')} />
        <Bullet text={t('score.howBulletCredibility')} />
        <Bullet text={t('score.howBulletEngagement')} />
      </View>

      <Text variant="body" tone="secondary" style={{ marginTop: spacing.lg }}>
        {t('score.howVerified')}
      </Text>

      <Text variant="body" tone="secondary" style={{ marginTop: spacing.md }}>
        {t('score.howRecalculated')}
      </Text>

      <Text variant="bodyStrong" style={{ marginTop: spacing.lg }}>
        {t('score.howNotYouTitle')}
      </Text>
      <Text variant="body" tone="secondary" style={{ marginTop: spacing.xs }}>
        {t('score.howNotYouBody')}
      </Text>

      <Button
        label={t('score.gotIt')}
        variant="secondary"
        fullWidth
        style={{ marginTop: spacing.xl }}
        onPress={onClose}
      />
    </Sheet>
  );
}

function Bullet({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      <Text variant="body" tone="muted">
        •
      </Text>
      <Text variant="body" tone="secondary" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

/**
 * The score curve. Drawn by hand rather than pulled in as a chart library —
 * one polyline and a soft fill is all this needs.
 */
function Sparkline({ points, color }: { points: ScoreHistoryPoint[]; color: string }) {
  const theme = useTheme();
  const t = useT();
  const [width, setWidth] = useState(0);
  const height = 108;
  const pad = 8;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const geometry = useMemo(() => {
    if (width <= 0 || points.length < 2) return null;

    const values = points.map((point) => point.overall);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const flat = max === min;

    const stepX = (width - pad * 2) / (points.length - 1);
    const x = (index: number) => pad + index * stepX;
    const y = (value: number) =>
      flat
        ? height / 2
        : height - pad - ((value - min) / (max - min)) * (height - pad * 2);

    const line = points.map((point, index) => `${x(index)},${y(point.overall)}`).join(' ');
    const area = `${x(0)},${height} ${line} ${x(points.length - 1)},${height}`;
    return { line, area, min, max };
  }, [points, width]);

  return (
    <View onLayout={onLayout}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={
          geometry
            ? t('score.sparklineA11y', {
                count: points.length,
                min: geometry.min,
                max: geometry.max,
              })
            : t('score.sparklineA11yPlain')
        }
        style={{ height }}
      >
        {geometry ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="scoreSparkFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity="0.30" />
                <Stop offset="1" stopColor={color} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Polygon points={geometry.area} fill="url(#scoreSparkFill)" />
            <Polyline
              points={geometry.line}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
      </View>

      {geometry ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="caption" tone="muted">
            {t('score.sparklineLow', { value: geometry.min })}
          </Text>
          <Text variant="caption" tone="muted" style={{ color: theme.colors.textMuted }}>
            {t('score.sparklineHigh', { value: geometry.max })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
