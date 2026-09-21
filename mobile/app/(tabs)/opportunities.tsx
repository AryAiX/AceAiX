import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bookmark,
  ChevronRight,
  Flame,
  Inbox,
  Plus,
  Send,
  Target,
  Users,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  AnimatedGradient,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SegmentedControl,
  Shine,
  SkeletonList,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { ApplicationStatusBadge } from '@/components/opportunities/ApplicationStatusBadge';
import { ApplicantRow } from '@/components/opportunities/ApplicantRow';
import { DeadlineChip } from '@/components/opportunities/DeadlineChip';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';
import {
  OPPORTUNITY_TYPES,
  SPORTS,
  opportunityTypeLabel,
  sportLabel,
} from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { openChallenges, recommendedOpportunities, toggleSaveOpportunity } from '@/lib/api';
import {
  allApplicants,
  myApplicationsDetailed,
  myPostings,
  savedOpportunities,
} from '@/lib/api.opportunities';
import type { PostedOpportunity, RankedApplicant } from '@/lib/api.opportunities';
import { errorMessage } from '@/lib/errors';
import { fullDate, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import type { Opportunity } from '@/types/models';

type AthleteTab = 'open' | 'saved' | 'applied';
type RecruiterTab = 'postings' | 'applicants';

// ── Athlete ───────────────────────────────────────────────────────────────────
function AthleteOpportunities() {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();

  const [tab, setTab] = useState<AthleteTab>('open');
  const [sport, setSport] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  const open = useAsync(() => recommendedOpportunities(30), []);
  const saved = useAsync(() => savedOpportunities(), [], { refetchOnFocus: true });
  const applied = useAsync(() => myApplicationsDetailed(), [], { refetchOnFocus: true });

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
        if (next) toast.success(t('opportunities.savedToast'));
        refreshSaved();
      } catch (err) {
        setSavedOverrides((current) => ({ ...current, [opportunity.id]: !next }));
        toast.error(errorMessage(err));
      }
    },
    [t, toast, refreshSaved],
  );

  const matches = useCallback(
    (o: Opportunity) =>
      (!sport || o.sport?.toLowerCase() === sport.toLowerCase()) &&
      (!type || o.type?.toLowerCase() === type.toLowerCase()),
    [sport, type],
  );

  const openList = useMemo(() => {
    const rows = (open.data ?? []).filter(matches);
    return [...rows].sort((a, b) => b.match_percent - a.match_percent);
  }, [open.data, matches]);

  const savedList = useMemo(() => (saved.data ?? []).filter(matches), [saved.data, matches]);
  const appliedList = applied.data ?? [];

  const filtersActive = !!sport || !!type;

  const filterRow = (
    <View style={{ gap: spacing.sm }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
      >
        <Chip label={t('sports.allSports')} selected={!sport} onPress={() => setSport(null)} />
        {SPORTS.map((s) => (
          <Chip
            key={s.key}
            label={sportLabel(t, s.key)}
            icon={<Text variant="caption">{s.emoji}</Text>}
            selected={sport === s.key}
            onPress={() => setSport((current) => (current === s.key ? null : s.key))}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
      >
        <Chip label={t('opportunities.allTypes')} selected={!type} onPress={() => setType(null)} />
        {OPPORTUNITY_TYPES.map((option) => (
          <Chip
            key={option.key}
            label={opportunityTypeLabel(t, option.key)}
            selected={type === option.key}
            onPress={() => setType((current) => (current === option.key ? null : option.key))}
          />
        ))}
      </ScrollView>
    </View>
  );

  const segmented = (
    <SegmentedControl<AthleteTab>
      value={tab}
      onChange={setTab}
      options={[
        { value: 'open', label: t('opportunities.tabs.open') },
        { value: 'saved', label: t('opportunities.tabs.saved') },
        { value: 'applied', label: t('opportunities.tabs.applied') },
      ]}
      testID="opportunities-tabs"
    />
  );

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
      {segmented}
      {tab === 'applied' ? null : filterRow}
    </View>
  );

  // ── Open ──
  if (tab === 'open') {
    return (
      <FlatList<Opportunity>
        data={openList}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
          paddingBottom: spacing.giant,
        }}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={open.refreshing}
            onRefresh={open.refresh}
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
          open.loading ? (
            <SkeletonList count={3} variant="row" />
          ) : open.error ? (
            <ErrorState message={open.error} onRetry={open.reload} compact />
          ) : filtersActive ? (
            <EmptyState
              icon={<Target size={26} color={colors.textMuted} />}
              title={t('opportunities.athlete.openEmptyFilteredTitle')}
              body={t('opportunities.athlete.openEmptyFilteredBody')}
              actionLabel={t('opportunities.athlete.clearFilters')}
              onAction={() => {
                setSport(null);
                setType(null);
              }}
            />
          ) : (
            <EmptyState
              icon={<Target size={26} color={colors.textMuted} />}
              title={t('opportunities.athlete.openEmptyTitle')}
              body={t('opportunities.athlete.openEmptyBody')}
              actionLabel={t('opportunities.athlete.findClubs')}
              onAction={() => router.push(Routes.discover)}
            />
          )
        }
      />
    );
  }

  // ── Saved ──
  if (tab === 'saved') {
    return (
      <FlatList<Opportunity>
        data={savedList}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
          paddingBottom: spacing.giant,
        }}
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
          ) : (
            <EmptyState
              icon={<Bookmark size={26} color={colors.textMuted} />}
              title={t('opportunities.athlete.savedEmptyTitle')}
              body={t('opportunities.athlete.savedEmptyBody')}
              actionLabel={t('opportunities.athlete.browseOpen')}
              onAction={() => setTab('open')}
            />
          )
        }
      />
    );
  }

  // ── Applied ──
  return (
    <FlatList
      data={appliedList}
      keyExtractor={(item) => item.application_id}
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        paddingBottom: spacing.giant,
      }}
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
            icon={<Send size={26} color={colors.textMuted} />}
            title={t('opportunities.athlete.appliedEmptyTitle')}
            body={t('opportunities.athlete.appliedEmptyBody')}
            actionLabel={t('opportunities.athlete.seeWhatsOpen')}
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
    posting.location,
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
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();

  const [tab, setTab] = useState<RecruiterTab>('postings');

  const postings = useAsync(() => myPostings(), [], { refetchOnFocus: true });
  const applicants = useAsync(() => allApplicants(), [], { refetchOnFocus: true });

  const segmented = (
    <SegmentedControl<RecruiterTab>
      value={tab}
      onChange={setTab}
      options={[
        { value: 'postings', label: t('opportunities.tabs.postings') },
        { value: 'applicants', label: t('opportunities.tabs.applicants') },
      ]}
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
        data={postings.data ?? []}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
          paddingBottom: spacing.giant,
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
      data={applicants.data ?? []}
      keyExtractor={(item) => item.application_id}
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        paddingBottom: spacing.giant,
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

/** One row into the challenge list, with this week's count. */
function ChallengesLink() {
  const t = useT();
  const theme = useTheme();
  const router = useRouter();
  const { data } = useAsync(() => openChallenges(null, 5, 0), [], { refetchOnFocus: true });
  const open = (data ?? []).filter((c) => c.status === 'open').length;

  return (
    /* The one thing on this screen that is a game rather than an application
       form, so it is the one thing on this screen wearing a colour. */
    <Tappable onPress={() => router.push(Routes.challenges)} accessibilityLabel={t('challenges.title')}>
      <AnimatedGradient
        colors={theme.gradients.warm}
        period={10}
        radius={theme.radii.lg}
        style={theme.elevation(1)}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
          }}
        >
          <View>
            <Flame size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" color="#FFFFFF">
              {t('challenges.title')}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.82)" numberOfLines={1}>
              {open > 0 ? t('challenges.entries', { count: open }) : t('challenges.subtitle')}
            </Text>
          </View>
          <View>
            <ChevronRight size={18} color="#FFFFFF" />
          </View>
        </View>
        <Shine every={9} radius={theme.radii.lg} />
      </AnimatedGradient>
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
        <Header title={t('opportunities.title')} large />
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SkeletonList count={3} variant="row" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} testID="opportunities-screen">
      <Header
        title={t('opportunities.title')}
        subtitle={
          isRecruiter
            ? t('opportunities.recruiterSubtitle')
            : t('opportunities.athleteSubtitle')
        }
        large
      />
      {/* Challenges live next to trials because they answer the same question
          — "what can I do to get seen?" — and one of them is available to an
          athlete with no contacts at all. */}
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <ChallengesLink />
      </View>

      {isRecruiter ? <RecruiterOpportunities /> : <AthleteOpportunities />}
    </Screen>
  );
}
