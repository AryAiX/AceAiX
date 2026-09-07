import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Eye, Flame } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AnimatedNumber, Badge, Card, Tappable, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { openChallenges, profileViewDigest } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { deadlineLabel } from '@/lib/format';
import { useT } from '@/i18n';

/**
 * The two things above the feed.
 *
 * Both answer "why open this today" without asking for anything: who has been
 * reading your profile, and what a coach has asked for this week. Neither
 * counts down, neither says you are behind, and both disappear entirely when
 * there is nothing to say — an empty card is worse than no card.
 */
export function HomeSpotlight() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();

  const isAthlete = profile?.role === 'athlete';

  const digest = useAsync(() => profileViewDigest(7), [], {
    enabled: isAthlete,
    refetchOnFocus: true,
  });
  const challenges = useAsync(() => openChallenges(null, 5, 0), [], { refetchOnFocus: true });

  const views = digest.data;
  const challenge = (challenges.data ?? []).find((c) => c.status === 'open') ?? null;

  if (!views?.total && !challenge) return null;

  return (
    <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
      {isAthlete && views && views.total > 0 ? (
        <Tappable onPress={() => router.push(Routes.profileViews)} accessibilityLabel={t('views.title')}>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <LinearGradient
              colors={[theme.alpha(colors.info, 0.2), 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              pointerEvents="none"
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.lg,
              }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.alpha(colors.info, 0.16),
                }}
              >
                <Eye size={22} color={colors.info} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <AnimatedNumber value={views.total} variant="stat" />
                  <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                    {t('views.title')}
                  </Text>
                </View>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {views.professional > 0
                    ? t('views.homeProfessional', { count: views.professional })
                    : t('views.homeEmptyBody')}
                </Text>
              </View>

              {views.new_since_seen > 0 ? (
                <Badge
                  label={t('views.newBadge', { count: views.new_since_seen })}
                  tone="primary"
                  solid
                />
              ) : (
                <ChevronRight size={18} color={colors.textMuted} />
              )}
            </View>
          </Card>
        </Tappable>
      ) : null}

      {challenge ? (
        <Tappable
          onPress={() => router.push(Routes.challenge(challenge.id))}
          accessibilityLabel={challenge.title}
        >
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <LinearGradient
              colors={[theme.alpha(colors.primary, 0.24), 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1.2 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              pointerEvents="none"
            />
            <View style={{ padding: spacing.lg, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Flame size={14} color={colors.primary} />
                <Text variant="overline" tone="primary">
                  {t('challenges.homeTitle')}
                </Text>
              </View>

              <Text variant="subheading" numberOfLines={2}>
                {challenge.title}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: spacing.xs,
                }}
              >
                <Text variant="caption" tone="muted">
                  {deadlineLabel(challenge.closes_at) ?? ''}
                  {' · '}
                  {t('challenges.entries', { count: challenge.entry_count })}
                </Text>
                <Text variant="captionStrong" tone="primary">
                  {t(challenge.my_entry_id ? 'challenges.homeEnteredCta' : 'challenges.homeCta')}
                </Text>
              </View>
            </View>
          </Card>
        </Tappable>
      ) : null}
    </View>
  );
}
