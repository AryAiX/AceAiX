import React from 'react';
import { View } from 'react-native';
import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Tier, TierColors, tierForScore } from '@/theme/tokens';
import { Card, ScoreRing, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { TalentScore } from '@/types/models';

interface Props {
  score: TalentScore | null;
  /** Only my own card opens the Talent Score screen. */
  onPress?: () => void;
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * `TierLabels` in the tokens file is an English map kept for tests and
 * tooling. Anywhere a tier name is read by a person it comes from here.
 */
const TIER_KEYS: Record<Tier, string> = {
  rising: 'common.tierRising',
  bronze: 'common.tierBronze',
  silver: 'common.tierSilver',
  gold: 'common.tierGold',
  elite: 'common.tierElite',
};

export function tierLabel(t: Translate, tier: Tier): string {
  return t(TIER_KEYS[tier]);
}

/**
 * The number, the tier, where it puts you, and which way it moved. Everything
 * else about the score lives on /score.
 */
export function ScoreCard({ score, onPress }: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();

  if (!score) {
    return (
      <Card tone="alt" padded>
        <Text variant="subheading">{t('common.talentScore')}</Text>
        <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
          {t('score.cardEmptyBody')}
        </Text>
      </Card>
    );
  }

  const tier = tierForScore(score.overall);
  const tierColor = TierColors[tier];
  const tierName = tierLabel(t, tier);

  const delta =
    score.previous_overall != null ? score.overall - score.previous_overall : null;
  const moved = delta !== null && delta !== 0;

  /* The server ranks against every scored athlete on AceAiX, so that is what we
     say. Claiming a per-sport ranking would be a number we do not compute. */
  const topPercent = score.percentile != null ? Math.max(1, 100 - score.percentile) : null;

  return (
    <Card
      onPress={onPress}
      level={1}
      padded
      accessibilityLabel={
        onPress
          ? t('score.cardA11y', { score: score.overall, tier: tierName })
          : undefined
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <ScoreRing score={score.overall} size={104} showTier={false} />

        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="overline" color={tierColor}>
            {t('score.tierLine', { tier: tierName })}
          </Text>
          <Text variant="subheading">{t('common.talentScore')}</Text>

          {topPercent != null ? (
            <Text variant="caption" tone="muted">
              {t('score.topPercent', { percent: topPercent })}
            </Text>
          ) : (
            <Text variant="caption" tone="muted">
              {t('score.rankingBuilding')}
            </Text>
          )}

          {moved ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              {delta > 0 ? (
                <TrendingUp size={15} color={colors.success} />
              ) : (
                <TrendingDown size={15} color={colors.danger} />
              )}
              <Text variant="captionStrong" tone={delta > 0 ? 'success' : 'danger'}>
                {t(delta > 0 ? 'score.pointsUp' : 'score.pointsDown', {
                  count: Math.abs(delta),
                })}
              </Text>
              <Text variant="caption" tone="muted">
                {t('score.sinceLastTime')}
              </Text>
            </View>
          ) : null}
        </View>

        {onPress ? <ChevronRight size={20} color={colors.textMuted} /> : null}
      </View>
    </Card>
  );
}
