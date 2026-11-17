import React, { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { PartyPopper, Sparkles, TrendingUp } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card, ErrorState, PointsChip, ScoreRing, SkeletonList, Text } from '@/components/ui';
import {
  CARD_H,
  CARD_W,
  PlayerCardArt,
  imageAsDataUri,
  type PlayerCardData,
} from '@/components/profile/PlayerCardArt';
import { useAsync } from '@/hooks/useAsync';
import { tipText } from '@/lib/scoreTips';
import { displayName, initialsOf } from '@/lib/format';
import { useT } from '@/i18n';
import { Tier, tierForScore } from '@/theme/tokens';
import type { FullTalentScore, ProfileBundle, Team } from '@/types/models';

/** The payoff. Everything before this was work; this is the reward. */

/* The tier is computed from the score, so it is named in the reader's language. */
const TIER_KEYS: Record<Tier, string> = {
  rising: 'common.tierRising',
  bronze: 'common.tierBronze',
  silver: 'common.tierSilver',
  gold: 'common.tierGold',
  elite: 'common.tierElite',
};

function TipCard({ label, detail, points }: { label: string; detail: string; points: number }) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;

  return (
    <Card tone="alt" padded="sm">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.md,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radii.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
          }}
        >
          <TrendingUp size={17} color={colors.primary} />
        </View>

        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <Text variant="captionStrong">{label}</Text>
          <Text variant="caption" tone="muted">
            {detail}
          </Text>
        </View>

        {points > 0 ? (
          <PointsChip
            points={Math.round(points)}
            label={t('onboarding.tipPoints', { points: Math.round(points) })}
          />
        ) : null}
      </View>
    </Card>
  );
}

export function AthleteFinishStep({
  firstName,
  score,
  bundle,
  teams,
  loading,
  error,
  onRetry,
}: {
  firstName: string;
  score: FullTalentScore | null;
  /** The profile as the wizard saved it, re-read at the end; null while loading. */
  bundle: ProfileBundle | null;
  teams: Team[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { spacing } = theme;
  const { width } = useWindowDimensions();

  /* The card is the Profile › Player card, drawn here with the same mapping
     as app/player-card.tsx. A new athlete has no counts yet, so no stats row. */
  const photo = useAsync(
    () => imageAsDataUri(bundle?.user?.avatar_url),
    [bundle?.user?.avatar_url],
    { enabled: !!bundle },
  );
  const card = useMemo<PlayerCardData | null>(() => {
    if (!bundle || !score) return null;
    const user = bundle.user;
    const athlete = bundle.athlete;
    const tier = tierForScore(score.overall);
    const supports = teams.slice(0, 2).map((team) => team.name).join(' · ');
    return {
      name: displayName(user?.full_name, ''),
      initials: initialsOf(user?.full_name),
      line: [athlete?.position, athlete?.sport].filter(Boolean).join(' · '),
      meta: [athlete?.club, [user?.city, user?.country].filter(Boolean).join(', ')]
        .filter(Boolean)
        .join(' · '),
      overall: score.overall,
      tier,
      tierLabel: t(TIER_KEYS[tier]),
      scoreLabel: t('common.talentScore'),
      photo: photo.data ?? null,
      pillars: [
        { label: t('score.pillarPerformance'), value: score.pillars?.performance ?? 0 },
        { label: t('score.pillarCredibility'), value: score.pillars?.credibility ?? 0 },
        { label: t('score.pillarEngagement'), value: score.pillars?.engagement ?? 0 },
        { label: t('score.pillarProfile'), value: score.pillars?.profile ?? 0 },
        { label: t('score.pillarMedia'), value: score.pillars?.media ?? 0 },
      ],
      stats: [],
      footerRight: supports ? `${t('teams.supportsTitle')}: ${supports}` : '',
    };
  }, [bundle, score, teams, photo.data, t]);
  const cardWidth = Math.min(width - 32, 320);
  const cardHeight = (cardWidth * CARD_H) / CARD_W;

  if (loading) {
    return (
      <View style={{ paddingTop: spacing.xl, gap: spacing.xl }}>
        <Text variant="title" align="center" accessibilityRole="header">
          {t('onboarding.scoreLoading')}
        </Text>
        <SkeletonList count={3} variant="row" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ paddingTop: spacing.xl }}>
        <ErrorState message={error} onRetry={onRetry} />
        <Text variant="caption" tone="muted" align="center">
          {t('onboarding.scoreErrorNote')}
        </Text>
      </View>
    );
  }

  const topTips = [...(score?.tips ?? [])].sort((a, b) => b.points - a.points).slice(0, 3);
  const tier = score ? t(TIER_KEYS[tierForScore(score.overall)]) : null;

  return (
    <View style={{ paddingTop: spacing.lg, gap: spacing.xxl }}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <Text variant="title" align="center" accessibilityRole="header">
          {firstName
            ? t('onboarding.athleteDoneTitleNamed', { name: firstName })
            : t('onboarding.athleteDoneTitle')}
        </Text>
        <Text variant="body" tone="secondary" align="center" style={{ maxWidth: 320 }}>
          {score && tier
            ? t('onboarding.athleteDoneScored', { tier })
            : t('onboarding.athleteDoneNoScore')}
        </Text>

        {card ? (
          <View
            style={{
              width: cardWidth,
              height: cardHeight,
              borderRadius: (cardWidth * 56) / CARD_W,
              overflow: 'hidden',
              marginTop: spacing.sm,
              ...theme.elevation(2),
            }}
          >
            <PlayerCardArt data={card} width={cardWidth} height={cardHeight} />
          </View>
        ) : (
          <ScoreRing score={score?.overall ?? null} size={168} style={{ marginTop: spacing.sm }} />
        )}
      </View>

      {topTips.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <Sparkles size={18} color={theme.colors.primary} />
            <Text variant="heading">{t('onboarding.tipsTitle')}</Text>
          </View>
          {topTips.map((tip) => {
            const text = tipText(tip, t);
            return <TipCard key={tip.key} label={text.label} detail={text.detail} points={tip.points} />;
          })}
        </View>
      ) : (
        <Card tone="alt">
          <Text variant="caption" tone="secondary">
            {t('onboarding.tipsEmpty')}
          </Text>
        </Card>
      )}
    </View>
  );
}

/** The plain version, for coaches, clubs and guardians. */
export function SimpleFinishStep({
  title,
  body,
  points,
}: {
  title: string;
  body: string;
  points?: string[];
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;

  return (
    <View
      style={{
        paddingTop: spacing.giant,
        gap: spacing.xl,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radii.xl,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primarySoft,
        }}
      >
        <PartyPopper size={32} color={colors.primary} />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text variant="title" align="center" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="body" tone="secondary" align="center">
          {body}
        </Text>
      </View>

      {points && points.length > 0 ? (
        <Card tone="alt" style={{ alignSelf: 'stretch', gap: spacing.sm }}>
          {points.map((point) => (
            <Text key={point} variant="caption" tone="secondary">
              {t('onboarding.finishBullet', { text: point })}
            </Text>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
