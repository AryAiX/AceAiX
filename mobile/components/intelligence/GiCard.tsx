import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Brain, ChevronRight, Eye, EyeOff } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AnimatedGradient, Badge, Card, Skeleton, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { fullDate } from '@/lib/format';
import {
  getGameIntelligence,
  getGiState,
  type GiPublic,
  type GiState,
} from '@/lib/api.intelligence';
import { GI_TESTS, topPercent } from '@/lib/gi/catalogue';
import { GiRing, SubScoreBar } from './shared';

/**
 * My own Game Intelligence, on my profile tab, under the Talent Score.
 *
 * Three faces: an invitation, a "finish your games" nudge, or the result with
 * who can see it. It never renders for a non-athlete — the caller decides.
 */
export function MyGiCard({ refreshKey }: { refreshKey?: number }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const state = useAsync<GiState>(() => getGiState(), [refreshKey], { refetchOnFocus: true });

  if (state.loading && !state.data) {
    return <Skeleton height={96} radius={theme.radii.lg} />;
  }
  const data = state.data;
  if (!data || data.consent === 'not_athlete' || data.consent === 'suspended') return null;

  const go = () => router.push(Routes.intelligence);
  const gi = data.profile;

  if (!gi || gi.overall == null) {
    const open = data.open_session;
    return (
      <Card onPress={go} padded={false} level={1} testID="gi-card">
        <AnimatedGradient colors={theme.gradients.hero} radius={theme.radii.lg} style={{ padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Brain size={26} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="overline" color="rgba(255,255,255,0.85)">
                {t('intelligence.title')}
              </Text>
              <Text variant="bodyStrong" color="#FFFFFF">
                {open || gi ? t('intelligence.cardContinue') : t('intelligence.cardCta')}
              </Text>
              <Text variant="caption" color="rgba(255,255,255,0.9)">
                {open
                  ? t('intelligence.cardContinueBody', { done: Object.keys(open.done ?? {}).length })
                  : t('intelligence.cardCtaBody')}
              </Text>
            </View>
            <ChevronRight size={22} color="#FFFFFF" />
          </View>
        </AnimatedGradient>
      </Card>
    );
  }

  const top = topPercent(gi.percentile);
  return (
    <Card
      onPress={go}
      level={1}
      padded
      accessibilityLabel={t('intelligence.cardA11y', { score: gi.overall })}
      testID="gi-card"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <GiRing score={gi.overall} subscores={gi.subscores} size={88} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="overline" tone="muted">
            {t('intelligence.title')}
          </Text>
          {top != null ? (
            <Text variant="bodyStrong">{t('intelligence.cardTop', { percent: top })}</Text>
          ) : (
            <Text variant="bodyStrong">{t('intelligence.tagline')}</Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {gi.share_with_clubs ? (
              <Eye size={14} color={colors.success} />
            ) : (
              <EyeOff size={14} color={colors.textMuted} />
            )}
            <Text variant="caption" tone={gi.share_with_clubs ? 'success' : 'muted'}>
              {gi.share_with_clubs ? t('intelligence.cardShared') : t('intelligence.cardPrivate')}
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

/**
 * Someone else's Game Intelligence, on their profile — only what they chose
 * to share and the server agreed to show (`get_game_intelligence`). Renders
 * nothing at all when there is nothing to show, which is the common case.
 */
export function TheirGiCard({ userId }: { userId: string }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const gi = useAsync<GiPublic | null>(() => getGameIntelligence(userId), [userId]);

  const data = gi.data;
  if (!data || data.overall == null) return null;
  const top = topPercent(data.percentile);

  if (data.view === 'badge') {
    return (
      <Card padded level={1} testID="gi-their-badge">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GiRing score={data.overall} size={64} />
          <View style={{ flex: 1 }}>
            <Text variant="overline" tone="muted">
              {t('intelligence.theirTitle')}
            </Text>
            {top != null ? (
              <Text variant="bodyStrong">{t('intelligence.theirTop', { percent: top })}</Text>
            ) : null}
          </View>
        </View>
      </Card>
    );
  }

  const confidence = t(
    data.confidence === 'high'
      ? 'intelligence.confidenceHigh'
      : data.confidence === 'medium'
        ? 'intelligence.confidenceMedium'
        : 'intelligence.confidenceLow',
  );

  return (
    <Card padded level={1} style={{ gap: spacing.lg }} testID="gi-their-card">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <GiRing score={data.overall} subscores={data.subscores} size={88} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="overline" tone="muted">
            {t('intelligence.theirTitle')}
          </Text>
          {top != null ? (
            <Text variant="bodyStrong">{t('intelligence.theirTop', { percent: top })}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
            <Badge
              label={t('intelligence.theirConfidence', { level: confidence })}
              tone={data.confidence === 'high' ? 'success' : data.confidence === 'medium' ? 'info' : 'warning'}
            />
            {data.tests_completed != null ? (
              <Badge label={t('intelligence.theirTests', { n: data.tests_completed })} />
            ) : null}
          </View>
          {data.last_session_at ? (
            <Text variant="caption" tone="muted">
              {t('intelligence.theirPlayed', { date: fullDate(data.last_session_at) })}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        {GI_TESTS.map((x) => (
          <SubScoreBar
            key={x.key}
            label={t(`intelligence.tests.${x.i18n}.what`)}
            value={data.subscores?.[x.key]}
            color={colors.play[x.hue]}
          />
        ))}
      </View>
    </Card>
  );
}
