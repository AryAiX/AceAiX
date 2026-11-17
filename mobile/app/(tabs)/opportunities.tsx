import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bookmark,
  Flame,
  Inbox,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Target,
  Users,
  X,
} from 'lucide-react-native';
import { useTabReselect } from '@/hooks/useTabReselect';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  Dropdown,
  EmptyState,
  ErrorState,
  Header,
  Input,
  Screen,
  TextTabs,
  Sheet,
  SkeletonList,
  Tappable,
  Text,
  useToast,
  ChevronForward,
} from '@/components/ui';
import { ApplicationStatusBadge } from '@/components/opportunities/ApplicationStatusBadge';
import { ApplicantRow } from '@/components/opportunities/ApplicantRow';
import { DeadlineChip } from '@/components/opportunities/DeadlineChip';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';
import { isChallengeLive } from '@/components/challenges/ChallengeCard';
import {
  OPPORTUNITY_TYPES,
  SPORTS,
  opportunityTypeLabel,
  sportLabel,
} from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { openChallenges, toggleSaveOpportunity } from '@/lib/api';
import {
  allApplicants,
  myApplicationsDetailed,
  myPostings,
  openOpportunities,
  savedOpportunities,
  searchOpportunities,
} from '@/lib/api.opportunities';
import type { PostedOpportunity, RankedApplicant } from '@/lib/api.opportunities';
import { errorMessage } from '@/lib/errors';
import { fullDate, metaLine } from '@/lib/format';
import { formatLocation } from '@/lib/location';
import { Routes } from '@/lib/routes';
import { offerPlaybooks, removeFromAllPlaybooks } from '@/lib/playbooks';
import { useAuth } from '@/providers/AuthProvider';
import type { Opportunity } from '@/types/models';
import { useEndPadding } from '@/components/navigation/dockInset';
import { LogoColors } from '@/theme/tokens';

type AthleteTab = 'open' | 'saved' | 'applied';
type RecruiterTab = 'postings' | 'applicants';

/** Wait after the last letter before asking the server. */
const SEARCH_PAUSE_MS = 300;

interface TrialSearchAnswer {
  token: string;
  rows: Opportunity[];
  error: string | null;
}

/** Empty words and empty filters are not a search. */
function trialSearchToken(query: string, sports: readonly string[], types: readonly string[]): string {
  const words = query.trim();
  if (!words && sports.length === 0 && types.length === 0) return '';
  return JSON.stringify([words, sports, types]);
}

/** Older rows stored a contract as "offer". */
function trialTypeMatches(actual: string | null | undefined, wanted: string): boolean {
  const have = (actual ?? '').toLowerCase();
  const need = wanted.toLowerCase();
  return have === need || (need === 'contract' && have === 'offer');
}

// ── Athlete ───────────────────────────────────────────────────────────────────
/**
 * Open · Saved · Applied as equal text tabs. The open one carries the flame
 * underline across its whole share, over the hairline.
 */
function TrialTabs({ value, onChange }: { value: AthleteTab; onChange: (tab: AthleteTab) => void }) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const options: { value: AthleteTab; label: string }[] = [
    { value: 'open', label: t('opportunities.tabs.open') },
    { value: 'saved', label: t('opportunities.tabs.saved') },
    { value: 'applied', label: t('opportunities.tabs.applied') },
  ];

  return (
    <View
      accessibilityRole="tablist"
      testID="opportunities-tabs"
      style={{
        flexDirection: 'row',
        alignSelf: 'stretch',
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            testID={`opportunities-tabs-${opt.value}`}
            hitSlop={{ top: 8, bottom: 0, left: 8, right: 8 }}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.xs,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              variant="bodyStrong"
              color={active ? colors.text : colors.textMuted}
              align="center"
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{ width: '100%' }}
            >
              {opt.label}
            </Text>
            <View
              style={{
                position: 'absolute',
                start: 0,
                end: 0,
                bottom: -1,
                height: 2,
                borderRadius: 1,
                /* Trials are on the fire side of the logo. */
                backgroundColor: active ? LogoColors.flame : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function AthleteOpportunities() {
  const endPad = useEndPadding();
  const t = useT();
  const { profile: me } = useAuth();
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const router = useRouter();
  const toast = useToast();

  const [tab, setTab] = useState<AthleteTab>('open');
  const [sports, setSports] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [trialSearch, setTrialSearch] = useState<TrialSearchAnswer | null>(null);
  const [searchNonce, setSearchNonce] = useState(0);
  const searchSeq = useRef(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* Search's "See all" lands here with its word already typed, on Open. */
  const linkParams = useLocalSearchParams<{ q?: string | string[]; at?: string | string[] }>();
  const linkedQuery = Array.isArray(linkParams.q) ? linkParams.q[0] : linkParams.q;
  const linkedAt = Array.isArray(linkParams.at) ? linkParams.at[0] : linkParams.at;
  useEffect(() => {
    if (linkedQuery === undefined) return;
    setTab('open');
    setQuery(linkedQuery);
  }, [linkedQuery, linkedAt]);

  /* The word waits a moment so each letter is not its own request.
     Filters apply on the next render, with no pause. */
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), SEARCH_PAUSE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const open = useAsync(() => openOpportunities(30), []);
  const saved = useAsync(() => savedOpportunities(), [], { refetchOnFocus: true });
  const applied = useAsync(() => myApplicationsDetailed(), [], { refetchOnFocus: true });

  /* Pull to refresh and a second tap on Trials run the search again. */
  const redoServerSearch = useCallback(() => {
    if (!query.trim() && sports.length === 0 && types.length === 0) return;
    setTrialSearch(null);
    setDebouncedQuery(query);
    setSearchNonce((n) => n + 1);
  }, [query, sports, types]);

  /* Tap Trials again: back to the top, then reload. An active search runs again too. */
  const listRef = useTabReselect(() => {
    if (tab === 'saved') saved.reload();
    else if (tab === 'applied') applied.reload();
    else {
      open.reload();
      redoServerSearch();
    }
  });

  /* A late answer for an older word is dropped. */
  useEffect(() => {
    const token = trialSearchToken(debouncedQuery, sports, types);
    if (!token) return;
    const seq = ++searchSeq.current;
    let cancelled = false;
    searchOpportunities(debouncedQuery, sports, types)
      .then((rows) => {
        if (cancelled || seq !== searchSeq.current) return;
        setTrialSearch({ token, rows, error: null });
      })
      .catch((err) => {
        if (cancelled || seq !== searchSeq.current) return;
        setTrialSearch({ token, rows: [], error: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, sports, types, searchNonce]);

  /* Optimistic bookmark state, keyed by opportunity id. The lists are fetched
     separately, so one source of truth here keeps them from disagreeing. */
  const [savedOverrides, setSavedOverrides] = useState<Record<string, boolean>>({});
  const isSaved = (o: Opportunity) => savedOverrides[o.id] ?? o.is_saved;

  const refreshSaved = saved.refresh;
  const onToggleSave = useCallback(
    async (opportunity: Opportunity, next: boolean) => {
      setSavedOverrides((current) => ({ ...current, [opportunity.id]: next }));
      try {
        // The API takes the CURRENT state and flips it.
        await toggleSaveOpportunity(opportunity.id, !next);
        /* Saved: offer a playbook too. Unsaved: it leaves them. */
        if (next) {
          offerPlaybooks({
            kind: 'trial',
            id: opportunity.id,
            title: opportunity.title,
            subtitle: opportunity.org_name,
            thumb: opportunity.org_logo,
          });
        } else if (me) {
          void removeFromAllPlaybooks(me.id, 'trial', opportunity.id);
        }
        refreshSaved();
      } catch (err) {
        setSavedOverrides((current) => ({ ...current, [opportunity.id]: !next }));
        toast.error(errorMessage(err));
      }
    },
    [toast, refreshSaved, me],
  );

  /* Open asks the server for every open trial, and also keeps a loaded row
     that matches. Saved stays on the phone. An old trial stored as "offer"
     counts as a contract. */
  const needle = query.trim().toLowerCase();
  const matches = useCallback(
    (o: Opportunity) =>
      (sports.length === 0 || sports.some((s) => o.sport?.toLowerCase() === s.toLowerCase())) &&
      (types.length === 0 || types.some((ty) => trialTypeMatches(o.type, ty))) &&
      (!needle ||
        [o.title, o.org_name, o.poster?.full_name].some((field) =>
          (field ?? '').toLowerCase().includes(needle),
        )),
    [sports, types, needle],
  );

  const filterCount = sports.length + types.length;
  const filtersActive = filterCount > 0 || needle.length > 0;
  const currentToken = trialSearchToken(query, sports, types);
  const searchPending = filtersActive && trialSearch?.token !== currentToken;
  const searchError =
    filtersActive && trialSearch?.token === currentToken ? trialSearch.error : null;

  const openList = useMemo(() => {
    if (searchError) return [];
    const local = (open.data ?? []).filter(matches);
    const remote =
      currentToken !== '' && trialSearch?.token === currentToken ? trialSearch.rows : [];
    const seen = new Set<string>();
    const merged: Opportunity[] = [];
    for (const row of [...local, ...remote]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
    }
    merged.sort((a, b) => b.match_percent - a.match_percent);
    return merged;
  }, [searchError, open.data, matches, currentToken, trialSearch]);

  const savedList = useMemo(() => (saved.data ?? []).filter(matches), [saved.data, matches]);
  const appliedList = applied.data ?? [];
  const clearAll = () => {
    setSports([]);
    setTypes([]);
    setQuery('');
  };

  /** A chosen filter, shown under the search with an × to take it off. */
  const activePill = (label: string, onRemove: () => void, testID: string) => (
    <Pressable
      key={testID}
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={t('opportunities.removeFilter', { label })}
      testID={testID}
      hitSlop={6}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: spacing.md,
        borderRadius: radii.pill,
        backgroundColor: theme.alpha(colors.primary, 0.1),
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text variant="captionStrong" color={colors.primary}>
        {label}
      </Text>
      <X size={13} color={colors.primary} strokeWidth={2.4} />
    </Pressable>
  );

  const searchRow = (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t('opportunities.searchPlaceholder')}
          accessibilityLabel={t('opportunities.searchPlaceholder')}
          icon={<Search size={18} color={colors.textMuted} />}
          returnKeyType="search"
          autoCorrect={false}
          containerStyle={{ flex: 1 }}
          testID="opportunities-search"
        />
        <Pressable
          onPress={() => setFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            filterCount > 0
              ? `${t('opportunities.filters')} (${filterCount})`
              : t('opportunities.filters')
          }
          testID="opportunities-filters"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            minHeight: 52,
            paddingHorizontal: spacing.md,
            borderRadius: radii.md,
            borderWidth: 1.5,
            borderColor: filterCount > 0 ? colors.primary : colors.fieldBorder,
            backgroundColor: colors.field,
            opacity: pressed ? 0.7 : 1,
            ...(filterCount > 0 ? null : theme.raised('control')),
          })}
        >
          <SlidersHorizontal size={17} color={filterCount > 0 ? colors.primary : colors.text} />
          <Text variant="bodyStrong" color={filterCount > 0 ? colors.primary : colors.text}>
            {t('opportunities.filters')}
          </Text>
          {filterCount > 0 ? (
            <View
              style={{
                minWidth: 18,
                height: 18,
                paddingHorizontal: 4,
                borderRadius: 9,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="overline" color={colors.textOnBrand} style={{ fontSize: 10 }} allowFontScaling={false}>
                {filterCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {filterCount > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
          {sports.map((s) =>
            activePill(sportLabel(t, s), () => setSports((cur) => cur.filter((k) => k !== s)), `opportunities-filter-sport-${s}`),
          )}
          {types.map((ty) =>
            activePill(
              opportunityTypeLabel(t, ty),
              () => setTypes((cur) => cur.filter((k) => k !== ty)),
              `opportunities-filter-type-${ty}`,
            ),
          )}
          <Pressable
            onPress={() => {
              setSports([]);
              setTypes([]);
            }}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => ({ paddingHorizontal: spacing.xs, opacity: pressed ? 0.6 : 1 })}
          >
            <Text variant="captionStrong" tone="muted">
              {t('opportunities.athlete.clearFilters')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
      <TrialTabs value={tab} onChange={setTab} />
      {tab === 'applied' ? null : searchRow}
      {/* Challenges sit beside trials because they answer the same question —
          "what can I do to get seen?" — and one of them is open to an athlete
          with no contacts at all. */}
      <ChallengesLink />
    </View>
  );

  const resultCount = tab === 'saved' ? savedList.length : openList.length;

  /* Sport and type in one sheet instead of two rows of chips on the board.
     No "all" chip: nothing picked means everything, and a picked chip is
     tapped again to take it off. */
  const filterSheet = (
    <Sheet
      visible={filtersOpen}
      onClose={() => setFiltersOpen(false)}
      title={t('opportunities.filters')}
      testID="opportunities-filter-sheet"
      footer={
        <Button
          label={t('opportunities.showResults', { count: resultCount })}
          fullWidth
          onPress={() => setFiltersOpen(false)}
          testID="opportunities-filter-show"
        />
      }
    >
      {/* One row per filter: it says what is chosen and opens a list to pick from. */}
      <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
        <Dropdown
          label={t('opportunities.detail.factSport')}
          options={SPORTS.map((s) => ({ key: s.key, label: sportLabel(t, s.key), emoji: s.emoji }))}
          multiple
          value={sports}
          onChange={setSports}
          testID="opportunities-filter-sport-list"
        />
        <Dropdown
          label={t('opportunities.detail.factType')}
          options={OPPORTUNITY_TYPES.map((option) => ({
            key: option.key,
            label: opportunityTypeLabel(t, option.key),
          }))}
          multiple
          value={types}
          onChange={setTypes}
          testID="opportunities-filter-type-list"
        />
      </View>
    </Sheet>
  );

  const listStyle = {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: endPad,
  };

  // ── Open ──
  if (tab === 'open') {
    return (
      <>
        <FlatList<Opportunity>
          ref={listRef}
          data={openList}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={listStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={header}
          refreshControl={
            <RefreshControl
              refreshing={open.refreshing}
              onRefresh={() => {
                open.refresh();
                redoServerSearch();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <OpportunityCard
              opportunity={item}
              saved={isSaved(item)}
              onToggleSave={onToggleSave}
            />
          )}
          ListEmptyComponent={
            open.loading || searchPending ? (
              <SkeletonList count={3} variant="row" />
            ) : open.error ? (
              <ErrorState message={open.error} onRetry={open.reload} compact />
            ) : searchError ? (
              <ErrorState message={searchError} onRetry={redoServerSearch} compact />
            ) : filtersActive ? (
              <EmptyState
                compact
                icon={<Target size={24} color={colors.primary} />}
                title={t('opportunities.athlete.openEmptyFilteredTitle')}
                body={t('opportunities.athlete.openEmptyFilteredBody')}
                actionLabel={t('opportunities.athlete.clearFilters')}
                actionVariant="soft"
                onAction={clearAll}
              />
            ) : (
              <EmptyState
                compact
                icon={<Target size={24} color={colors.primary} />}
                title={t('opportunities.athlete.openEmptyTitle')}
                body={t('opportunities.athlete.openEmptyBody')}
                actionLabel={t('opportunities.athlete.findClubs')}
                actionVariant="soft"
                onAction={() =>
                  router.navigate({
                    pathname: Routes.discover,
                    params: { tab: 'clubs', at: String(Date.now()) },
                  })
                }
              />
            )
          }
        />
        {filterSheet}
      </>
    );
  }

  // ── Saved ──
  if (tab === 'saved') {
    return (
      <>
        <FlatList<Opportunity>
          ref={listRef}
          data={savedList}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={listStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={header}
          refreshControl={
            <RefreshControl
              refreshing={saved.refreshing}
              onRefresh={saved.refresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <OpportunityCard
              opportunity={item}
              saved={isSaved(item)}
              onToggleSave={onToggleSave}
            />
          )}
          ListEmptyComponent={
            saved.loading ? (
              <SkeletonList count={2} variant="row" />
            ) : saved.error ? (
              <ErrorState message={saved.error} onRetry={saved.reload} compact />
            ) : filtersActive && (saved.data ?? []).length > 0 ? (
              <EmptyState
                compact
                icon={<Target size={24} color={colors.primary} />}
                title={t('opportunities.athlete.openEmptyFilteredTitle')}
                body={t('opportunities.athlete.openEmptyFilteredBody')}
                actionLabel={t('opportunities.athlete.clearFilters')}
                actionVariant="soft"
                onAction={clearAll}
              />
            ) : (
              <EmptyState
                compact
                icon={<Bookmark size={24} color={colors.primary} />}
                title={t('opportunities.athlete.savedEmptyTitle')}
                body={t('opportunities.athlete.savedEmptyBody')}
                actionLabel={t('opportunities.athlete.browseOpen')}
                actionVariant="soft"
                onAction={() => setTab('open')}
              />
            )
          }
        />
        {filterSheet}
      </>
    );
  }

  // ── Applied ──
  return (
    <FlatList
      ref={listRef}
      data={appliedList}
      keyExtractor={(item) => item.application_id}
      style={{ flex: 1 }}
      contentContainerStyle={listStyle}
      ListHeaderComponent={header}
      refreshControl={
        <RefreshControl
          refreshing={applied.refreshing}
          onRefresh={applied.refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      renderItem={({ item }) => (
        <OpportunityCard
          opportunity={item.opportunity}
          footer={
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: colors.divider,
                paddingTop: spacing.md,
              }}
            >
              <ApplicationStatusBadge status={item.status} />
              <Text variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
                {t('opportunities.athlete.appliedOn', { date: fullDate(item.applied_at) })}
              </Text>
            </View>
          }
        />
      )}
      ListEmptyComponent={
        applied.loading ? (
          <SkeletonList count={2} variant="row" />
        ) : applied.error ? (
          <ErrorState message={applied.error} onRetry={applied.reload} compact />
        ) : (
          <EmptyState
            compact
            icon={<Send size={24} color={colors.primary} />}
            title={t('opportunities.athlete.appliedEmptyTitle')}
            body={t('opportunities.athlete.appliedEmptyBody')}
            actionLabel={t('opportunities.athlete.seeWhatsOpen')}
            actionVariant="soft"
            onAction={() => setTab('open')}
          />
        )
      }
    />
  );
}

// ── Recruiter ─────────────────────────────────────────────────────────────────
function PostingRow({ posting }: { posting: PostedOpportunity }) {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();

  const meta = metaLine(
    opportunityTypeLabel(t, posting.type),
    sportLabel(t, posting.sport),
    formatLocation(posting.location, t),
  );
  const applicants = t('common.applicants', { count: posting.applicant_count });

  return (
    <Card
      onPress={() => router.push(Routes.opportunity(posting.id))}
      accessibilityLabel={metaLine(
        posting.title,
        meta,
        posting.is_active
          ? t('opportunities.recruiter.activeA11y')
          : t('opportunities.recruiter.closedA11y'),
        applicants,
      )}
      accessibilityHint={t('opportunities.recruiter.openPosting')}
      style={{ gap: spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {posting.title}
          </Text>
          {meta ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        <Badge
          label={
            posting.is_active
              ? t('opportunities.recruiter.active')
              : t('opportunities.recruiter.closed')
          }
          tone={posting.is_active ? 'success' : 'neutral'}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <DeadlineChip deadline={posting.deadline} />
        <View style={{ flex: 1 }} />
        <Users size={15} color={colors.textSecondary} strokeWidth={2.2} />
        <Text variant="captionStrong" tone="secondary">
          {applicants}
        </Text>
      </View>

      {posting.applicant_count > 0 ? (
        <Button
          label={t('opportunities.recruiter.reviewApplicants')}
          variant="secondary"
          size="sm"
          fullWidth
          onPress={() => router.push(Routes.applicants(posting.id))}
        />
      ) : null}
    </Card>
  );
}

function RecruiterOpportunities() {
  const endPad = useEndPadding();
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const requested = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  const [tab, setTab] = useState<RecruiterTab>(
    requested === 'applicants' ? 'applicants' : 'postings',
  );

  // A coach's profile stat opens this screen on the postings list.
  useEffect(() => {
    if (requested === 'postings' || requested === 'applicants') setTab(requested);
  }, [requested]);

  const postings = useAsync(() => myPostings(), [], { refetchOnFocus: true });
  const applicants = useAsync(() => allApplicants(), [], { refetchOnFocus: true });
  const recruiterListRef = useTabReselect(() => (tab === 'postings' ? postings.reload() : applicants.reload()));

  const segmented = (
    <TextTabs<RecruiterTab>
      value={tab}
      onChange={setTab}
      options={[
        { value: 'postings', label: t('opportunities.tabs.postings') },
        { value: 'applicants', label: t('opportunities.tabs.applicants') },
      ]}
      color={LogoColors.flame}
      testID="opportunities-tabs"
    />
  );

  const postButton = (
    <Button
      label={t('opportunities.post.title')}
      icon={<Plus size={18} color={colors.textOnBrand} strokeWidth={2.6} />}
      fullWidth
      onPress={() => router.push('/opportunity/new')}
    />
  );

  if (tab === 'postings') {
    return (
      <FlatList<PostedOpportunity>
        ref={recruiterListRef}
        data={postings.data ?? []}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
          paddingBottom: endPad,
        }}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
            {segmented}
            {postButton}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={postings.refreshing}
            onRefresh={postings.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => <PostingRow posting={item} />}
        ListEmptyComponent={
          postings.loading ? (
            <SkeletonList count={2} variant="row" />
          ) : postings.error ? (
            <ErrorState message={postings.error} onRetry={postings.reload} compact />
          ) : (
            <EmptyState
              icon={<Target size={26} color={colors.textMuted} />}
              title={t('opportunities.recruiter.postingsEmptyTitle')}
              body={t('opportunities.recruiter.postingsEmptyBody')}
            />
          )
        }
      />
    );
  }

  return (
    <FlatList<RankedApplicant>
      ref={recruiterListRef}
      data={applicants.data ?? []}
      keyExtractor={(item) => item.application_id}
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        paddingBottom: endPad,
      }}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
          {segmented}
          <Text variant="caption" tone="muted">
            {t('opportunities.recruiter.allApplicants')}
          </Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={applicants.refreshing}
          onRefresh={applicants.refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      renderItem={({ item }) => (
        <ApplicantRow
          applicant={item}
          postingTitle={item.opportunity_title}
          onPress={() => router.push(Routes.applicants(item.opportunity_id))}
        />
      )}
      ListEmptyComponent={
        applicants.loading ? (
          <SkeletonList count={3} variant="row" />
        ) : applicants.error ? (
          <ErrorState message={applicants.error} onRetry={applicants.reload} compact />
        ) : (
          <EmptyState
            icon={<Inbox size={26} color={colors.textMuted} />}
            title={t('opportunities.recruiter.applicantsEmptyTitle')}
            body={t('opportunities.recruiter.applicantsEmptyBody')}
          />
        )
      }
    />
  );
}

/**
 * The doorway into every open challenge.
 *
 * A quiet card like the trials under it, so the page stays calm: one solid
 * flame square and a small "2 open" count carry the colour, and a soft warm
 * shadow lifts it just off the page.
 */
function ChallengesLink() {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const dark = theme.scheme === 'dark';
  const flame = theme.gradients.warm[1];
  const router = useRouter();
  const { data } = useAsync(() => openChallenges(null, 5, 0), [], { refetchOnFocus: true });
  const open = (data ?? []).filter((c) => !c.my_entry_id && isChallengeLive(c)).length;

  return (
    <Tappable
      onPress={() => router.push(Routes.challenges)}
      accessibilityLabel={t('challenges.allTitle')}
      testID="opportunities-challenges"
    >
      <View
        style={[
          theme.raised('card'),
          {
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            shadowColor: flame,
            shadowOpacity: dark ? 0.28 : 0.16,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 4,
          },
        ]}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: flame,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* A lighter top half gives the square a little depth. */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 20, backgroundColor: 'rgba(255,255,255,0.16)' }}
          />
          <Flame size={20} color="#FFFFFF" strokeWidth={2.3} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodyStrong">{t('challenges.allTitle')}</Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {t('challenges.allHint')}
          </Text>
        </View>
        {open > 0 ? (
          <View
            style={{
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 10,
              backgroundColor: theme.alpha(flame, dark ? 0.2 : 0.12),
            }}
          >
            <Text variant="captionStrong" color={dark ? '#FFB27A' : '#B5410A'}>
              {t('challenges.openCount', { count: open })}
            </Text>
          </View>
        ) : null}
        <ChevronForward size={18} color={colors.textMuted} />
      </View>
    </Tappable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function OpportunitiesScreen() {
  const t = useT();
  const theme = useTheme();
  const { profile, loading, isRecruiter } = useAuth();

  if (loading && !profile) {
    return (
      <Screen scroll={false} padded={false} testID="opportunities-screen">
        <Header title={t('common.tabTrials')} large />
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SkeletonList count={3} variant="row" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} testID="opportunities-screen">
      <Header
        title={isRecruiter ? t('opportunities.title') : t('common.tabTrials')}
        subtitle={
          isRecruiter
            ? t('opportunities.recruiterSubtitle')
            : t('opportunities.athleteSubtitle')
        }
        large
      />
      {/* Recruiters keep the challenge row on top; athletes get it inside
          their board, under the search. */}
      {isRecruiter ? (
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
          <ChallengesLink />
        </View>
      ) : null}

      {isRecruiter ? <RecruiterOpportunities /> : <AthleteOpportunities />}
    </Screen>
  );
}
