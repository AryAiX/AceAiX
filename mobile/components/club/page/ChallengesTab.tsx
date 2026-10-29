import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Flame, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, EmptyState, ErrorState, Reveal, SkeletonList, Text } from '@/components/ui';
import { sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { getClubChallenges, type ClubChallenge } from '@/lib/api.club';
import { deadlineLabel, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { agesLabel } from './EventCard';
import { PreviewRow } from './PreviewRow';
import { PreviewEmpty, previewPending, TabAction, useReportItems, type ClubTabProps } from './shared';

export function ChallengeCard({ challenge }: { challenge: ClubChallenge }) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const status = challenge.is_open
    ? { label: t('club.challenges.open'), tone: 'success' as const }
    : challenge.status === 'judging'
      ? { label: t('club.challenges.judging'), tone: 'warning' as const }
      : { label: t('club.challenges.closed'), tone: 'neutral' as const };

  return (
    <Card
      level={1}
      onPress={() => router.push(Routes.challenge(challenge.id))}
      accessibilityRole="button"
      accessibilityLabel={challenge.title}
      style={{ gap: spacing.sm }}
      testID={`club-challenge-${challenge.id}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Flame size={18} color={colors.primary} />
        <Text variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
          {metaLine(sportLabel(t, challenge.sport), agesLabel(t, challenge.age_min, challenge.age_max))}
        </Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <Text variant="subheading" numberOfLines={2}>
        {challenge.title}
      </Text>
      {challenge.brief ? (
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {challenge.brief}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {challenge.is_open ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={12} color={colors.textMuted} />
            <Text variant="caption" tone="muted">
              {deadlineLabel(challenge.closes_at)}
            </Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Users size={12} color={colors.textMuted} />
          <Text variant="caption" tone="muted">
            {t('club.challenges.entries', { n: challenge.entry_count })}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export function ClubChallengesTab({ orgId, canPost, refreshKey, limit, onHasItems }: ClubTabProps) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const challenges = useAsync(() => getClubChallenges(orgId), [orgId, refreshKey]);
  const preview = limit != null;
  const loaded = challenges.data;
  const rows = loaded == null ? [] : preview ? loaded.slice(0, limit) : loaded;
  const has = !preview
    ? null
    : previewPending(loaded, challenges.error)
      ? null
      : challenges.error && !loaded
        ? true
        : rows.length > 0;
  useReportItems(onHasItems, has);

  const add = !preview && canPost ? (
    <TabAction
      label={t('club.challenges.add')}
      onPress={() => router.push({ pathname: Routes.newChallenge, params: { org: orgId } })}
      testID="club-add-challenge"
    />
  ) : null;

  if (preview && challenges.error && !loaded) {
    return <ErrorState message={challenges.error} onRetry={challenges.reload} compact />;
  }
  if (preview && has === false) return <PreviewEmpty title={t('club.challenges.emptyTitle')} />;
  if (preview && has !== true) return null;
  if (preview) {
    return (
      <PreviewRow>
        {rows.map((c) => (
          <ChallengeCard key={c.id} challenge={c} />
        ))}
      </PreviewRow>
    );
  }
  if (challenges.loading) return <SkeletonList count={2} />;
  if (challenges.error) return <ErrorState message={challenges.error} onRetry={challenges.reload} compact />;

  return (
    <View style={{ gap: spacing.md }}>
      {add}
      {!preview && rows.length === 0 ? (
        <EmptyState
          compact
          icon={<Flame size={26} color={colors.textMuted} />}
          title={t('club.challenges.emptyTitle')}
          body={t('club.challenges.emptyBody')}
        />
      ) : (
        rows.map((c, i) => (
          <Reveal key={c.id} index={i}>
            <ChallengeCard challenge={c} />
          </Reveal>
        ))
      )}
    </View>
  );
}
