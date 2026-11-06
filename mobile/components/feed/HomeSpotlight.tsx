import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Eye, Flame, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { openChallenges, profileViewDigest } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { deadlineLabel, metaLine } from '@/lib/format';
import { useT } from '@/i18n';
import { isChallengeLive } from '@/components/challenges/ChallengeCard';

/** The challenge ombre, coral to pink — the same sweep as Play's + button —
    with white words on it. */
const OMBRE: [string, string] = ['#F06A4E', '#E3428A'];
const ON_OMBRE = '#FFFFFF';

/* What was put away, so a dismissed card stays away until there is something
   new: the views card until the count changes, the challenge card for that
   challenge. Kept on the phone only. */
const DISMISS_VIEWS = 'home.yourWeek.dismissedViews';
const DISMISS_CHALLENGE = 'home.yourWeek.dismissedChallenge';

async function readDismissed(): Promise<{ views: string | null; challenge: string | null }> {
  try {
    const [views, challenge] = await Promise.all([
      AsyncStorage.getItem(DISMISS_VIEWS),
      AsyncStorage.getItem(DISMISS_CHALLENGE),
    ]);
    return { views, challenge };
  } catch {
    return { views: null, challenge: null };
  }
}

/**
 * Your week — above the feed, as nudge pop-ups.
 *
 * Who has been reading your profile, on a white pop-up with a blue round
 * icon; this week's challenge, on the coral → pink ombre. Each floats on its
 * own like a notification and can be put away with its ×; it comes back when
 * there is something new. The Talent
 * Score lives on Profile only, so Home is not one more place to watch a
 * number. With nothing to say, nothing is shown.
 */
export function HomeSpotlight({ showChallenge = true }: { showChallenge?: boolean } = {}) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const router = useRouter();
  const { profile, isGuardian } = useAuth();

  const isAthlete = profile?.role === 'athlete';

  const digest = useAsync(() => profileViewDigest(7), [], {
    enabled: isAthlete,
    refetchOnFocus: true,
  });
  const challenges = useAsync(() => openChallenges(null, 5, 0), [], {
    enabled: !isGuardian,
    refetchOnFocus: true,
  });

  const [dismissed, setDismissed] = useState<{ views: string | null; challenge: string | null }>({
    views: null,
    challenge: null,
  });
  useEffect(() => {
    void readDismissed().then(setDismissed);
  }, []);

  const rawViews = isAthlete && digest.data && digest.data.total > 0 ? digest.data : null;
  // Parents cannot enter challenges, so the card has nothing for them (QA-151).
  // Home's Following tab is people, so the challenge card stays on Playfeed.
  const rawChallenge = isGuardian || !showChallenge
    ? null
    : ((challenges.data ?? []).find(isChallengeLive) ?? null);

  const viewsKey = rawViews ? String(rawViews.total) : null;
  const views = rawViews && dismissed.views !== viewsKey ? rawViews : null;
  const challenge = rawChallenge && dismissed.challenge !== rawChallenge.id ? rawChallenge : null;

  if (!views && !challenge) return null;

  const dismiss = (which: 'views' | 'challenge', value: string) => {
    setDismissed((d) => ({ ...d, [which]: value }));
    AsyncStorage.setItem(which === 'views' ? DISMISS_VIEWS : DISMISS_CHALLENGE, value).catch(() => undefined);
  };

  /** The × in a card's corner. */
  const close = (onPress: () => void, color: string, testID: string) => (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t('common.close')}
      testID={testID}
      style={({ pressed }) => ({ padding: 2, opacity: pressed ? 0.5 : 0.75 })}
    >
      <X size={16} color={color} />
    </Pressable>
  );

  const card = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
  };
  const tile = {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View style={{ gap: spacing.sm }} testID="your-week">
      {views ? (
        <Pressable
          onPress={() => router.push(Routes.profileViews)}
          accessibilityRole="button"
          accessibilityLabel={t('views.homeTitle', { count: views.total })}
          testID="your-week-views"
          style={({ pressed }) => ({
            ...card,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.85 : 1,
            shadowColor: '#140C46',
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 5,
          })}
        >
          <View style={[tile, { backgroundColor: colors.primary }]}>
            <Eye size={19} color={ON_OMBRE} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {t('views.homeTitle', { count: views.total })}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {views.professional > 0
                ? t('views.homeProfessional', { count: views.professional })
                : t('views.homeEmptyBody')}
            </Text>
          </View>
          {views.new_since_seen > 0 ? (
            <Badge label={t('views.newBadge', { count: views.new_since_seen })} tone="primary" />
          ) : null}
          {close(() => dismiss('views', viewsKey ?? ''), colors.textMuted, 'your-week-views-close')}
        </Pressable>
      ) : null}

      {challenge ? (
        <Pressable
          onPress={() => router.push(Routes.challenge(challenge.id))}
          accessibilityRole="button"
          accessibilityLabel={challenge.title}
          testID="your-week-challenge"
          style={({ pressed }) => ({
            ...card,
            overflow: 'hidden',
            opacity: pressed ? 0.9 : 1,
            shadowColor: OMBRE[1],
            shadowOpacity: 0.3,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          })}
        >
          <LinearGradient
            colors={OMBRE}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: radii.lg }]}
          />
          <View style={[tile, { backgroundColor: theme.alpha(ON_OMBRE, 0.25) }]}>
            <Flame size={19} color={ON_OMBRE} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" color={ON_OMBRE} numberOfLines={1}>
              {challenge.title}
            </Text>
            <Text variant="caption" color={theme.alpha(ON_OMBRE, 0.88)} numberOfLines={1}>
              {metaLine(
                deadlineLabel(challenge.closes_at),
                t('challenges.entries', { count: challenge.entry_count }),
              )}
            </Text>
          </View>
          <Text variant="captionStrong" color={ON_OMBRE}>
            {t(challenge.my_entry_id ? 'challenges.homeEnteredCta' : 'challenges.homeCta')}
          </Text>
          {close(() => dismiss('challenge', challenge.id), ON_OMBRE, 'your-week-challenge-close')}
        </Pressable>
      ) : null}
    </View>
  );
}
