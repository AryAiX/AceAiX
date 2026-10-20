import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, ErrorState, Screen, SkeletonList, Text } from '@/components/ui';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ScoreCard } from '@/components/profile/ScoreCard';
import { MyCoachingCard } from '@/components/coaching/CoachingCard';
import { MyClubCard } from '@/components/club/manage/MyClubCard';
import { MyGiCard } from '@/components/intelligence/GiCard';
import { MySportFitCard } from '@/components/sportfit/SportFitCard';
import { SponsorshipProfileCard } from '@/components/sponsorship/SponsorshipCard';
import { SupportsRow } from '@/components/profile/SupportsRow';
import { StatRow } from '@/components/profile/StatRow';
import { ProfileTabs, ProfileTab, toProfileTab } from '@/components/profile/ProfileTabs';
import { PostsTab } from '@/components/profile/PostsTab';
import { HighlightsTab } from '@/components/profile/HighlightsTab';
import { CareerTab } from '@/components/profile/CareerTab';
import { useAsync } from '@/hooks/useAsync';
import { getMyProfile, getMyTalentScore } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { compactNumber } from '@/lib/format';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';

/**
 * My profile — the shop window I control.
 *
 * The Talent Score sits above the fold because it is the reason to come back,
 * and every tab below it is a way to move that number.
 */
export default function MyProfileScreen() {
  const theme = useTheme();
  const { spacing } = theme;
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [tab, setTab] = useState<ProfileTab>(() => toProfileTab(params.tab));
  // A tip on /score deep-links straight to a tab; honour it while mounted too.
  useEffect(() => {
    if (params.tab) setTab(toProfileTab(params.tab));
  }, [params.tab]);

  const bundle = useAsync(() => getMyProfile(), [user?.id], {
    enabled: !!user?.id,
    refetchOnFocus: true,
  });
  const score = useAsync(() => getMyTalentScore(), [user?.id], { enabled: !!user?.id });

  /* Bumped to make the tab children re-fetch alongside a pull-to-refresh. */
  const [childKey, setChildKey] = useState(0);

  const reloadAll = useCallback(() => {
    bundle.refresh();
    score.refresh();
    setChildKey((key) => key + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle.refresh, score.refresh]);

  const onTabDataChanged = useCallback(() => {
    // Adding a clip or a match moves the score, so re-read it.
    score.refresh();
    bundle.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score.refresh, bundle.refresh]);

  if (bundle.loading && !bundle.data) {
    return (
      <Screen>
        <SkeletonList count={3} />
      </Screen>
    );
  }

  if (bundle.error || !bundle.data) {
    return (
      <Screen>
        <ErrorState message={bundle.error} onRetry={bundle.reload} />
      </Screen>
    );
  }

  const data = bundle.data;
  const athlete = data.athlete;
  const liveScore = score.data ?? data.score;

  return (
    <Screen
      scroll
      padded={false}
      onRefresh={reloadAll}
      refreshing={bundle.refreshing || score.refreshing}
      testID="my-profile"
    >
      <ProfileHeader bundle={data} onChanged={reloadAll} />

      {data.athlete && (data.athlete.other_sports ?? []).length === 0 ? (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <Card testID="also-plays-reminder" style={{ gap: spacing.sm }}>
            <Text variant="bodyStrong">{t('profile.alsoPlaysReminderTitle')}</Text>
            <Text variant="caption" tone="muted">
              {t('profile.alsoPlaysReminderBody')}
            </Text>
            <Button
              label={t('profile.alsoPlaysReminderCta')}
              variant="secondary"
              size="sm"
              onPress={() =>
                router.push({ pathname: Routes.editProfile, params: { focus: 'alsoPlays' } })
              }
            />
          </Card>
        </View>
      ) : null}

      <View
        style={{
          paddingHorizontal: spacing.lg,
          marginTop: spacing.xl,
          gap: spacing.lg,
        }}
      >
        {athlete ? (
          <ScoreCard score={liveScore} onPress={() => router.push(Routes.score)} />
        ) : null}

        {/* Beside the Talent Score, never inside it — docs/26 §4. */}
        {athlete ? <MyGiCard refreshKey={childKey} /> : null}
        {/* Private to the athlete; never shown to anyone else — docs/31 §5. */}
        {athlete ? <MySportFitCard refreshKey={childKey} /> : null}

        {/* The page a club runs, or an invitation to help run one. */}
        <MyClubCard isClubAccount={data.user.role === 'club'} refreshKey={childKey} />

        {data.user.role === 'coach' ? <MyCoachingCard refreshKey={childKey} /> : null}
        {data.user.role !== 'coach' && data.user.role !== 'sponsor' ? (
          <Button
            label={t('coaching.myBookings')}
            variant="secondary"
            onPress={() => router.push(Routes.coaching)}
            testID="open-my-sessions"
          />
        ) : null}

        {athlete || data.user.role === 'sponsor' ? (
          <SponsorshipProfileCard
            userId={data.user.id}
            displayName={data.user.full_name ?? ''}
            refreshKey={childKey}
          />
        ) : null}
        {data.user.role === 'sponsor' || data.user.role === 'guardian' ? (
          <Button
            label={t('sponsorship.openPortal')}
            variant="secondary"
            onPress={() => router.push(Routes.sponsorship)}
            testID="open-sponsorship-portal"
          />
        ) : null}

        <SupportsRow userId={data.user.id} isSelf sport={athlete?.sport} />

        {athlete ? (
          <Button
            label={t('profile.playerCard')}
            variant="secondary"
            onPress={() => router.push(Routes.playerCard)}
          />
        ) : null}

        <StatRow
          items={[
            {
              key: 'posts',
              label: t('common.posts'),
              value: compactNumber(data.stats?.posts ?? 0),
              onPress: () => setTab('posts'),
            },
            {
              key: 'media',
              label: t('common.clips'),
              value: compactNumber(data.stats?.media ?? 0),
              onPress: () => setTab('highlights'),
            },
            {
              key: 'matches',
              label: t('common.matches'),
              value: compactNumber(data.stats?.matches ?? 0),
              onPress: () => setTab('career'),
            },
            {
              key: 'endorsements',
              label: t('common.endorsed'),
              value: compactNumber(data.stats?.endorsements ?? 0),
              onPress: () => setTab('career'),
            },
          ]}
        />

        {athlete ? <ProfileTabs value={tab} onChange={setTab} /> : null}

        {!athlete || tab === 'posts' ? (
          <PostsTab userId={data.user.id} isSelf refreshKey={childKey} />
        ) : tab === 'highlights' ? (
          <HighlightsTab
            athleteId={athlete.id}
            isSelf
            refreshKey={childKey}
            onChanged={onTabDataChanged}
          />
        ) : (
          <CareerTab
            athleteId={athlete.id}
            isSelf
            honors={athlete.honors ?? []}
            certifications={athlete.certifications ?? []}
            refreshKey={childKey}
            onChanged={onTabDataChanged}
          />
        )}
      </View>
    </Screen>
  );
}
