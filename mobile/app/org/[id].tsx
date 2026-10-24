import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Building2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, Header, Screen, SkeletonList, useToast } from '@/components/ui';
import { ScrollTabs } from '@/components/explore/ScrollTabs';
import { ClubHeader } from '@/components/club/page/ClubHeader';
import { ClubBanners } from '@/components/club/page/ClubBanners';
import { ClubPostsTab } from '@/components/club/page/PostsTab';
import { ClubMatchesTab } from '@/components/club/page/MatchesTab';
import { ClubSquadsTab } from '@/components/club/page/SquadsTab';
import { ClubEventsTab } from '@/components/club/page/EventsTab';
import { ClubChallengesTab } from '@/components/club/page/ChallengesTab';
import { ClubAwardsTab } from '@/components/club/page/AwardsTab';
import { ClubAboutTab } from '@/components/club/page/AboutTab';
import { ClubOpeningsTab } from '@/components/club/page/OpeningsTab';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { toggleSaveOpportunity } from '@/lib/api';
import { getClubMapUrl, getClubPage, setClubFollow } from '@/lib/api.club';
import { organizationOpenings } from '@/lib/api.opportunities';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import type { Opportunity, Organization } from '@/types/models';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Tab = 'posts' | 'matches' | 'squads' | 'events' | 'challenges' | 'awards' | 'about' | 'openings';
const TABS: Tab[] = ['posts', 'matches', 'squads', 'events', 'challenges', 'awards', 'about', 'openings'];

/** "Posts 12" — a count only where there is one. */
function withCount(label: string, count: number | undefined): string {
  return count && count > 0 ? `${label} ${count}` : label;
}

/**
 * A club or academy page: who they are, what they play, how they're doing,
 * and what's open. Each tab loads when it is first opened and stays loaded.
 */
export default function OrganizationScreen() {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof raw === 'string' && UUID.test(raw) ? raw : null;

  const page = useAsync(() => getClubPage(id as string), [id], { enabled: !!id });
  const mapLink = useAsync(() => getClubMapUrl(id as string), [id], { enabled: !!id });
  const club = page.data ?? null;
  const org = club?.organization ?? null;

  /* organizationOpenings wants the old Organization shape; the page has all of it. */
  const organization = useMemo<Organization | null>(
    () =>
      org
        ? {
            id: org.id,
            name: org.name,
            type: org.type,
            logo_url: org.logo_url,
            cover_url: org.cover_url,
            description: org.description,
            city: org.city,
            country: org.country,
            league: org.league,
            is_verified: org.is_verified,
            followers_count: org.followers_count,
          }
        : null,
    [org],
  );

  const openings = useAsync(
    () => organizationOpenings(organization as Organization),
    [organization?.id],
    { enabled: !!organization },
  );

  const [tab, setTab] = useState<Tab>('posts');
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set<Tab>(['posts']));
  const [refreshKeys, setRefreshKeys] = useState<Partial<Record<Tab, number>>>({});

  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  const [followerDelta, setFollowerDelta] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [savedOverrides, setSavedOverrides] = useState<Record<string, boolean>>({});

  const following = followOverride ?? club?.viewer.following ?? false;

  const openTab = useCallback((next: Tab) => {
    setTab(next);
    setVisited((v) => (v.has(next) ? v : new Set(v).add(next)));
  }, []);

  const onRefresh = useCallback(() => {
    setFollowOverride(null);
    setFollowerDelta(0);
    page.refresh();
    mapLink.refresh();
    if (tab === 'openings') openings.refresh();
    else setRefreshKeys((k) => ({ ...k, [tab]: (k[tab] ?? 0) + 1 }));
  }, [page, mapLink, openings, tab]);

  const onToggleFollow = useCallback(async () => {
    if (!org || followBusy) return;
    const next = !following;
    setFollowOverride(next);
    setFollowerDelta((d) => d + (next ? 1 : -1));
    setFollowBusy(true);
    try {
      await setClubFollow(org.id, next);
    } catch (err) {
      setFollowOverride(!next);
      setFollowerDelta((d) => d + (next ? -1 : 1));
      toast.error(errorMessage(err));
    } finally {
      setFollowBusy(false);
    }
  }, [org, following, followBusy, toast]);

  const onToggleSave = useCallback(
    async (opportunity: Opportunity, next: boolean) => {
      setSavedOverrides((current) => ({ ...current, [opportunity.id]: next }));
      try {
        // The API takes the CURRENT state and flips it.
        await toggleSaveOpportunity(opportunity.id, !next);
        if (next) toast.success(t('opportunities.savedToast'));
      } catch (err) {
        setSavedOverrides((current) => ({ ...current, [opportunity.id]: !next }));
        toast.error(errorMessage(err));
      }
    },
    [t, toast],
  );

  const fallbackHeader = <Header back title={t('common.club')} />;

  if (!id) {
    return (
      <Screen header={fallbackHeader}>
        <EmptyState
          icon={<Building2 size={26} color={colors.textMuted} />}
          title={t('opportunities.org.missingTitle')}
          body={t('opportunities.org.missingBody')}
          actionLabel={t('opportunities.org.backToDiscover')}
          onAction={() => router.replace(Routes.discover)}
        />
      </Screen>
    );
  }

  if (page.loading) {
    return (
      <Screen header={fallbackHeader}>
        <SkeletonList count={2} />
      </Screen>
    );
  }

  if (page.error && !club) {
    return (
      <Screen header={fallbackHeader}>
        <ErrorState message={page.error} onRetry={page.reload} />
      </Screen>
    );
  }

  if (!club || !org) {
    return (
      <Screen header={fallbackHeader}>
        <EmptyState
          icon={<Building2 size={26} color={colors.textMuted} />}
          title={t('opportunities.org.goneTitle')}
          body={t('opportunities.org.goneBody')}
          actionLabel={t('opportunities.org.backToDiscover')}
          onAction={() => router.replace(Routes.discover)}
        />
      </Screen>
    );
  }

  const viewer = club.viewer;
  const counts = club.counts;
  const openCount = openings.data?.length ?? 0;
  const followers = Math.max(0, org.followers_count + followerDelta);

  const labels: Record<Tab, string> = {
    posts: withCount(t('club.tabs.posts'), counts.posts),
    matches: t('club.tabs.matches'),
    squads: t('club.tabs.squads'),
    events: withCount(t('club.tabs.events'), counts.open_events),
    challenges: withCount(t('club.tabs.challenges'), counts.open_challenges),
    awards: withCount(t('club.tabs.awards'), counts.awards),
    about: t('club.tabs.about'),
    openings: withCount(t('club.tabs.openings'), openCount),
  };

  const common = { orgId: org.id, canPost: viewer.can_post };
  const body = (key: Tab): React.ReactNode => {
    const refreshKey = refreshKeys[key] ?? 0;
    switch (key) {
      case 'posts':
        return <ClubPostsTab {...common} refreshKey={refreshKey} clubName={org.name} />;
      case 'matches':
        return <ClubMatchesTab {...common} refreshKey={refreshKey} clubName={org.name} />;
      case 'squads':
        return <ClubSquadsTab {...common} refreshKey={refreshKey} onTeam={viewer.role != null} />;
      case 'events':
        return <ClubEventsTab {...common} refreshKey={refreshKey} />;
      case 'challenges':
        return <ClubChallengesTab {...common} refreshKey={refreshKey} />;
      case 'awards':
        return <ClubAwardsTab {...common} refreshKey={refreshKey} />;
      case 'about':
        return <ClubAboutTab page={club} mapUrl={mapLink.data} />;
      case 'openings':
        return (
          <ClubOpeningsTab
            loading={openings.loading}
            error={openings.error}
            data={openings.data}
            onRetry={openings.reload}
            following={following}
            onFollow={onToggleFollow}
            saved={savedOverrides}
            onToggleSave={onToggleSave}
          />
        );
    }
  };

  return (
    <Screen
      header={<Header back title={org.name} />}
      padded={false}
      onRefresh={onRefresh}
      refreshing={page.refreshing}
      testID="organization-screen"
    >
      <View style={{ gap: spacing.xl, paddingBottom: spacing.xxxl }}>
        <ClubHeader
          page={club}
          following={following}
          followers={followers}
          followBusy={followBusy}
          onToggleFollow={onToggleFollow}
        />

        <ClubBanners page={club} onChanged={page.refresh} />

        <ScrollTabs<Tab>
          value={tab}
          onChange={openTab}
          options={TABS.map((value) => ({ value, label: labels[value] }))}
          testID="organization-tabs"
        />

        <View style={{ paddingHorizontal: spacing.lg }}>
          {TABS.filter((key) => visited.has(key)).map((key) => (
            <View key={key} style={key === tab ? undefined : { display: 'none' }}>
              {body(key)}
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
