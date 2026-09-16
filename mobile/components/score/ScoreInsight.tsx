import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Skeleton, Text } from '@/components/ui';
import { talentInsight } from '@/lib/api';
import { useT } from '@/i18n';

/**
 * A few sentences about this profile, written rather than counted.
 *
 * The `talent-insights` function answers whether or not an Anthropic key is
 * configured — with one it writes, without one it fills a template from the
 * same pillar numbers — so this never needs a feature flag and never shows a
 * half-built state. It also never blocks: the score and the pillars are already
 * on screen by the time these words arrive, and if they never arrive the screen
 * says so plainly instead of spinning.
 */
export function ScoreInsight({ athleteId }: { athleteId?: string }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();

  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const summary = await talentInsight(athleteId);
    setText(summary);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const summary = await talentInsight(athleteId);
      if (!cancelled) {
        setText(summary);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  return (
    <Card padded tone="primarySoft" style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Sparkles size={15} color={colors.primary} />
        <Text variant="overline" tone="primary">
          {t('score.insightTitle')}
        </Text>
      </View>

      {loading ? (
        <View style={{ gap: 6 }}>
          <Skeleton height={13} />
          <Skeleton height={13} width="92%" />
          <Skeleton height={13} width="70%" />
        </View>
      ) : text ? (
        <Text variant="body">{text}</Text>
      ) : (
        <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
          <Text variant="caption" tone="secondary">
            {t('score.insightUnavailable')}
          </Text>
          <Button
            label={t('score.insightRefresh')}
            variant="ghost"
            size="sm"
            onPress={load}
          />
        </View>
      )}
    </Card>
  );
}
