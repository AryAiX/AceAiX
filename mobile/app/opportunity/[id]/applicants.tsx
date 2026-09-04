import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Ban,
  BellRing,
  CalendarCheck,
  Inbox,
  Lock,
  MessageSquare,
  Star,
  User,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  Sheet,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { ApplicantRow } from '@/components/opportunities/ApplicantRow';
import { ApplicationStatusBadge } from '@/components/opportunities/ApplicationStatusBadge';
import { MatchPill } from '@/components/opportunities/MatchExplain';
import { countryLabel, positionLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { setApplicationStatus, startConversation } from '@/lib/api';
import { getOpportunity, reviewApplicants } from '@/lib/api.opportunities';
import { errorMessage } from '@/lib/errors';
import { displayName, fullDate, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { Applicant, ApplicationStatus } from '@/types/models';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Filter = 'all' | ApplicationStatus;

/* Every stage but "all" is a stored status, named here in the club's voice —
   the same words the badge on each row uses. */
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'opportunities.applicants.filterAll' },
  { value: 'applied', label: 'opportunities.status.recruiter.applied' },
  { value: 'in_review', label: 'opportunities.status.recruiter.in_review' },
  { value: 'shortlisted', label: 'opportunities.status.recruiter.shortlisted' },
  { value: 'invited', label: 'opportunities.status.recruiter.invited' },
  { value: 'rejected', label: 'opportunities.status.recruiter.rejected' },
  { value: 'withdrawn', label: 'opportunities.status.recruiter.withdrawn' },
];

/**
 * The club's side of an application.
 *
 * `opportunity_applicants` refuses anybody who is not the poster or an org
 * member with a review role. That refusal is an expected answer for a shared
 * link, so it gets a plain explanation rather than an error dump.
 */
export default function ApplicantsScreen() {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof raw === 'string' && UUID.test(raw) ? raw : null;

  const posting = useAsync(() => getOpportunity(id as string), [id], { enabled: !!id });
  const review = useAsync(() => reviewApplicants(id as string), [id], { enabled: !!id });

  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<Applicant | null>(null);
  const [busy, setBusy] = useState(false);
  /** Statuses changed on this screen, applied before the server answers. */
  const [overrides, setOverrides] = useState<Record<string, ApplicationStatus>>({});

  const applicants = useMemo(() => {
    if (!review.data?.allowed) return [];
    return review.data.applicants.map((a) => ({
      ...a,
      status: overrides[a.application_id] ?? a.status,
    }));
  }, [review.data, overrides]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: applicants.length };
    for (const applicant of applicants) {
      map[applicant.status] = (map[applicant.status] ?? 0) + 1;
    }
    return map;
  }, [applicants]);

  const visible = useMemo(
    () => (filter === 'all' ? applicants : applicants.filter((a) => a.status === filter)),
    [applicants, filter],
  );

  const selected = useMemo(
    () => (open ? applicants.find((a) => a.application_id === open.application_id) ?? open : null),
    [open, applicants],
  );

  const changeStatus = useCallback(
    async (applicant: Applicant, status: ApplicationStatus, done: string) => {
      const previous = applicant.status;
      setOverrides((current) => ({ ...current, [applicant.application_id]: status }));
      setOpen(null);
      try {
        await setApplicationStatus(applicant.application_id, status);
        toast.success(done);
      } catch (err) {
        setOverrides((current) => ({ ...current, [applicant.application_id]: previous }));
        toast.error(errorMessage(err));
      }
    },
    [toast],
  );

  const onMessage = useCallback(
    async (applicant: Applicant) => {
      if (busy) return;
      setBusy(true);
      try {
        const conversationId = await startConversation(applicant.athlete_user_id);
        setOpen(null);
        router.push(Routes.chat(conversationId));
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [busy, router, toast],
  );

  const title = posting.data?.title ?? t('opportunities.applicants.title');

  if (!id) {
    return (
      <Screen header={<Header back title={t('opportunities.applicants.title')} />}>
        <EmptyState
          icon={<Inbox size={26} color={colors.textMuted} />}
          title={t('opportunities.applicants.missingTitle')}
          body={t('opportunities.applicants.missingBody')}
          actionLabel={t('opportunities.applicants.backToOpportunities')}
          onAction={() => router.replace(Routes.opportunities)}
        />
      </Screen>
    );
  }

  if (review.loading) {
    return (
      <Screen header={<Header back title={t('opportunities.applicants.title')} />}>
        <SkeletonList count={4} variant="row" />
      </Screen>
    );
  }

  if (review.error) {
    return (
      <Screen header={<Header back title={t('opportunities.applicants.title')} />}>
        <ErrorState message={review.error} onRetry={review.reload} />
      </Screen>
    );
  }

  if (review.data && !review.data.allowed) {
    return (
      <Screen header={<Header back title={t('opportunities.applicants.title')} />}>
        <EmptyState
          icon={<Lock size={26} color={colors.textMuted} />}
          title={t('opportunities.applicants.lockedTitle')}
          body={t('opportunities.applicants.lockedBody')}
          actionLabel={t('opportunities.applicants.backToOpportunities')}
          onAction={() => router.replace(Routes.opportunities)}
        />
      </Screen>
    );
  }

  const filterRow = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -spacing.lg }}
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
    >
      {FILTERS.filter((f) => f.value === 'all' || (counts[f.value] ?? 0) > 0).map((f) => (
        <Chip
          key={f.value}
          label={t('opportunities.applicants.filterChip', {
            label: t(f.label),
            count: counts[f.value] ?? 0,
          })}
          selected={filter === f.value}
          onPress={() => setFilter(f.value)}
        />
      ))}
    </ScrollView>
  );

  return (
    <>
      <Screen
        scroll={false}
        padded={false}
        header={
          <Header
            back
            title={title}
            subtitle={t('common.applicants', { count: counts.all })}
          />
        }
        testID="applicants-screen"
      >
        <FlatList<Applicant>
          data={visible}
          keyExtractor={(item) => item.application_id}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.giant,
            gap: spacing.sm,
          }}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
              {filterRow}
              <Text variant="caption" tone="muted">
                {t('opportunities.applicants.ranked')}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={review.refreshing}
              onRefresh={() => {
                setOverrides({});
                review.refresh();
                posting.refresh();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <ApplicantRow applicant={item} onPress={() => setOpen(item)} />
          )}
          ListEmptyComponent={
            counts.all === 0 ? (
              <EmptyState
                icon={<Inbox size={26} color={colors.textMuted} />}
                title={t('opportunities.applicants.emptyTitle')}
                body={t('opportunities.applicants.emptyBody')}
              />
            ) : (
              <EmptyState
                compact
                icon={<Inbox size={26} color={colors.textMuted} />}
                title={t('opportunities.applicants.emptyStageTitle')}
                body={t('opportunities.applicants.emptyStageBody')}
                actionLabel={t('opportunities.applicants.showEveryone')}
                onAction={() => setFilter('all')}
              />
            )
          }
        />
      </Screen>

      <Sheet
        visible={!!selected}
        onClose={() => setOpen(null)}
        title={selected ? displayName(selected.full_name) : undefined}
        subtitle={
          selected
            ? metaLine(
                positionLabel(t, selected.position),
                selected.age != null ? t('common.ageYears', { age: selected.age }) : null,
                countryLabel(t, selected.country),
                t('opportunities.athlete.appliedOn', { date: fullDate(selected.applied_at) }),
              )
            : undefined
        }
      >
        {selected ? (
          <View style={{ gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <MatchPill percent={selected.match_percent} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <ApplicationStatusBadge status={selected.status} voice="recruiter" />
                <Text variant="caption" tone="muted">
                  {t('opportunities.applicants.scoreLine', {
                    score: Math.round(selected.talent_score),
                  })}
                </Text>
              </View>
            </View>

            <Card tone="alt">
              <Text variant="body" tone={selected.message?.trim() ? 'secondary' : 'muted'}>
                {selected.message?.trim() || t('opportunities.applicants.noMessage')}
              </Text>
            </Card>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label={t('opportunities.applicants.viewProfile')}
                variant="secondary"
                icon={<User size={16} color={colors.text} strokeWidth={2.2} />}
                style={{ flex: 1 }}
                onPress={() => {
                  const userId = selected.athlete_user_id;
                  setOpen(null);
                  router.push(Routes.profile(userId));
                }}
              />
              <Button
                label={t('common.message')}
                variant="secondary"
                icon={<MessageSquare size={16} color={colors.text} strokeWidth={2.2} />}
                style={{ flex: 1 }}
                loading={busy}
                onPress={() => onMessage(selected)}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text variant="captionStrong" tone="secondary">
                {t('opportunities.applicants.moveForward')}
              </Text>
              <Button
                label={t('opportunities.applicants.shortlist')}
                variant="secondary"
                fullWidth
                icon={<Star size={16} color={colors.warning} strokeWidth={2.4} />}
                disabled={selected.status === 'shortlisted'}
                onPress={() =>
                  changeStatus(
                    selected,
                    'shortlisted',
                    t('opportunities.applicants.shortlistDone'),
                  )
                }
              />
              <Button
                label={t('opportunities.applicants.invite')}
                fullWidth
                icon={<CalendarCheck size={16} color={colors.textOnBrand} strokeWidth={2.4} />}
                disabled={selected.status === 'invited'}
                onPress={() =>
                  changeStatus(selected, 'invited', t('opportunities.applicants.inviteDone'))
                }
              />
              <Button
                label={t('opportunities.applicants.reject')}
                variant="danger"
                fullWidth
                icon={<Ban size={16} color={colors.danger} strokeWidth={2.4} />}
                disabled={selected.status === 'rejected'}
                onPress={() =>
                  changeStatus(selected, 'rejected', t('opportunities.applicants.rejectDone'))
                }
              />
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <BellRing size={18} color={colors.textMuted} />
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                {t('opportunities.applicants.notified')}
              </Text>
            </View>
          </View>
        ) : null}
      </Sheet>
    </>
  );
}
