import React from 'react';
import { View } from 'react-native';
import { PartyPopper, Sparkles, TrendingUp } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card, ErrorState, ScoreRing, SkeletonList, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { Tier, tierForScore } from '@/theme/tokens';
import type { FullTalentScore } from '@/types/models';

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
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 3,
              borderRadius: radii.pill,
              backgroundColor: colors.primarySoft,
            }}
          >
            <Text variant="overline" tone="primary">
              {t('onboarding.tipPoints', { points: Math.round(points) })}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

export function AthleteFinishStep({
  firstName,
  score,
  loading,
  error,
  onRetry,
}: {
  firstName: string;
  score: FullTalentScore | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { spacing } = theme;

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

        <ScoreRing score={score?.overall ?? null} size={168} style={{ marginTop: spacing.sm }} />
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
          {topTips.map((tip) => (
            <TipCard key={tip.key} label={tip.label} detail={tip.detail} points={tip.points} />
          ))}
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
