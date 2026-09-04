import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  CheckCircle2,
  Flag,
  MapPin,
  MoreHorizontal,
  Share2,
  ShieldCheck,
  Target,
  Trophy,
  Users,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  Input,
  ListItem,
  Screen,
  Sheet,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { DeadlineChip, isClosed } from '@/components/opportunities/DeadlineChip';
import { MatchBlock, explainMatch } from '@/components/opportunities/MatchExplain';
import { ApplicationStatusBadge } from '@/components/opportunities/ApplicationStatusBadge';
import {
  opportunityTypeLabel,
  positionLabel,
  sportLabel,
} from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import {
  applyToOpportunity,
  reportContent,
  toggleSaveOpportunity,
  withdrawApplication,
} from '@/lib/api';
import {
  getOpportunity,
  getOpportunityMatch,
  reapplyToOpportunity,
} from '@/lib/api.opportunities';
import { errorMessage } from '@/lib/errors';
import { fullDate } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* `value` is what the report is filed as and stays English; the label and the
   hint are what the person picking a reason reads. */
const REPORT_REASONS: { value: string; label: string; hint?: string }[] = [
  {
    value: 'child_safety',
    label: 'opportunities.report.reason.childSafety',
    hint: 'opportunities.report.reason.childSafetyHint',
  },
  { value: 'scam', label: 'opportunities.report.reason.scam' },
  { value: 'impersonation', label: 'opportunities.report.reason.impersonation' },
  { value: 'misleading', label: 'opportunities.report.reason.misleading' },
  { value: 'spam', label: 'opportunities.report.reason.spam' },
  { value: 'other', label: 'opportunities.report.reason.other' },
];

/** One label-and-value cell in the facts grid. */
function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text variant="overline" tone="muted">
          {label}
        </Text>
      </View>
      <Text variant="captionStrong" style={{ paddingLeft: spacing.xl }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * One opportunity in full.
 *
 * Every ending is handled here: a live posting, one the athlete already applied
 * to, one that closed, one the owner is looking at, and an id that points at
 * nothing. None of them may render blank.
 */
export default function OpportunityDetailScreen() {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const { profile, isAthlete } = useAuth();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof raw === 'string' && UUID.test(raw) ? raw : null;

  const detail = useAsync(() => getOpportunity(id as string), [id], { enabled: !!id });
  const opportunity = detail.data;
  const reloadDetail = detail.reload;

  const match = useAsync(() => getOpportunityMatch(id as string), [id], {
    enabled: !!id && isAthlete,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null);

  const saved = savedOverride ?? opportunity?.is_saved ?? false;
  const isOwner = !!opportunity && opportunity.created_by_id === profile?.id;
  const closed = !!opportunity && (!opportunity.is_active || isClosed(opportunity.deadline));

  const application = opportunity?.application ?? null;
  const hasLiveApplication = !!application && application.status !== 'withdrawn';

  const explanation = useMemo(() => {
    if (!opportunity || !match.data) return null;
    return explainMatch(t, {
      match_percent: match.data.percent,
      reasons: match.data.reasons,
      position: opportunity.position,
      org_id: opportunity.org_id,
    });
  }, [t, opportunity, match.data]);

  const link = id ? `https://aceaix.com/app/opportunity/${id}` : null;

  const onShare = useCallback(async () => {
    if (!link || !opportunity) return;
    setMenuOpen(false);
    try {
      const headline = t('opportunities.detail.shareText', {
        title: opportunity.title,
        club: opportunity.org_name ?? t('opportunities.detail.shareClubFallback'),
      });
      const text = `${headline}\n${link}`;
      await Share.share(Platform.OS === 'ios' ? { url: link, message: text } : { message: text });
    } catch {
      /* the user backed out of the share sheet */
    }
  }, [t, link, opportunity]);

  const onToggleSave = useCallback(async () => {
    if (!opportunity) return;
    const next = !saved;
    setSavedOverride(next);
    try {
      await toggleSaveOpportunity(opportunity.id, saved);
      if (next) toast.success(t('opportunities.savedToast'));
    } catch (err) {
      setSavedOverride(!next);
      toast.error(errorMessage(err));
    }
  }, [t, opportunity, saved, toast]);

  const onApply = useCallback(async () => {
    if (!opportunity || busy) return;
    setBusy(true);
    try {
      // A withdrawn application still occupies the unique (opportunity, athlete)
      // row, so applying again has to revive it rather than insert a second one.
      if (application) await reapplyToOpportunity(application.id, message.trim());
      else await applyToOpportunity(opportunity.id, message.trim());

      setApplyOpen(false);
      setMessage('');
      toast.success(t('opportunities.apply.sent'));
      reloadDetail();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [t, opportunity, application, message, busy, toast, reloadDetail]);

  const onWithdraw = useCallback(async () => {
    if (!application || busy) return;
    setBusy(true);
    try {
      await withdrawApplication(application.id);
      toast.success(t('opportunities.detail.withdrawn'));
      reloadDetail();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [t, application, busy, toast, reloadDetail]);

  const onReport = useCallback(
    async (reason: string) => {
      if (!id || busy) return;
      setBusy(true);
      try {
        await reportContent('opportunity', id, reason);
        setReportOpen(false);
        toast.success(t('opportunities.report.thanks'));
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [t, id, busy, toast],
  );

  const overflow = (
    <IconButton
      icon={<MoreHorizontal size={20} color={colors.text} />}
      label={t('opportunities.detail.more')}
      size={theme.hit.min}
      onPress={() => setMenuOpen(true)}
    />
  );

  // ── Non-happy paths ──
  if (!id) {
    return (
      <Screen header={<Header back title={t('opportunities.detail.title')} />}>
        <EmptyState
          icon={<Target size={26} color={colors.textMuted} />}
          title={t('opportunities.detail.missingTitle')}
          body={t('opportunities.detail.missingBody')}
          actionLabel={t('opportunities.detail.seeWhatsOpen')}
          onAction={() => router.replace(Routes.opportunities)}
        />
      </Screen>
    );
  }

  if (detail.loading) {
    return (
      <Screen header={<Header back title={t('opportunities.detail.title')} />}>
        <SkeletonList count={2} />
      </Screen>
    );
  }

  if (detail.error) {
    return (
      <Screen header={<Header back title={t('opportunities.detail.title')} />}>
        <ErrorState message={detail.error} onRetry={detail.reload} />
      </Screen>
    );
  }

  if (!opportunity) {
    return (
      <Screen header={<Header back title={t('opportunities.detail.title')} />}>
        <EmptyState
          icon={<Target size={26} color={colors.textMuted} />}
          title={t('opportunities.detail.goneTitle')}
          body={t('opportunities.detail.goneBody')}
          actionLabel={t('opportunities.detail.seeWhatsOpen')}
          onAction={() => router.replace(Routes.opportunities)}
        />
      </Screen>
    );
  }

  const club = opportunity.org_name?.trim() || t('opportunities.card.independent');
  const typeLabel = opportunityTypeLabel(t, opportunity.type);

  // ── Sticky bar ──
  const bookmarkButton = (
    <IconButton
      icon={
        saved ? (
          <BookmarkCheck size={20} color={colors.primary} strokeWidth={2.2} />
        ) : (
          <Bookmark size={20} color={colors.textMuted} strokeWidth={2} />
        )
      }
      label={saved ? t('opportunities.detail.unsave') : t('opportunities.detail.save')}
      tone="neutral"
      size={theme.hit.comfortable}
      onPress={onToggleSave}
    />
  );

  let footer: React.ReactNode = null;

  if (isOwner) {
    footer = (
      <Button
        label={t('opportunities.detail.reviewApplicants', {
          count: opportunity.applicant_count,
        })}
        icon={<Users size={18} color={colors.textOnBrand} strokeWidth={2.4} />}
        fullWidth
        onPress={() => router.push(Routes.applicants(opportunity.id))}
      />
    );
  } else if (hasLiveApplication && application) {
    footer = (
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            minHeight: theme.hit.comfortable,
            paddingHorizontal: spacing.lg,
            borderRadius: theme.radii.pill,
            backgroundColor: colors.successSoft,
          }}
        >
          <CheckCircle2 size={20} color={colors.success} strokeWidth={2.4} />
          <Text variant="subheading" color={colors.success} style={{ flex: 1 }}>
            {t('opportunities.athlete.appliedOn', { date: fullDate(application.created_at) })}
          </Text>
          <ApplicationStatusBadge status={application.status} />
        </View>
        <Pressable
          onPress={onWithdraw}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('opportunities.detail.withdrawA11y')}
          style={({ pressed }) => ({
            minHeight: theme.hit.min,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed || busy ? 0.6 : 1,
          })}
        >
          <Text variant="captionStrong" tone="muted">
            {t('opportunities.detail.withdraw')}
          </Text>
        </Pressable>
      </View>
    );
  } else if (closed) {
    footer = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Button
          label={t('opportunities.detail.applicationsClosed')}
          variant="secondary"
          fullWidth
          disabled
          style={{ flex: 1 }}
        />
        {bookmarkButton}
      </View>
    );
  } else if (isAthlete) {
    footer = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Button
          label={t('common.apply')}
          fullWidth
          style={{ flex: 1 }}
          onPress={() => setApplyOpen(true)}
        />
        {bookmarkButton}
      </View>
    );
  }

  return (
    <>
      <Screen
        header={<Header back title={typeLabel || t('opportunities.detail.title')} right={overflow} />}
        footer={footer}
        onRefresh={() => {
          detail.refresh();
          match.refresh();
        }}
        refreshing={detail.refreshing}
        testID="opportunity-detail"
      >
        <View style={{ gap: spacing.xl }}>
          {/* Club */}
          <Pressable
            onPress={
              opportunity.org_id
                ? () => router.push(Routes.organization(opportunity.org_id as string))
                : undefined
            }
            disabled={!opportunity.org_id}
            accessibilityRole={opportunity.org_id ? 'button' : undefined}
            accessibilityLabel={
              opportunity.org_id ? t('opportunities.detail.openClub', { club }) : club
            }
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: theme.hit.min,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ClubLogo uri={opportunity.org_logo} name={club} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {club}
                </Text>
                {opportunity.org_verified ? (
                  <BadgeCheck
                    size={15}
                    color={colors.info}
                    fill={colors.infoSoft}
                    strokeWidth={2.2}
                  />
                ) : null}
              </View>
              <Text variant="caption" tone="muted">
                {opportunity.org_id
                  ? t('opportunities.detail.viewClub')
                  : t('opportunities.detail.postedByMember')}
              </Text>
            </View>
          </Pressable>

          {/* Title */}
          <View style={{ gap: spacing.md }}>
            <Text variant="title">{opportunity.title}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {typeLabel ? <Badge label={typeLabel} tone="primary" size="md" /> : null}
              <DeadlineChip deadline={opportunity.deadline} size="md" />
              {!opportunity.is_active ? (
                <Badge label={t('opportunities.detail.closed')} tone="neutral" size="md" />
              ) : null}
            </View>
          </View>

          {/* Match */}
          {explanation ? <MatchBlock match={explanation} /> : null}

          {/* Description */}
          {opportunity.description?.trim() ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="heading">{t('opportunities.detail.about')}</Text>
              <Text variant="body" tone="secondary">
                {opportunity.description.trim()}
              </Text>
            </View>
          ) : null}

          {/* Facts */}
          <Card tone="alt" style={{ gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
              {typeLabel ? (
                <Fact
                  icon={<Target size={14} color={colors.textMuted} />}
                  label={t('opportunities.detail.factType')}
                  value={typeLabel}
                />
              ) : null}
              {opportunity.sport ? (
                <Fact
                  icon={<Trophy size={14} color={colors.textMuted} />}
                  label={t('opportunities.detail.factSport')}
                  value={sportLabel(t, opportunity.sport)}
                />
              ) : null}
              <Fact
                icon={<Users size={14} color={colors.textMuted} />}
                label={t('opportunities.detail.factPosition')}
                value={
                  opportunity.position
                    ? positionLabel(t, opportunity.position)
                    : t('sports.anyPosition')
                }
              />
              {opportunity.location ? (
                <Fact
                  icon={<MapPin size={14} color={colors.textMuted} />}
                  label={t('opportunities.detail.factWhere')}
                  value={opportunity.location}
                />
              ) : null}
              <Fact
                icon={<CalendarClock size={14} color={colors.textMuted} />}
                label={t('opportunities.detail.factDeadline')}
                value={
                  opportunity.deadline
                    ? fullDate(opportunity.deadline)
                    : t('opportunities.detail.noDeadline')
                }
              />
              <Fact
                icon={<CalendarClock size={14} color={colors.textMuted} />}
                label={t('opportunities.detail.factPosted')}
                value={fullDate(opportunity.created_at)}
              />
            </View>
          </Card>

          {/* Safety footnote — a trial is a real-world meeting. */}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <ShieldCheck size={18} color={colors.textMuted} />
            <Text variant="caption" tone="muted" style={{ flex: 1 }}>
              {t('opportunities.detail.safety')}
            </Text>
          </View>
        </View>
      </Screen>

      {/* ── Overflow ── */}
      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t('opportunities.detail.menuTitle')}
        scrollable={false}
      >
        <View style={{ paddingBottom: spacing.sm }}>
          <ListItem
            title={t('common.share')}
            left={<Share2 size={20} color={colors.textSecondary} />}
            onPress={onShare}
            showChevron={false}
          />
          <Divider />
          <ListItem
            title={t('common.report')}
            subtitle={t('opportunities.detail.reportHint')}
            left={<Flag size={20} color={colors.textSecondary} />}
            onPress={() => {
              setMenuOpen(false);
              // iOS refuses to present a modal while another is dismissing.
              setTimeout(() => setReportOpen(true), 240);
            }}
            showChevron={false}
          />
        </View>
      </Sheet>

      <Sheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        title={t('opportunities.report.title')}
        subtitle={t('opportunities.report.subtitle')}
        footer={
          <Button
            label={t('common.cancel')}
            variant="ghost"
            fullWidth
            onPress={() => setReportOpen(false)}
          />
        }
      >
        <View>
          {REPORT_REASONS.map((reason, index) => (
            <View key={reason.value}>
              {index > 0 ? <Divider /> : null}
              <ListItem
                title={t(reason.label)}
                subtitle={reason.hint ? t(reason.hint) : undefined}
                left={
                  reason.value === 'child_safety' ? (
                    <AlertTriangle size={20} color={colors.danger} />
                  ) : (
                    <Flag size={20} color={colors.textSecondary} />
                  )
                }
                onPress={() => onReport(reason.value)}
                disabled={busy}
                showChevron={false}
              />
            </View>
          ))}
        </View>
      </Sheet>

      {/* ── Apply ── */}
      <Sheet
        visible={applyOpen}
        onClose={() => setApplyOpen(false)}
        title={t('common.apply')}
        subtitle={opportunity.title}
        footer={
          <Button
            label={t('opportunities.apply.send')}
            fullWidth
            loading={busy}
            onPress={onApply}
          />
        }
      >
        <View style={{ gap: spacing.lg }}>
          <Input
            label={t('opportunities.apply.messageLabel')}
            placeholder={t('opportunities.apply.messagePlaceholder')}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={600}
            hint={`${message.trim().length}/600`}
          />

          <Card tone="alt" style={{ gap: spacing.sm }}>
            <Text variant="captionStrong">{t('opportunities.apply.whatTheySee')}</Text>
            <View style={{ gap: 6 }}>
              {[
                'opportunities.apply.seeProfile',
                'opportunities.apply.seeScore',
                'opportunities.apply.seeHighlights',
                'opportunities.apply.seeMessage',
              ].map((key) => (
                <View
                  key={key}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                >
                  <CheckCircle2 size={14} color={colors.textMuted} strokeWidth={2.4} />
                  <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                    {t(key)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {profile?.is_minor ? (
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <ShieldCheck size={18} color={colors.info} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                {t('opportunities.apply.guardianNotice')}
              </Text>
            </View>
          ) : null}
        </View>
      </Sheet>
    </>
  );
}
