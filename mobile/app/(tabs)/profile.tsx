import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, ErrorState, Screen, SkeletonList, Text } from '@/components/ui';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ScoreCard } from '@/components/profile/ScoreCard';
import { MyCoachingCard } from '@/components/coaching/CoachingCard';
import { ClubManageHub } from '@/components/club/manage/ClubManageHub';
import { MyClubCard } from '@/components/club/manage/MyClubCard';
import { MyGiCard } from '@/components/intelligence/GiCard';
import { MySportFitCard } from '@/components/sportfit/SportFitCard';
import { MyInviteCard } from '@/components/invite/InviteCard';
import { SponsorshipProfileCard } from '@/components/sponsorship/SponsorshipCard';
import { MyBrandCard } from '@/components/sponsorship/SponsorshipPortal';
import { SupportsRow } from '@/components/profile/SupportsRow';
import { CoachStats } from '@/components/profile/CoachStats';
import { GuardianAthletesCard } from '@/components/guardian/GuardianAthletesCard';
import { GuardianStats } from '@/components/profile/GuardianStats';
import { SponsorStats } from '@/components/profile/SponsorStats';
import { StatRow } from '@/components/profile/StatRow';
import { ProfileTabs, ProfileTab, toProfileTab } from '@/components/profile/ProfileTabs';
import { PostsTab } from '@/components/profile/PostsTab';
import { HighlightsTab } from '@/components/profile/HighlightsTab';
import { CareerTab } from '@/components/profile/CareerTab';
import { useAsync } from '@/hooks/useAsync';
import { useTabReselect } from '@/hooks/useTabReselect';
import { getMyProfile, getMyTalentScore } from '@/lib/api';
import { getClubPage, getMyClubPages, managedClubPage } from '@/lib/api.club';
import type { ClubType } from '@/lib/club';
import { Routes } from '@/lib/routes';
import { compactNumber, displayName, metaLine } from '@/lib/format';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';

/**
 * My profile — the shop window I control.
 *
 * The Talent Score sits above the fold because it is the reason to come back,
 * and every tab below it is a way to move that number.
 */
export default function MyProfileScreen() {
  const focused = useIsFocused();
  const theme = useTheme();
  const { spacing } = theme;
  const router = useRouter();
  const t = useT();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string; add?: string }>();

  const [tab, setTab] = useState<ProfileTab>(() => toProfileTab(params.tab));
  // A tip on /score deep-links straight to a tab; honour it while mounted too.
  useEffect(() => {
    if (params.tab) setTab(toProfileTab(params.tab));
  }, [params.tab]);

  /* Bumped to make the tab children re-fetch alongside a pull-to-refresh. */
  const [childKey, setChildKey] = useState(0);

  const bundle = useAsync(() => getMyProfile(), [user?.id], {
    enabled: !!user?.id,
    refetchOnFocus: true,
  });
  const score = useAsync(() => getMyTalentScore(), [user?.id], { enabled: !!user?.id });
  // One load for the header's club/academy line and the managed-page card.
  const clubPages = useAsync(() => getMyClubPages(), [user?.id, childKey], {
    enabled: !!user?.id,
    refetchOnFocus: true,
  });
  const managed =
    bundle.data?.user.role === 'club' ? managedClubPage(clubPages.data ?? []) : null;
  // The control room needs the full page, not just the summary on `my_club_pages`.
  const clubPage = useAsync(() => getClubPage(managed?.id ?? ''), [managed?.id, childKey], {
    enabled: !!managed?.id,
    refetchOnFocus: true,
  });

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

  /* Tap Profile again: back to the top, then reload. */
  const scrollRef = useTabReselect(reloadAll);

  /* Once the cover has scrolled away, a strip in the page colour sits behind
     the clock and the Dynamic Island so cards don't slide under them, and the
     status-bar icons turn dark in light mode. */
  const insets = useSafeAreaInsets();
  const [pastCover, setPastCover] = useState(false);
  const stripOpacity = useRef(new Animated.Value(0)).current;
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const past = event.nativeEvent.contentOffset.y > 150;
    setPastCover((current) => (current === past ? current : past));
  }, []);
  useEffect(() => {
    Animated.timing(stripOpacity, {
      toValue: pastCover ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [pastCover, stripOpacity]);

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
  const pageType: ClubType | null =
    managed?.type === 'club' || managed?.type === 'academy' ? managed.type : null;

  return (
    <View style={{ flex: 1 }}>
    <Screen
      scroll
      padded={false}
      edges={[]}
      scrollRef={scrollRef}
      onScroll={onScroll}
      onRefresh={reloadAll}
      refreshing={bundle.refreshing || score.refreshing}
      testID="my-profile"
    >
      {/* White status-bar icons over the cover, only while this tab is open. */}
      {focused ? <StatusBar style={pastCover && theme.scheme !== 'dark' ? 'dark' : 'light'} /> : null}
      <ProfileHeader bundle={data} onChanged={reloadAll} pageType={pageType} coverUnderStatusBar />

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

      {/* Parent onboarding never asks where they live, but every account needs it (QA-156). */}
      {data.user.role === 'guardian' && (!data.user.country || !data.user.city) ? (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <Card testID="location-reminder" style={{ gap: spacing.sm }}>
            <Text variant="bodyStrong">{t('profile.locationReminderTitle')}</Text>
            <Text variant="caption" tone="muted">
              {t('profile.locationReminderBody')}
            </Text>
            <Button
              label={t('profile.locationReminderCta')}
              variant="secondary"
              size="sm"
              onPress={() => router.push(Routes.editProfile)}
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
        {data.user.role === 'sponsor' ? <MyBrandCard refreshKey={childKey} /> : null}

        {athlete ? (
          <ScoreCard score={liveScore} onPress={() => router.push(Routes.score)} />
        ) : null}

        {/* Beside the Talent Score, never inside it — docs/26 §4. */}
        {athlete ? <MyGiCard refreshKey={childKey} /> : null}
        {/* Private to the athlete; never shown to anyone else — docs/32 §5. */}
        {athlete ? <MySportFitCard refreshKey={childKey} /> : null}

        {athlete || data.user.role === 'coach' ? <MyInviteCard refreshKey={childKey} /> : null}

        {/* QA-157: a club account that already runs a page gets the control room here. */}
        {data.user.role === 'club' && clubPage.data ? (
          <ClubManageHub page={clubPage.data} />
        ) : data.user.role === 'club' && clubPage.error ? (
          <ErrorState message={clubPage.error} onRetry={clubPage.reload} compact />
        ) : null}
        <MyClubCard
          isClubAccount={data.user.role === 'club'}
          pages={clubPages.data}
          hideManagedCard={data.user.role === 'club' && !!managed}
        />

        {data.user.role === 'coach' ? <MyCoachingCard refreshKey={childKey} /> : null}
        {data.user.role === 'guardian' ? <GuardianAthletesCard refreshKey={childKey} /> : null}
        {data.user.role !== 'coach' &&
        data.user.role !== 'sponsor' &&
        data.user.role !== 'guardian' &&
        data.user.role !== 'club' ? (
          <Button
            size="sm"
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
        {data.user.role !== 'club' ? (
          <SupportsRow userId={data.user.id} isSelf sport={athlete?.sport} />
        ) : null}

        {athlete ? (
          <Button
            size="sm"
            label={t('profile.playerCard')}
            variant="secondary"
            onPress={() => router.push(Routes.playerCard)}
          />
        ) : null}

        {data.user.role === 'coach' ? (
          <CoachStats
            userId={data.user.id}
            isSelf
            posts={data.stats?.posts ?? 0}
            onPosts={() => setTab('posts')}
            refreshKey={childKey}
          />
        ) : data.user.role === 'sponsor' ? (
          <SponsorStats
            userId={data.user.id}
            isSelf
            posts={data.stats?.posts ?? 0}
            onPosts={() => setTab('posts')}
            refreshKey={childKey}
          />
        ) : data.user.role === 'guardian' ? (
          <GuardianStats
            userId={data.user.id}
            isSelf
            posts={data.stats?.posts ?? 0}
            onPosts={() => setTab('posts')}
            refreshKey={childKey}
          />
        ) : data.user.role !== 'club' ? (
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
        ) : null}

        {athlete ? (
          <ProfileTabs
            value={tab}
            onChange={setTab}
            postCount={data.stats?.posts ?? 0}
            clipCount={data.stats?.media ?? 0}
          />
        ) : null}

        {data.user.role !== 'club' && (!athlete || tab === 'posts') ? (
          <PostsTab userId={data.user.id} isSelf refreshKey={childKey} />
        ) : athlete && tab === 'highlights' ? (
          <HighlightsTab
            athleteId={athlete.id}
            isSelf
            refreshKey={childKey}
            /* From the + menu's Highlight bubble: open the photo library
               straight away, once. */
            autoAdd={params.add === 'highlight'}
            onAutoAdded={() => router.setParams({ add: undefined })}
            onChanged={onTabDataChanged}
            tips={score.data?.tips ?? []}
            author={{
              name: displayName(data.user.full_name),
              avatar: data.user.avatar_url ?? null,
              verified: !!data.user.is_verified,
              score: score.data?.overall ?? null,
              meta: metaLine(positionLabel(t, athlete.position, athlete.sport), sportLabel(t, athlete.sport)),
            }}
          />
        ) : athlete ? (
          <CareerTab
            athleteId={athlete.id}
            isSelf
            honors={athlete.honors ?? []}
            certifications={athlete.certifications ?? []}
            refreshKey={childKey}
            onChanged={onTabDataChanged}
          />
        ) : null}
      </View>
    </Screen>
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: insets.top,
        backgroundColor: theme.colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        opacity: stripOpacity,
      }}
    />
    </View>
  );
}
