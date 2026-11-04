import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Swords } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, Reveal, SectionHeader, SkeletonList } from '@/components/ui';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { getClubMatches, type ClubMatch, type ClubMatches } from '@/lib/api.club';
import { Routes } from '@/lib/routes';
import { MatchCard } from './MatchCard';
import { PreviewRow } from './PreviewRow';
import { PreviewEmpty, previewPending, TabAction, useReportItems, type ClubTabProps } from './shared';

/** Live (or the next fixture) plus recent results when `limit` is set; otherwise every group. */
function matchGroups(
  data: ClubMatches,
  titles: { live: string; upcoming: string; results: string },
  limit?: number,
): { key: string; title: string; rows: ClubMatch[] }[] {
  const live = data.live ?? [];
  const upcoming = data.upcoming ?? [];
  const results = data.results ?? [];
  if (limit == null) {
    return [
      { key: 'live', title: titles.live, rows: live },
      { key: 'upcoming', title: titles.upcoming, rows: upcoming },
      { key: 'results', title: titles.results, rows: results },
    ].filter((section) => section.rows.length > 0);
  }
  const spotlight = live.slice(0, 1);
  const next = spotlight.length === 0 ? upcoming.slice(0, 1) : [];
  return [
    { key: 'live', title: titles.live, rows: spotlight },
    { key: 'upcoming', title: titles.upcoming, rows: next },
    { key: 'results', title: titles.results, rows: results.slice(0, limit) },
  ].filter((section) => section.rows.length > 0);
}

export function ClubMatchesTab({
  orgId,
  canPost,
  refreshKey,
  clubName,
  limit,
  onHasItems,
}: ClubTabProps & { clubName: string }) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const matches = useAsync(() => getClubMatches(orgId), [orgId, refreshKey]);
  const preview = limit != null;
  const groups = matches.data
    ? matchGroups(
        matches.data,
        {
          live: t('club.matches.live'),
          upcoming: t('club.matches.upcoming'),
          results: t('club.matches.results'),
        },
        limit,
      )
    : [];
  const has = !preview
    ? null
    : previewPending(matches.data, matches.error)
      ? null
      : matches.error && !matches.data
        ? true
        : groups.length > 0;
  useReportItems(onHasItems, has);

  const add = !preview && canPost ? (
    <TabAction
      label={t('club.matches.add')}
      onPress={() => router.push(Routes.clubMatchEdit(orgId))}
      testID="club-add-match"
    />
  ) : null;

  if (preview && has !== true) {
    if (matches.error && !matches.data) return <ErrorState message={matches.error} onRetry={matches.reload} compact />;
    if (has === false) return <PreviewEmpty title={t('club.matches.emptyTitle')} />;
    return null;
  }
  if (preview) {
    return (
      <View style={{ gap: spacing.lg }}>
        {groups.map((section) => (
          <View key={section.key}>
            <SectionHeader title={section.title} />
            {section.key === 'results' ? (
              <PreviewRow>
                {section.rows.map((m) => (
                  <MatchCard key={m.id} match={m} clubName={clubName} />
                ))}
              </PreviewRow>
            ) : (
              <View style={{ gap: spacing.md }}>
                {section.rows.map((m) => (
                  <MatchCard key={m.id} match={m} clubName={clubName} />
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  }
  if (matches.loading) return <SkeletonList count={2} />;
  if (matches.error) return <ErrorState message={matches.error} onRetry={matches.reload} compact />;

  if (groups.length === 0) {
    return (
      <View style={{ gap: spacing.md }}>
        {add}
        <EmptyState
          compact
          icon={<Swords size={26} color={colors.textMuted} />}
          title={t('club.matches.emptyTitle')}
          body={t('club.matches.emptyBody')}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {add}
      {groups.map((section) => (
        <View key={section.key}>
          <SectionHeader title={section.title} />
          <View style={{ gap: spacing.md }}>
            {section.rows.map((m, i) => (
              <Reveal key={m.id} index={i}>
                <MatchCard match={m} clubName={clubName} />
              </Reveal>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
