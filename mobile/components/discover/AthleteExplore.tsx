import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, Check, Search, Trophy, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Chip,
  EmptyState,
  ErrorState,
  Input,
  ListItem,
  Sheet,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { PRIORITY_COUNTRIES, SPORTS, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { searchOrganizations, toggleFollow } from '@/lib/api';
import {
  followedOrganizationIds,
  followedUserIds,
  leaderboard,
  listCoaches,
  toggleOrganizationFollow,
} from '@/lib/api.discover';
import type { LeaderboardEntry } from '@/lib/api.discover';
import { errorMessage } from '@/lib/errors';
import type { Organization, PersonResult } from '@/types/models';
import { ExploreGrid } from '@/components/explore/ExploreGrid';
import { ScrollTabs } from '@/components/explore/ScrollTabs';
import { SponsorsTab } from '@/components/sponsorship/SponsorsTab';
import { Routes } from '@/lib/routes';
import { ClubCard } from './ClubCard';
import { CoachRow } from './CoachRow';
import { LeaderboardRow } from './LeaderboardRow';

export type AthleteDiscoverTab = 'explore' | 'clubs' | 'coaches' | 'sponsors' | 'leaderboard';
type Tab = AthleteDiscoverTab;

const SEARCH_DEBOUNCE_MS = 300;
const BOARD_SIZE = 50;

interface Page<T> {
  term: string;
  rows: T[];
}

const TABS: { value: Tab; labelKey: string }[] = [
  { value: 'explore', labelKey: 'explore.viewExplore' },
  { value: 'clubs', labelKey: 'discover.tabClubs' },
  { value: 'coaches', labelKey: 'discover.tabCoaches' },
  { value: 'sponsors', labelKey: 'sponsorship.tabSponsors' },
  { value: 'leaderboard', labelKey: 'discover.tabLeaderboard' },
];

interface Props {
  /** The signed-in athlete, so their own leaderboard row can be highlighted. */
  viewerId: string | null;
  /** The tab to open on. Explore unless a link asked for the people side. */
  initialTab?: AthleteDiscoverTab;
}

/**
 * The athlete's side of Discover: clips to watch (Explore, the tab it opens
 * on), who to follow, and where they stand.
 *
 * The leaderboard is read by teenagers, so it only ever names positions people
 * already hold. It never tells anyone they are behind.
 */
export function AthleteExplore({ viewerId, initialTab = 'explore' }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const toast = useToast();

  const [tab, setTab] = useState<Tab>(initialTab);

  /* A link that names a side wins over whatever was open before it. */
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sport, setSport] = useState<string | undefined>(undefined);
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [countrySheet, setCountrySheet] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  /* Rows carry the term that produced them, so the previous search's results
     never sit on screen unlabelled while the next request is in flight. */
  const clubs = useAsync<Page<Organization>>(
    async () => ({ term: debounced, rows: await searchOrganizations(debounced, 30) }),
    [debounced],
    { enabled: tab === 'clubs' },
  );
  const coaches = useAsync<Page<PersonResult>>(
    async () => ({ term: debounced, rows: await listCoaches(debounced, 30) }),
    [debounced],
    { enabled: tab === 'coaches' },
  );
  const boardScope = `${sport ?? ''}|${country ?? ''}`;
  const board = useAsync<Page<LeaderboardEntry>>(
    async () => ({ term: boardScope, rows: await leaderboard(sport, country, BOARD_SIZE) }),
    [sport, country],
    { enabled: tab === 'leaderboard' },
  );

  const orgFollows = useAsync(() => followedOrganizationIds(), []);
  const peopleFollows = useAsync(() => followedUserIds(), []);

  // Optimistic overrides layered over the fetched follow sets.
  const [orgOverrides, setOrgOverrides] = useState<Record<string, boolean>>({});
  const [personOverrides, setPersonOverrides] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const orgSet = useMemo(() => new Set(orgFollows.data ?? []), [orgFollows.data]);
  const personSet = useMemo(() => new Set(peopleFollows.data ?? []), [peopleFollows.data]);

  const isOrgFollowed = (id: string) => orgOverrides[id] ?? orgSet.has(id);
  const isPersonFollowed = (id: string) => personOverrides[id] ?? personSet.has(id);

  const onToggleOrg = useCallback(
    async (organization: Organization, next: boolean) => {
      setPendingId(organization.id);
      setOrgOverrides((o) => ({ ...o, [organization.id]: next }));
      try {
        const result = await toggleOrganizationFollow(organization.id, !next);
        setOrgOverrides((o) => ({ ...o, [organization.id]: result }));
      } catch (err) {
        setOrgOverrides((o) => ({ ...o, [organization.id]: !next }));
        toast.error(errorMessage(err));
      } finally {
        setPendingId(null);
      }
    },
    [toast],
  );

  const onTogglePerson = useCallback(
    async (person: PersonResult, next: boolean) => {
      setPendingId(person.id);
      setPersonOverrides((o) => ({ ...o, [person.id]: next }));
      try {
        const result = await toggleFollow(person.id);
        setPersonOverrides((o) => ({ ...o, [person.id]: result.following }));
      } catch (err) {
        setPersonOverrides((o) => ({ ...o, [person.id]: !next }));
        toast.error(errorMessage(err));
      } finally {
        setPendingId(null);
      }
    },
    [toast],
  );

  const listStyle = {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.giant,
    gap: spacing.sm,
  };

  const busy = (count: number) => (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <SkeletonList count={count} variant="row" />
    </View>
  );

  const searchField = (
    <Input
      value={query}
      onChangeText={setQuery}
      placeholder={
        tab === 'clubs'
          ? t('discover.explore.searchClubsPlaceholder')
          : tab === 'sponsors'
            ? t('sponsorship.searchPlaceholder')
            : t('discover.explore.searchCoachesPlaceholder')
      }
      autoCorrect={false}
      autoCapitalize="none"
      returnKeyType="search"
      clearButtonMode="while-editing"
      accessibilityLabel={
        tab === 'clubs'
          ? t('discover.explore.searchClubsA11y')
          : tab === 'sponsors'
            ? t('sponsorship.searchPlaceholder')
            : t('discover.explore.searchCoachesA11y')
      }
      icon={<Search size={18} color={colors.textMuted} />}
    />
  );

  const boardFilters = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
    >
      <Chip
        label={country ?? t('discover.explore.anywhere')}
        selected={!!country}
        onPress={() => setCountrySheet(true)}
      />
      <Chip
        label={t('sports.allSports')}
        selected={!sport}
        onPress={() => setSport(undefined)}
      />
      {SPORTS.map((s) => (
        <Chip
          key={s.key}
          label={sportLabel(t, s.key)}
          icon={<Text variant="caption">{s.emoji}</Text>}
          selected={sport === s.key}
          onPress={() => setSport(sport === s.key ? undefined : s.key)}
        />
      ))}
    </ScrollView>
  );

  function renderClubs() {
    if (clubs.error) return <ErrorState message={clubs.error} onRetry={clubs.reload} />;
    if (clubs.loading || clubs.data?.term !== debounced) return busy(4);

    return (
      <FlatList<Organization>
        style={{ flex: 1 }}
        data={clubs.data?.rows ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={listStyle}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={clubs.refreshing}
            onRefresh={clubs.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <ClubCard
            organization={item}
            following={isOrgFollowed(item.id)}
            pending={pendingId === item.id}
            onToggleFollow={onToggleOrg}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Building2 size={26} color={colors.textMuted} />}
            title={
              debounced
                ? t('discover.explore.noClubsFound')
                : t('discover.explore.noClubsYet')
            }
            body={
              debounced
                ? t('discover.explore.noClubsFoundBody')
                : t('discover.explore.noClubsYetBody')
            }
          />
        }
      />
    );
  }

  function renderCoaches() {
    if (coaches.error) return <ErrorState message={coaches.error} onRetry={coaches.reload} />;
    if (coaches.loading || coaches.data?.term !== debounced) return busy(4);

    return (
      <FlatList<PersonResult>
        style={{ flex: 1 }}
        data={coaches.data?.rows ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={listStyle}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={coaches.refreshing}
            onRefresh={coaches.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <CoachRow
            person={item}
            following={isPersonFollowed(item.id)}
            pending={pendingId === item.id}
            onToggleFollow={onTogglePerson}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={26} color={colors.textMuted} />}
            title={
              debounced
                ? t('discover.explore.noCoachesFound')
                : t('discover.explore.noCoachesYet')
            }
            body={
              debounced
                ? t('discover.explore.noCoachesFoundBody')
                : t('discover.explore.noCoachesYetBody')
            }
          />
        }
      />
    );
  }

  function renderBoard() {
    if (board.error) return <ErrorState message={board.error} onRetry={board.reload} />;
    if (board.loading || board.data?.term !== boardScope) return busy(5);

    const rows = board.data.rows;
    const youAreOnIt = !!viewerId && rows.some((row) => row.user_id === viewerId);
    /* The scope reads back to the reader, so it is built from translated parts
       rather than glued together from the filter values. */
    const scopeSport = sport ? sportLabel(t, sport) : t('discover.board.everySport');
    const scope = country
      ? t('discover.board.scopeInCountry', { sport: scopeSport, country })
      : scopeSport;

    return (
      <FlatList<LeaderboardEntry>
        style={{ flex: 1 }}
        data={rows}
        keyExtractor={(item) => item.athlete_id}
        contentContainerStyle={listStyle}
        refreshControl={
          <RefreshControl
            refreshing={board.refreshing}
            onRefresh={board.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          rows.length > 0 ? (
            <Text variant="caption" tone="muted" style={{ marginBottom: spacing.xs }}>
              {t('discover.board.caption', { scope })}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <LeaderboardRow entry={item} isYou={item.user_id === viewerId} />
        )}
        ListFooterComponent={
          rows.length > 0 && viewerId && !youAreOnIt ? (
            <Text
              variant="caption"
              tone="muted"
              align="center"
              style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}
            >
              {t('discover.board.keepBuilding')}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Trophy size={26} color={colors.textMuted} />}
            title={t('discover.board.emptyTitle')}
            body={t('discover.board.emptyBody')}
          />
        }
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingBottom: spacing.md }}>
        <ScrollTabs<Tab>
          options={TABS.map((entry) => ({ value: entry.value, label: t(entry.labelKey) }))}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setQuery('');
            setDebounced('');
          }}
          testID="explore-tabs"
        />
      </View>

      <View style={{ paddingLeft: spacing.lg, paddingBottom: spacing.md }}>
        {tab === 'leaderboard' ? (
          boardFilters
        ) : tab === 'explore' ? (
          /* Clips are not searched by text. The bar opens the people-and-clubs
             search, where a name typed here would have been looked for anyway. */
          <Pressable
            onPress={() => router.push(Routes.search)}
            accessibilityRole="search"
            accessibilityLabel={t('discover.searchPeople')}
            testID="explore-search"
            style={({ pressed }) => ({
              marginRight: spacing.lg,
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingHorizontal: spacing.lg,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Search size={18} color={colors.textMuted} />
            <Text variant="body" tone="muted" numberOfLines={1}>
              {t('discover.searchPeople')}
            </Text>
          </Pressable>
        ) : (
          <View style={{ paddingRight: spacing.lg }}>{searchField}</View>
        )}
      </View>

      {tab === 'explore' ? (
        <ExploreGrid onPostFirst={() => router.push(Routes.compose)} />
      ) : tab === 'sponsors' ? (
        <SponsorsTab query={debounced} />
      ) : tab === 'clubs' ? (
        renderClubs()
      ) : tab === 'coaches' ? (
        renderCoaches()
      ) : (
        renderBoard()
      )}

      <Sheet
        visible={countrySheet}
        onClose={() => setCountrySheet(false)}
        title={t('discover.explore.countryTitle')}
        subtitle={t('discover.explore.countrySubtitle')}
      >
        <ListItem
          title={t('discover.explore.anywhere')}
          showChevron={false}
          onPress={() => {
            setCountry(undefined);
            setCountrySheet(false);
          }}
          right={!country ? <Check size={18} color={colors.primary} /> : undefined}
        />
        {PRIORITY_COUNTRIES.map((name) => (
          <ListItem
            key={name}
            title={name}
            showChevron={false}
            onPress={() => {
              setCountry(name);
              setCountrySheet(false);
            }}
            right={country === name ? <Check size={18} color={colors.primary} /> : undefined}
          />
        ))}
      </Sheet>
    </View>
  );
}
