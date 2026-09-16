import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { ScoreBar, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { ScorePillars } from '@/types/models';

/**
 * The five pillars, with the weight each one carries and what it actually
 * measures — the weights and wording match private.compute_talent_score, so
 * the screen never promises something the database does not do. The weights
 * are numbers, not copy: a translation may reword a pillar, never renumber it.
 */
const PILLARS: {
  key: keyof ScorePillars;
  label: string;
  weight: number;
  explain: string;
}[] = [
  {
    key: 'performance',
    label: 'score.pillarPerformance',
    weight: 30,
    explain: 'score.pillarPerformanceExplain',
  },
  {
    key: 'credibility',
    label: 'score.pillarCredibility',
    weight: 20,
    explain: 'score.pillarCredibilityExplain',
  },
  {
    key: 'engagement',
    label: 'score.pillarEngagement',
    weight: 20,
    explain: 'score.pillarEngagementExplain',
  },
  {
    key: 'profile',
    label: 'score.pillarProfile',
    weight: 15,
    explain: 'score.pillarProfileExplain',
  },
  { key: 'media', label: 'score.pillarMedia', weight: 15, explain: 'score.pillarMediaExplain' },
];

export function PillarList({ pillars }: { pillars: ScorePillars }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();

  return (
    <View style={{ gap: spacing.lg }}>
      {PILLARS.map((pillar) => (
        <View key={pillar.key}>
          <ScoreBar
            label={t('score.pillarWeight', {
              label: t(pillar.label),
              weight: pillar.weight,
            })}
            value={pillars[pillar.key] ?? 0}
            color={colors.primary}
          />
          <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>
            {t(pillar.explain)}
          </Text>
        </View>
      ))}
    </View>
  );
}
