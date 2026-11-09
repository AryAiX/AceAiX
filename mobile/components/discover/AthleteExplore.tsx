import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, Check, ChevronDown, MapPin, Search, Trophy, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import {
  Avatar,
  Badge,
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
import { SPORTS, countryLabel, countryOptions, positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { useTabReselect } from '@/hooks/useTabReselect';
import { myLinkedMinors, searchOrganizations, searchPeople } from '@/lib/api';
import { applyToggleFollow, knownFollowCount } from '@/lib/followCounts';
import {
  followedOrganizationIds,
  followedUserIds,
  leaderboard,
  listCoaches,
  toggleOrganizationFollow,
} from '@/lib/api.discover';
import type { LeaderboardEntry } from '@/lib/api.discover';
import { errorMessage } from '@/lib/errors';
import { displayName, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import type { Organization, PersonResult } from '@/types/models';
import { ExploreGrid } from '@/components/explore/ExploreGrid';
import { ScrollTabs } from '@/components/explore/ScrollTabs';
import { SponsorsTab } from '@/components/sponsorship/SponsorsTab';
import { BookableCoaches } from '@/components/coaching/BookableCoaches';
import { ClubCard } from './ClubCard';
import { CoachRow } from './CoachRow';
import { LeaderboardPodium } from './LeaderboardPodium';
import { LeaderboardRow } from './LeaderboardRow';
import { groupedRowStyle } from './groupedRow';
import { tierLabel } from './MatchBadge';

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
  /** Main's link into a tab; tabRequestKey changes on every new request. */
  requestedTab?: string;
  tabRequestKey?: string;
  /** Show just this one side, with no tab row: a page opened from Discover. */
  only?: AthleteDiscoverTab;
}

/** Same case-insensitive equality the talent_leaderboard RPC uses via `ilike`. */
function matchesChip(value: string | null | undefined, selected: string | undefined): boolean {
  if (!selected) return true;
  return (value ?? '').toLowerCase() === selected.toLowerCase();
}

/**
 * Leaderboard-shaped row for name-search hits. Rank is omitted on purpose —
 * these are not a ranking. Keep this local; LeaderboardRow stays for the board.
 */
function AthleteSearchRow({ person, isYou }: { person: PersonResult; isYou: boolean }) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;
  const router = useRouter();

  const name = displayName(person.full_name);
  const tier = tierForScore(person.talent_score);
  const tierColor = TierColors[tier];
  const tierName = tierLabel(t, tier);
  const meta = metaLine(
    sportLabel(t, person.sport),
    positionLabel(t, person.position),
    person.country,
  );

  return (
    <Pressable
      onPress={() => router.push(Routes.profile(person.id))}
      accessibilityRole="button"
      accessibilityLabel={metaLine(
        isYou ? t('discover.board.youA11y', { name }) : name,
        meta,
        t('discover.board.scoreA11y', { score: person.talent_score, tier: tierName }),
      )}
      accessibilityHint={t('discover.card.openProfile')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 64,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderWidth: isYou ? 1.5 : 1,
        borderColor: isYou ? colors.primaryBorder : colors.border,
        backgroundColor: isYou ? colors.primarySoft : colors.surface,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Avatar uri={person.avatar_url} name={name} size="sm" score={person.talent_score} />

      <View style={{ flex: 1, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </Text>
          {isYou ? <Badge label={t('discover.board.you')} tone="primary" /> : null}
        </View>
        {meta ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="stat" color={tierColor} style={{ fontSize: 20 }}>
          {Math.round(person.talent_score)}
        </Text>
        <Text variant="overline" color={tierColor} style={{ fontSize: 9 }}>
          {tierName}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * The athlete's side of Discover: clips to watch (Explore, the tab it opens
 * on), who to follow, and where they stand.
 *
 * The leaderboard is read by teenagers, so it only ever names positions people
 * already hold. It never tells anyone they are behind.
 */
export function AthleteExplore({
  viewerId,
  initialTab = 'explore',
  requestedTab,
  tabRequestKey,
  only,
}: Props) {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const toast = useToast();
  const { profile, isGuardian } = useAuth();
  const canSearchBoard = profile?.is_minor === false;

  const [tab, setTab] = useState<Tab>(only ?? initialTab);

  /* A link that names a side wins over whatever was open before it. */
  useEffect(() => {
    setTab(only ?? initialTab);
  }, [initialTab, only]);

  useEffect(() => {
    if (!tabRequestKey || only) return;
    if (
      requestedTab === 'clubs' ||
      requestedTab === 'coaches' ||
      requestedTab === 'leaderboard'
    ) {
      setTab(requestedTab);
      setQuery('');
      setDebounced('');
    }
  }, [tabRequestKey, requestedTab, only]);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sport, setSport] = useState<string | undefined>(undefined);
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [countrySheet, setCountrySheet] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const countryChoices = useMemo(
    () => countryOptions(countryQuery, (name) => countryLabel(t, name)),
    [countryQuery, t],
  );
  /* Coaches: everyone, or only those who can be booked. */
  const [bookable, setBookable] = useState(false);
  /* Clubs: all of them, the ones I follow, or academies only. On the phone. */
  const [clubFilter, setClubFilter] = useState<'all' | 'following' | 'academies'>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  /* Rows carry the term that produced them, so the previous search's results
     never sit on screen unlabelled while the next request is in flight. */
  const clubs = useAsync<Page<Organization>>(
    async () => ({ term: debounced, rows: await searchOrganizations(debounced, 30) }),
    [debounced],
    { enabled: tab === 'clubs', refetchOnFocus: true },
  );
  const coaches = useAsync<Page<PersonResult>>(
    async () => ({ term: debounced, rows: await listCoaches(debounced, 30) }),
    [debounced],
    { enabled: tab === 'coaches', refetchOnFocus: true },
  );
  const boardScope = `${sport ?? ''}|${country ?? ''}`;
  const searchingBoard = tab === 'leaderboard' && canSearchBoard && !!debounced;
  const board = useAsync<Page<LeaderboardEntry>>(
    async () => ({ term: boardScope, rows: await leaderboard(sport, country, BOARD_SIZE) }),
    [sport, country],
    { enabled: tab === 'leaderboard' && !searchingBoard },
  );
  const athletes = useAsync<Page<PersonResult>>(
    async () => ({ term: debounced, rows: await searchPeople(debounced, 'athlete', 30) }),
    [debounced],
    { enabled: searchingBoard },
  );
  /* Client-side only: search_people is capped at 30 and has no sport/country
     args, so chip filters may drop matches that sit past that cap. */
  const athleteHits = useMemo(
    () =>
      (athletes.data?.rows ?? []).filter(
        (row) => matchesChip(row.sport, sport) && matchesChip(row.country, country),
      ),
    [athletes.data?.rows, sport, country],
  );

  const linkedMinors = useAsync(() => myLinkedMinors(), [], {
    enabled: isGuardian && tab === 'leaderboard',
    refetchOnFocus: true,
  });
  const childIds = useMemo(
    () =>
      new Set(
        isGuardian
          ? (linkedMinors.data ?? [])
              .filter((minor) => minor.status === 'granted')
              .map((minor) => minor.minor_user_id)
          : [],
      ),
    [isGuardian, linkedMinors.data],
  );

  const orgFollows = useAsync(() => followedOrganizationIds(), [], { refetchOnFocus: true });
  const peopleFollows = useAsync(() => followedUserIds(), [], { refetchOnFocus: true });

  // Optimistic overrides layered over the fetched follow sets.
  const [orgOverrides, setOrgOverrides] = useState<Record<string, boolean>>({});
  const [personOverrides, setPersonOverrides] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const orgSet = useMemo(() => new Set(orgFollows.data ?? []), [orgFollows.data]);
  const personSet = useMemo(() => new Set(peopleFollows.data ?? []), [peopleFollows.data]);

  // A fresh follow set is the truth again; stale overrides would contradict a
  // follow or unfollow made on another screen.
  useEffect(() => setOrgOverrides({}), [orgFollows.data]);
  useEffect(() => setPersonOverrides({}), [peopleFollows.data]);

  const isOrgFollowed = (id: string) => orgOverrides[id] ?? orgSet.has(id);
  const isPersonFollowed = (id: string) => personOverrides[id] ?? personSet.has(id);

  /** The fetched count, nudged by a follow toggled here since that fetch. */
  const shiftedCount = (count: number, fetched: boolean, now: boolean) =>
    Math.max(0, count + (now === fetched ? 0 : now ? 1 : -1));

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
        const result = await applyToggleFollow({
          targetId: person.id,
          myId: viewerId,
          wasFollowing: !next,
          targetFollowers: knownFollowCount(person.id, 'followers') ?? person.followers_count,
          myFollowing: knownFollowCount(viewerId ?? '', 'following') ?? profile?.following_count ?? 0,
        });
        setPersonOverrides((o) => ({ ...o, [person.id]: result.following }));
      } catch (err) {
        setPersonOverrides((o) => ({ ...o, [person.id]: !next }));
        toast.error(errorMessage(err));
      } finally {
        setPendingId(null);
      }
    },
    [profile?.following_count, toast, viewerId],
  );

  /* Tap Discover while on Discover. Clubs, coaches and the leaderboard are
     lists drawn here, one at a time, so they share one ref. Explore, Sponsors
     and "Taking students" draw their own lists and answer the tap themselves.
     Each reload mirrors that list's pull-to-refresh, minus the spinner. */
  const attachList = useTabReselect(() => {
    if (tab === 'clubs') clubs.reload();
    else if (tab === 'coaches' && !bookable) coaches.reload();
    else if (tab === 'leaderboard') {
      if (searchingBoard) athletes.reload();
      else board.reload();
    }
  });

  const listStyle = {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.giant,
  };
  /* Each list is drawn as one white card, a row at a time. */
  const rowStyle = (index: number, count: number, background?: string) =>
    groupedRowStyle(index, count, colors, theme.radii.xl, background);

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
            : tab === 'coaches'
              ? t('discover.explore.searchCoachesPlaceholder')
              : t('discover.queryLabel')
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
            : tab === 'coaches'
              ? t('discover.explore.searchCoachesA11y')
              : t('discover.queryLabel')
      }
      icon={<Search size={18} color={colors.textMuted} />}
    />
  );

  /* Where: its own chip with a pin and a ▾, because it opens a list rather
     than switching something on. A thin line keeps it apart from the sports. */
  const locationChip = (
    <Chip
      label={country ? countryLabel(t, country) : t('discover.explore.anywhere')}
      selected={!!country}
      onPress={() => setCountrySheet(true)}
      icon={<MapPin size={14} color={country ? colors.primary : colors.textSecondary} />}
      trailing={<ChevronDown size={14} color={country ? colors.primary : colors.textSecondary} />}
      testID="discover-location-chip"
    />
  );
  const chipDivider = (
    <View style={{ width: 1, height: 22, alignSelf: 'center', backgroundColor: colors.border }} />
  );

  const boardFilters = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
    >
      {locationChip}
      {chipDivider}
      <Chip
        tone="accent"
        label={t('sports.allSports')}
        selected={!sport}
        onPress={() => setSport(undefined)}
      />
      {SPORTS.map((s) => (
        <Chip
          tone="accent"
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
    const clubRows = (clubs.data?.rows ?? []).filter(
      (club) =>
        matchesChip(club.country, country) &&
        (clubFilter === 'following'
          ? isOrgFollowed(club.id)
          : clubFilter === 'academies'
            ? club.type === 'academy'
            : true),
    );

    return (
      <FlatList<Organization>
        ref={attachList}
        style={{ flex: 1 }}
        data={clubRows}
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
        renderItem={({ item, index }) => (
          <ClubCard
            grouped={rowStyle(index, clubRows.length)}
            organization={{
              ...item,
              followers_count: shiftedCount(
                item.followers_count,
                orgSet.has(item.id),
                isOrgFollowed(item.id),
              ),
            }}
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
    if (bookable) return <BookableCoaches query={debounced} country={country} />;
    if (coaches.error) return <ErrorState message={coaches.error} onRetry={coaches.reload} />;
    if (coaches.loading || coaches.data?.term !== debounced) return busy(4);
    const coachRows = (coaches.data?.rows ?? []).filter((coach) => matchesChip(coach.country, country));

    return (
      <FlatList<PersonResult>
        ref={attachList}
        style={{ flex: 1 }}
        data={coachRows}
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
        renderItem={({ item, index }) => (
          <CoachRow
            grouped={rowStyle(index, coachRows.length)}
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

  function renderBoardSearch() {
    if (athletes.error) return <ErrorState message={athletes.error} onRetry={athletes.reload} />;
    if (athletes.loading || athletes.data?.term !== debounced) return busy(4);

    return (
      <FlatList<PersonResult>
        ref={attachList}
        style={{ flex: 1 }}
        data={athleteHits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={listStyle}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={athletes.refreshing}
            onRefresh={athletes.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ItemSeparatorComponent={RowGap}
        renderItem={({ item }) => (
          <AthleteSearchRow person={item} isYou={item.id === viewerId} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={26} color={colors.textMuted} />}
            title={t('discover.search.emptyTitle', { term: debounced })}
            body={t('discover.search.emptyBody')}
          />
        }
      />
    );
  }

  function renderBoard() {
    if (searchingBoard) return renderBoardSearch();

    if (board.error) return <ErrorState message={board.error} onRetry={board.reload} />;
    if (board.loading || board.data?.term !== boardScope) return busy(5);

    const allRows = board.data.rows;
    /* The first three stand on the podium; the list carries on from fourth. */
    const podium = allRows.length >= 3 ? allRows.slice(0, 3) : [];
    const rows = podium.length ? allRows.slice(3) : allRows;
    const youAreOnIt = !!viewerId && allRows.some((row) => row.user_id === viewerId);
    /* The scope reads back to the reader, so it is built from translated parts
       rather than glued together from the filter values. */
    const scopeSport = sport ? sportLabel(t, sport) : t('discover.board.everySport');
    const scope = country
      ? t('discover.board.scopeInCountry', { sport: scopeSport, country })
      : scopeSport;

    return (
      <FlatList<LeaderboardEntry>
        ref={attachList}
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
          allRows.length > 0 ? (
            <View>
              <Text variant="caption" tone="muted" style={{ marginBottom: spacing.sm }}>
                {t('discover.board.caption', { scope })}
              </Text>
              <LeaderboardPodium top={podium} viewerId={viewerId} />
            </View>
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <LeaderboardRow
            grouped={rowStyle(index, rows.length)}
            entry={item}
            isYou={item.user_id === viewerId}
            isChild={childIds.has(item.user_id)}
          />
        )}
        ListFooterComponent={
          allRows.length > 0 && viewerId && !youAreOnIt && !isGuardian ? (
            <Text
              variant="caption"
              tone="muted"
              align="center"
              style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}
            >
              {t('discover.board.keepBuilding')}
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          allRows.length > 0 ? undefined : (
            <EmptyState
              icon={<Trophy size={26} color={colors.textMuted} />}
              title={t('discover.board.emptyTitle')}
              body={t('discover.board.emptyBody')}
            />
          )
        }
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {only ? null : (
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
      )}

      <View style={{ paddingLeft: spacing.lg, paddingBottom: spacing.md, gap: spacing.md }}>
        {tab === 'explore' ? (
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
          <>
            {tab !== 'leaderboard' || canSearchBoard ? (
              <View style={{ paddingRight: spacing.lg, gap: spacing.sm }}>
                {searchField}
                {tab === 'coaches' ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: spacing.sm }}
                  >
                    {locationChip}
                    {chipDivider}
                    <Chip
                      label={t('discover.filterAll')}
                      selected={!bookable}
                      onPress={() => setBookable(false)}
                    />
                    <Chip
                      label={t('coaching.takingStudentsFilter')}
                      selected={bookable}
                      onPress={() => setBookable((b) => !b)}
                      testID="coaches-bookable-filter"
                    />
                  </ScrollView>
                ) : tab === 'clubs' ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: spacing.sm }}
                  >
                    {locationChip}
                    {chipDivider}
                    <Chip
                      label={t('discover.filterAll')}
                      selected={clubFilter === 'all'}
                      onPress={() => setClubFilter('all')}
                    />
                    <Chip
                      label={t('common.following')}
                      selected={clubFilter === 'following'}
                      onPress={() => setClubFilter((f) => (f === 'following' ? 'all' : 'following'))}
                      testID="clubs-following-filter"
                    />
                    <Chip
                      label={t('discover.filterAcademies')}
                      selected={clubFilter === 'academies'}
                      onPress={() => setClubFilter((f) => (f === 'academies' ? 'all' : 'academies'))}
                      testID="clubs-academies-filter"
                    />
                  </ScrollView>
                ) : null}
              </View>
            ) : null}
            {tab === 'leaderboard' ? boardFilters : null}
          </>
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
        subtitle={tab === 'leaderboard' ? t('discover.explore.countrySubtitle') : undefined}
      >
        <Input
          placeholder={t('profile.searchCountries')}
          value={countryQuery}
          onChangeText={setCountryQuery}
          icon={<Search size={18} color={colors.textMuted} />}
          autoCorrect={false}
          accessibilityLabel={t('profile.searchCountries')}
          containerStyle={{ marginBottom: spacing.md }}
        />
        <ListItem
          title={t('discover.explore.anywhere')}
          showChevron={false}
          onPress={() => {
            setCountry(undefined);
            setCountryQuery('');
            setCountrySheet(false);
          }}
          right={!country ? <Check size={18} color={colors.primary} /> : undefined}
        />
        {countryChoices.map((name) => (
          <ListItem
            key={name}
            title={countryLabel(t, name)}
            showChevron={false}
            onPress={() => {
              setCountry(name);
              setCountryQuery('');
              setCountrySheet(false);
            }}
            right={country === name ? <Check size={18} color={colors.primary} /> : undefined}
          />
        ))}
        {countryChoices.length === 0 ? (
          <Text variant="caption" tone="muted" align="center" style={{ paddingVertical: spacing.xl }}>
            {t('onboarding.countryNoMatch')}
          </Text>
        ) : null}
      </Sheet>
    </View>
  );
}

function RowGap() {
  return <View style={{ height: 8 }} />;
}
