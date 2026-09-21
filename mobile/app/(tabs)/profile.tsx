import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, ErrorState, Screen, SkeletonList } from '@/components/ui';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ScoreCard } from '@/components/profile/ScoreCard';
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
