import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SlidersHorizontal, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, SegmentedControl, SkeletonList, Text } from '@/components/ui';
import { AthleteCard } from '@/components/discover/AthleteCard';
import { CoachRow } from '@/components/discover/CoachRow';
import { FilterSheet, isFilterActive } from '@/components/discover/FilterSheet';
import { criteriaFromFilters } from '@/components/discover/MatchBadge';
import { groupedRowStyle } from '@/components/discover/groupedRow';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { discoverAthletes } from '@/lib/api';
import { listCoaches } from '@/lib/api.discover';
import { errorMessage } from '@/lib/errors';
import type { DiscoveredAthlete, DiscoveryFilters, PersonResult } from '@/types/models';
import { useFollowState } from './useFollowState';

export type PeopleKind = 'athletes' | 'coaches';

const PAGE = 20;

interface Props {
  term: string;
  queryForSearch: string;
  /** Set when the word is a sport: it becomes the sport filter, not a name. */
  sportKey: string | null;
  kind: PeopleKind;
  onKind: (kind: PeopleKind) => void;
  filters: DiscoveryFilters;
  onFilters: (filters: DiscoveryFilters) => void;
  onOpen: () => void;
  endPadding: number;
}

/**
 * Everyone who matches, 20 at a time, best fit for you first. Athletes can be
 * narrowed with the same Filters sheet as Discover; coaches by name.
 */
export function PeopleResults({
  term,
  queryForSearch,
  sportKey,
  kind,
  onKind,
  filters,
  onFilters,
  onOpen,
  endPadding,
}: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const follow = useFollowState();
  const [sheetOpen, setSheetOpen] = useState(false);

  /* A sport word fills the sport filter instead of looking for that name. */
  const effective: DiscoveryFilters = {
    ...filters,
    sport: filters.sport ?? sportKey ?? undefined,
    query: sportKey ? undefined : queryForSearch || undefined,
    sort: 'match',
  };
  const filterKey = JSON.stringify(effective);

  const [rows, setRows] = useState<DiscoveredAthlete[]>([]);
  const [page, setPage] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage: number, reset: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const batch = await discoverAthletes(JSON.parse(filterKey) as DiscoveryFilters, nextPage, PAGE);
        setRows((current) => (reset ? batch : [...current, ...batch]));
        setPage(nextPage);
        setDone(batch.length < PAGE);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [filterKey],
  );

  useEffect(() => {
    if (kind !== 'athletes') return;
    setRows([]);
    setDone(false);
    void load(0, true);
  }, [kind, load]);

  const coaches = useAsync(
    async () => ({ term, rows: await listCoaches(queryForSearch, 40) }),
    [term, queryForSearch],
    { enabled: kind === 'coaches' },
  );

  const active = isFilterActive(filters);

  const bar = (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <SegmentedControl<PeopleKind>
            options={[
              { value: 'athletes', label: t('discover.tabAthletes') },
              { value: 'coaches', label: t('discover.tabCoaches') },
            ]}
            value={kind}
            onChange={onKind}
            testID="search-people-kind"
          />
        </View>
        {kind === 'athletes' ? (
          <Pressable
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('opportunities.filters')}
            testID="search-people-filters"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              height: 40,
              paddingHorizontal: spacing.md,
              borderRadius: radii.button,
              borderWidth: 2,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <SlidersHorizontal size={16} color={active ? colors.primary : colors.textSecondary} />
            <Text variant="captionStrong" color={active ? colors.primary : colors.textSecondary}>
              {t('opportunities.filters')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {kind === 'athletes' && rows.length > 0 ? (
        <Text variant="caption" tone="muted">
          {t('discover.search.athletesBestFirst')}
        </Text>
      ) : null}
      {kind === 'athletes' && active ? (
        <Pressable onPress={() => onFilters({})} hitSlop={8} accessibilityRole="button">
          <Text variant="captionStrong" color={colors.primary}>
            {t('opportunities.athlete.clearFilters')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  const empty = (
    <EmptyState
      icon={<Users size={26} color={colors.textMuted} />}
      title={t('discover.search.emptyTitle', { term })}
      body={t('discover.search.emptyBodyPeople')}
    />
  );

  if (kind === 'athletes') {
    const sheet = (
      <FilterSheet
        visible={sheetOpen}
        mode="filter"
        filters={effective}
        preferences={null}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          onFilters({ ...next, query: undefined, sort: undefined });
          setSheetOpen(false);
        }}
        onSavedPreferences={() => undefined}
      />
    );
    if (rows.length === 0) {
      return (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          {bar}
          {error ? (
            <ErrorState message={error} onRetry={() => void load(0, true)} />
          ) : loading ? (
            <SkeletonList count={4} variant="row" />
          ) : (
            empty
          )}
          {sheet}
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <FlatList<DiscoveredAthlete>
          style={{ flex: 1 }}
          data={rows}
          keyExtractor={(item) => item.athlete_id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: endPadding }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={bar}
          renderItem={({ item }) => (
            <AthleteCard athlete={item} criteria={criteriaFromFilters(effective)} onOpen={onOpen} />
          )}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (!loading && !done) void load(page + 1, false);
          }}
          ListFooterComponent={
            loading ? <ActivityIndicator color={colors.primary} style={{ padding: spacing.lg }} /> : undefined
          }
        />
        {sheet}
      </View>
    );
  }

  const coachRows: PersonResult[] = coaches.data?.term === term ? coaches.data.rows : [];
  return (
    <View style={{ flex: 1 }}>
      {coaches.error ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {bar}
          <ErrorState message={coaches.error} onRetry={coaches.reload} />
        </View>
      ) : coaches.loading || coaches.data?.term !== term ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {bar}
          <SkeletonList count={4} variant="row" />
        </View>
      ) : (
        <FlatList<PersonResult>
          style={{ flex: 1 }}
          data={coachRows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: endPadding }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={bar}
          renderItem={({ item, index }) => (
            <CoachRow
              grouped={groupedRowStyle(index, coachRows.length, colors, radii.xl)}
              person={item}
              following={follow.isPersonFollowed(item.id)}
              pending={follow.pendingId === item.id}
              onToggleFollow={(p, next) => follow.togglePerson(p.id, next, p.followers_count)}
              onOpen={onOpen}
            />
          )}
          ListEmptyComponent={empty}
        />
      )}
    </View>
  );
}
