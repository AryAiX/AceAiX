import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingDown, TrendingUp, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { Avatar, Badge, ScoreBar, ScoreRing, SkeletonList, Text } from '@/components/ui';
import { tierLabel, visibleTopPercent } from '@/components/profile/ScoreCard';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { getMyPostScores, getProfile } from '@/lib/api';
import { scoreWhenPosted } from '@/lib/scoreTimeline';
import { fullDate } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import type { ScorePillars } from '@/types/models';

/* The five parts in the same order as Profile's breakdown. */
const PILLARS: { key: keyof ScorePillars; label: string }[] = [
  { key: 'performance', label: 'score.pillarPerformance' },
  { key: 'profile', label: 'score.pillarProfile' },
  { key: 'media', label: 'score.pillarMedia' },
  { key: 'credibility', label: 'score.pillarCredibility' },
  { key: 'engagement', label: 'score.pillarEngagement' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  name: string;
  avatar: string | null;
  /** The score the post already carried, shown at once while details load. */
  score: number;
  /** When the post went up: on your own posts the card compares your score then and now. */
  postedAt?: string | null;
  /** The post's id, to find the score this phone saved when you posted it. */
  postId?: string;
}

/**
 * A quick look at an athlete's Talent Score from a Playfeed post. The page
 * dims, the card springs up; tap outside it or the × to close.
 *
 * It reads the same profile data their profile screen shows a visitor, under
 * the same rules: nothing new on the server, and nothing a visitor could not
 * already see. The week's change is shown only on your own posts, as on
 * Profile.
 */
export function ScorePeek({ visible, onClose, userId, name, avatar, score, postedAt, postId }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const { profile } = useAuth();
  const own = profile?.id === userId;

  const bundle = useAsync(() => getProfile(userId), [userId], { enabled: visible });
  const full = bundle.data?.score ?? null;
  const shown = full?.overall ?? score;
  const tier = tierForScore(shown);
  const glow = TierColors[tier];

  /* Your own posts only: your score at the moment you posted (saved on this
     phone, or worked out from your own score history, which only you can read). */
  const mine = useAsync(() => getMyPostScores(), [userId], { enabled: visible && own && !!postedAt });
  const thenScore =
    own && full && mine.data && postedAt
      ? scoreWhenPosted(postId ? mine.data.saved[postId] : null)
      : null;

  const topPercent = visibleTopPercent(full?.percentile);
  const delta = full?.previous_overall != null ? full.overall - full.previous_overall : null;

  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [visible, pop]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* The dimmed page: tapping it closes. */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        style={{
          flex: 1,
          backgroundColor: 'rgba(22,19,39,0.5)',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
        }}
      >
        <Animated.View
          style={{
            opacity: pop,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
          }}
        >
          {/* A press inside the card must not close it. */}
          <Pressable
            onPress={() => undefined}
            accessible={false}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xxl + 4,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.xl,
              paddingBottom: spacing.lg,
              overflow: 'hidden',
              shadowColor: '#0A061E',
              shadowOpacity: 0.35,
              shadowRadius: 30,
              shadowOffset: { width: 0, height: 18 },
              elevation: 14,
            }}
            testID="score-peek"
          >
            {/* The tier's colour fading softly into the card from the top. */}
            <LinearGradient
              pointerEvents="none"
              colors={[theme.alpha(glow, theme.scheme === 'dark' ? 0.22 : 0.2), theme.alpha(glow, 0)]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220 }}
            />

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              testID="score-peek-close"
              style={({ pressed }) => ({
                position: 'absolute',
                top: spacing.md,
                right: spacing.md,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
                zIndex: 2,
              })}
            >
              <X size={15} color={colors.textSecondary} strokeWidth={2.6} />
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
              <Avatar uri={avatar} name={name} size="sm" score={shown} />
              <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {name}
              </Text>
            </View>

            <View style={{ alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md }}>
              <ScoreRing score={shown} size={168} showTier />
            </View>

            {topPercent != null || (own && delta) ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  marginBottom: spacing.lg,
                }}
              >
                {topPercent != null ? (
                  <Badge label={t('score.topPercentOther', { percent: topPercent })} tone="primary" />
                ) : null}
                {own && delta ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {delta > 0 ? (
                      <TrendingUp size={15} color={colors.success} />
                    ) : (
                      <TrendingDown size={15} color={colors.danger} />
                    )}
                    <Text variant="captionStrong" tone={delta > 0 ? 'success' : 'danger'}>
                      {t(delta > 0 ? 'score.pointsUp' : 'score.pointsDown', { count: Math.abs(delta) })}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {full ? (
              <View style={{ gap: spacing.md }}>
                {PILLARS.map((pillar) => (
                  <ScoreBar
                    key={pillar.key}
                    label={t(pillar.label)}
                    value={Math.round(full.pillars?.[pillar.key] ?? 0)}
                    color={colors.primary}
                  />
                ))}
              </View>
            ) : bundle.loading ? (
              <SkeletonList count={2} variant="row" />
            ) : null}

            {thenScore != null && full && postedAt ? (
              <ThenAndNow then={thenScore} now={full.overall} postedAt={postedAt} />
            ) : null}

            <Text variant="caption" tone="muted" style={{ textAlign: 'center', marginTop: spacing.lg }}>
              {t('feed.scorePeekHint')}
            </Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/** "When you posted this": your score that day beside your score now. */
function ThenAndNow({ then, now, postedAt }: { then: number; now: number; postedAt: string }) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const diff = now - then;
  const thenTier = tierForScore(then);
  const nowTier = tierForScore(now);
  const tierMoved = thenTier !== nowTier;

  const chip = (value: number, highlight: boolean) => {
    const tier = tierForScore(value);
    return (
      <View
        style={{
          width: 62,
          paddingVertical: 6,
          borderRadius: radii.md,
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: highlight ? theme.alpha(TierColors[tier], 0.6) : colors.border,
        }}
      >
        <Text variant="stat" style={{ fontSize: 22, lineHeight: 26 }}>
          {value}
        </Text>
        <Text variant="overline" tone="muted" numberOfLines={1} style={{ fontSize: 9 }}>
          {tierLabel(t, tier)}
        </Text>
      </View>
    );
  };

  const line =
    diff === 0
      ? t('feed.scoreThenSame')
      : tierMoved && diff > 0
        ? t('feed.scoreThenUpTier', { count: diff, tier: tierLabel(t, nowTier) })
        : t(diff > 0 ? 'feed.scoreThenUp' : 'feed.scoreThenDown', { count: Math.abs(diff) });

  return (
    <View
      testID="score-peek-then"
      style={{
        marginTop: spacing.lg,
        padding: spacing.md,
        borderRadius: radii.lg,
        backgroundColor: colors.surfaceAlt,
        gap: spacing.sm,
      }}
    >
      <Text variant="overline" tone="muted">
        {t('feed.scoreThenTitle', { date: fullDate(postedAt) })}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {chip(then, false)}
        {/* The same trend icons as the week's change above, picked at render
            time (an icon chosen when the file loads came out empty). */}
        {diff < 0 ? (
          <TrendingDown size={18} color={colors.danger} strokeWidth={2.6} />
        ) : (
          <TrendingUp size={18} color={diff > 0 ? colors.success : colors.textMuted} strokeWidth={2.6} />
        )}
        {chip(now, true)}
        <Text
          variant="caption"
          tone={diff > 0 ? 'success' : diff < 0 ? 'danger' : 'secondary'}
          style={{ flex: 1 }}
          numberOfLines={3}
        >
          {line}
        </Text>
      </View>
    </View>
  );
}
