import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, EmptyState, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { tipText } from '@/lib/scoreTips';
import type { ScoreTip } from '@/types/models';

/** What the button says for each tip the database can produce. */
const ACTION_KEYS: Record<string, string> = {
  add_highlights: 'score.tipAction.addHighlights',
  complete_profile: 'score.tipAction.completeProfile',
  log_matches: 'score.tipAction.logMatches',
  get_verified: 'score.tipAction.getVerified',
  ask_endorsement: 'score.tipAction.askEndorsement',
  link_club: 'score.tipAction.linkClub',
  post_update: 'score.tipAction.postUpdate',
};

interface Props {
  tips: ScoreTip[];
  onAction: (tip: ScoreTip) => void;
}

export function TipList({ tips, onAction }: Props) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();

  if (tips.length === 0) {
    return (
      <EmptyState compact title={t('score.tipsEmptyTitle')} body={t('score.tipsEmptyBody')} />
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      {tips.map((tip) => {
        const text = tipText(tip, t);
        return (
        <Card key={tip.key} padded>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="bodyStrong">{text.label}</Text>
              <Text variant="caption" tone="muted">
                {text.detail}
              </Text>
            </View>
            <Badge label={t('score.tipPoints', { points: tip.points })} tone="accent" />
          </View>
          <Button
            label={ACTION_KEYS[tip.key] ? t(ACTION_KEYS[tip.key]) : t('score.tipOpen')}
            variant="secondary"
            size="sm"
            hitSlop={8}
            style={{ marginTop: spacing.md }}
            onPress={() => onAction(tip)}
          />
        </Card>
        );
      })}
    </View>
  );
}
