import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowUpDown, Check, Compass, Search, SlidersHorizontal, Sparkles } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  Input,
  ListItem,
  Screen,
  SectionHeader,
  Sheet,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { AthleteCard, COMPACT_CARD_WIDTH } from '@/components/discover/AthleteCard';
import { AthleteExplore } from '@/components/discover/AthleteExplore';
import { FilterSheet, FilterSheetMode, isFilterActive } from '@/components/discover/FilterSheet';
import {
  criteriaFromFilters,
  criteriaFromPreferences,
  hasAnyCriteria,
} from '@/components/discover/MatchBadge';
import { SPORTS, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { discoverAthletes, getMatchPreferences, recommendedAthletes } from '@/lib/api';
import { addToShortlist, removeFromShortlist, shortlistedAthleteIds } from '@/lib/api.discover';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import type { DiscoveredAthlete, DiscoveryFilters } from '@/types/models';

const PAGE_SIZE = 20;
const QUERY_DEBOUNCE_MS = 300;

type SortKey = NonNullable<DiscoveryFilters['sort']>;

const SORTS: { value: SortKey; labelKey: string; hintKey: string }[] = [
  { value: 'match', labelKey: 'discover.sort.match', hintKey: 'discover.sort.matchHint' },
  { value: 'score', labelKey: 'discover.sort.score', hintKey: 'discover.sort.scoreHint' },
  { value: 'recent', labelKey: 'discover.sort.recent', hintKey: 'discover.sort.recentHint' },
  { value: 'name', labelKey: 'discover.sort.name', hintKey: 'discover.sort.nameHint' },
];

// ── Filter button ─────────────────────────────────────────────────────────────
function FilterButton({ active, onPress }: { active: boolean; onPress: () => void }) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii } = theme;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        active ? t('discover.filterResultsActive') : t('discover.filterResults')
      }
      style={({ pressed }) => ({
        width: theme.hit.min,
        height: theme.hit.min,
        borderRadius: radii.pill,
        backgroundColor: active ? colors.primarySoft : colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <SlidersHorizontal size={20} color={active ? colors.primary : colors.text} />
      {active ? (
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 9,
            height: 9,
            borderRadius: radii.pill,
            backgroundColor: colors.primary,
            borderWidth: 1.5,
            borderColor: colors.bg,
          }}
        />
      ) : null}
    </Pressable>
  );
}

// ── Recruiter face ────────────────────────────────────────────────────────────
function RecruiterDiscover() {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();

  const [filters, setFilters] = useState<DiscoveryFilters>({ sort: 'match' });
  const [query, setQuery] = useState('');
  const [sheetMode, setSheetMode] = useState<FilterSheetMode | null>(null);
  const [sortSheet, setSortSheet] = useState(false);

  // Typing stays instant; the RPC only sees the settled term.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = query.trim() || undefined;
      setFilters((f) => (f.query === next ? f : { ...f, query: next }));
    }, QUERY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const [items, setItems] = useState<DiscoveredAthlete[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);
  const runId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (nextPage: number, mode: 'initial' | 'more' | 'refresh') => {
      const id = ++runId.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);

      try {
        const rows = await discoverAthletes(filters, nextPage, PAGE_SIZE);
        // A slower earlier page must never overwrite a newer filter's results.
        if (!mounted.current || id !== runId.current) return;
        setTotal((current) =>
          rows.length > 0 ? Number(rows[0].total_count ?? 0) : nextPage === 0 ? 0 : current,
        );
        setItems((current) => (nextPage === 0 ? rows : [...current, ...rows]));
        setPage(nextPage);
        setError(null);
      } catch (err) {
        if (!mounted.current || id !== runId.current) return;
        setError(errorMessage(err));
      } finally {
        if (mounted.current && id === runId.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [filters],
  );

  useEffect(() => {
    load(0, 'initial');
  }, [load]);

  // ── Shortlist ──
  const shortlist = useAsync(() => shortlistedAthleteIds(), []);
  const [savedOverrides, setSavedOverrides] = useState<Record<string, boolean>>({});
  const savedSet = useMemo(() => new Set(shortlist.data ?? []), [shortlist.data]);
  const isSaved = (athleteId: string) => savedOverrides[athleteId] ?? savedSet.has(athleteId);

  const onToggleSave = useCallback(
    async (athlete: DiscoveredAthlete, next: boolean) => {
      setSavedOverrides((o) => ({ ...o, [athlete.athlete_id]: next }));
      try {
        if (next) {
          await addToShortlist(athlete.athlete_id);
          toast.success(t('discover.savedToShortlist'));
        } else {
          await removeFromShortlist(athlete.athlete_id);
        }
      } catch (err) {
        setSavedOverrides((o) => ({ ...o, [athlete.athlete_id]: !next }));
        toast.error(errorMessage(err));
      }
    },
    [t, toast],
  );

  // ── Saved brief and the carousel it drives ──
  const prefs = useAsync(() => getMatchPreferences(), []);
  const prefCriteria = useMemo(() => criteriaFromPreferences(prefs.data), [prefs.data]);
  const hasBrief = hasAnyCriteria(prefCriteria);
  const recommended = useAsync(() => recommendedAthletes(12), [hasBrief], { enabled: hasBrief });

  const filterCriteria = useMemo(() => criteriaFromFilters(filters), [filters]);
  const explained = hasAnyCriteria(filterCriteria);
  const filtersActive = isFilterActive(filters);
  const sortLabel = t(
    SORTS.find((s) => s.value === (filters.sort ?? 'match'))?.labelKey ?? 'discover.sort.match',
  );

  const clearEverything = () => {
    setQuery('');
    setFilters({ sort: filters.sort ?? 'match' });
  };

  const matchedSection = (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader
        title={t('discover.matchedForYou')}
        action={t('discover.editBrief')}
        onAction={() => setSheetMode('preferences')}
        style={{ marginBottom: 0 }}
      />
      {recommended.loading ? (
        <SkeletonList count={1} variant="row" />
      ) : recommended.error ? (
        <Text variant="caption" tone="muted">
          {recommended.error}
        </Text>
      ) : (recommended.data?.length ?? 0) === 0 ? (
        <Text variant="caption" tone="muted">
          {t('discover.noneFitBrief')}
        </Text>
      ) : (
        <FlatList<DiscoveredAthlete>
          horizontal
          data={recommended.data ?? []}
          keyExtractor={(item) => `rec-${item.athlete_id}`}
          showsHorizontalScrollIndicator={false}
          snapToInterval={COMPACT_CARD_WIDTH + spacing.md}
          decelerationRate="fast"
          style={{ marginHorizontal: -spacing.lg }}
          contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => (
            <AthleteCard
              compact
              athlete={item}
              criteria={prefCriteria}
              saved={isSaved(item.athlete_id)}
              onToggleSave={onToggleSave}
            />
          )}
        />
      )}
    </View>
  );

  const briefInvite = (
    <Card tone="primarySoft" style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Sparkles size={18} color={colors.primary} />
        <Text variant="heading" style={{ flex: 1 }}>
          {t('discover.briefTitle')}
        </Text>
      </View>
      <Text variant="caption" tone="secondary">
        {t('discover.briefBody')}
      </Text>
      <Button
        label={t('discover.briefAction')}
        size="sm"
        onPress={() => setSheetMode('preferences')}
        style={{ marginTop: spacing.xs }}
      />
    </Card>
  );

  const listHeader = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
        style={{ marginHorizontal: -spacing.lg }}
      >
        <Chip
          label={t('sports.allSports')}
          selected={!filters.sport}
          onPress={() => setFilters((f) => ({ ...f, sport: undefined, positions: [] }))}
        />
        {SPORTS.map((sport) => (
          <Chip
            key={sport.key}
            label={sportLabel(t, sport.key)}
            icon={<Text variant="caption">{sport.emoji}</Text>}
            selected={filters.sport === sport.key}
            onPress={() =>
              setFilters((f) =>
                f.sport === sport.key
                  ? { ...f, sport: undefined, positions: [] }
                  : { ...f, sport: sport.key, positions: [] },
              )
            }
          />
        ))}
      </ScrollView>

      {prefs.loading ? <SkeletonList count={1} variant="row" /> : hasBrief ? matchedSection : briefInvite}

      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary" style={{ flex: 1 }}>
            {loading ? t('discover.searching') : t('common.athletes', { count: total })}
          </Text>
          <Pressable
            onPress={() => setSortSheet(true)}
            accessibilityRole="button"
            accessibilityLabel={t('discover.sortedByA11y', { sort: sortLabel })}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              minHeight: theme.hit.min,
              paddingLeft: spacing.sm,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <ArrowUpDown size={15} color={colors.textSecondary} />
            <Text variant="captionStrong" tone="secondary">
              {sortLabel}
            </Text>
          </Pressable>
        </View>

        {/* The fit score only means something once there is a brief to fit. */}
        <Text variant="caption" tone="muted">
          {explained ? t('discover.rankedByFit') : t('discover.rankedByScore')}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      <Header
        title={t('discover.title')}
        large
        right={
          <>
            <IconButton
              icon={<Search size={20} color={colors.text} />}
              label={t('discover.searchPeople')}
              size={theme.hit.min}
              onPress={() => router.push(Routes.search)}
            />
            <FilterButton active={filtersActive} onPress={() => setSheetMode('filter')} />
          </>
        }
      />

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t('discover.queryPlaceholder')}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel={t('discover.queryLabel')}
          icon={<Search size={18} color={colors.textMuted} />}
        />
      </View>

      <FlatList<DiscoveredAthlete>
        data={items}
        keyExtractor={(item) => item.athlete_id}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.giant,
          gap: spacing.md,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              load(0, 'refresh');
              shortlist.refresh();
              prefs.refresh();
              recommended.refresh();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (!loading && !loadingMore && items.length < total) load(page + 1, 'more');
        }}
        renderItem={({ item }) => (
          <AthleteCard
            athlete={item}
            criteria={filterCriteria}
            saved={isSaved(item.athlete_id)}
            onToggleSave={onToggleSave}
          />
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : error && items.length > 0 ? (
            <Text
              variant="caption"
              tone="danger"
              align="center"
              style={{ marginVertical: spacing.lg }}
            >
              {error}
            </Text>
          ) : null
        }
        /* The header carries the filters, so it stays mounted through every
           state — a skeleton must never take the controls away. */
        ListEmptyComponent={
          loading ? (
            <SkeletonList count={4} variant="row" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => load(0, 'initial')} compact />
          ) : (
            <EmptyState
              icon={<Compass size={26} color={colors.textMuted} />}
              title={t('discover.emptyTitle')}
              body={
                filtersActive || filters.query
                  ? t('discover.emptyFilteredBody')
                  : t('discover.emptyOpenBody')
              }
              actionLabel={filtersActive || filters.query ? t('discover.clearFilters') : undefined}
              onAction={filtersActive || filters.query ? clearEverything : undefined}
            />
          )
        }
      />

      <FilterSheet
        visible={sheetMode !== null}
        mode={sheetMode ?? 'filter'}
        filters={filters}
        preferences={prefs.data}
        onClose={() => setSheetMode(null)}
        onApply={setFilters}
        onSavedPreferences={() => {
          prefs.reload();
          recommended.reload();
          toast.success(t('discover.briefSaved'));
        }}
      />

      <Sheet
        visible={sortSheet}
        onClose={() => setSortSheet(false)}
        title={t('discover.sortTitle')}
        scrollable={false}
      >
        {SORTS.map((option) => (
          <ListItem
            key={option.value}
            title={t(option.labelKey)}
            subtitle={t(option.hintKey)}
            showChevron={false}
            onPress={() => {
              setFilters((f) => ({ ...f, sort: option.value }));
              setSortSheet(false);
            }}
            right={
              (filters.sort ?? 'match') === option.value ? (
                <Check size={18} color={colors.primary} />
              ) : undefined
            }
          />
        ))}
      </Sheet>
    </>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const theme = useTheme();
  const t = useT();
  const { profile, loading, isRecruiter } = useAuth();

  if (loading && !profile) {
    return (
      <Screen scroll={false} padded={false} testID="discover-screen">
        <Header title={t('common.tabDiscover')} large />
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SkeletonList count={4} variant="row" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} testID="discover-screen">
      {isRecruiter ? (
        <RecruiterDiscover />
      ) : (
        <>
          <Header
            title={t('common.tabDiscover')}
            subtitle={t('discover.athleteSubtitle')}
            large
          />
          <AthleteExplore viewerId={profile?.id ?? null} />
        </>
      )}
    </Screen>
  );
}
