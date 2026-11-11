import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, Reveal, SectionHeader, SkeletonList } from '@/components/ui';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { getClubAwards, type ClubAward } from '@/lib/api.club';
import { Routes } from '@/lib/routes';
import { AwardCard } from './AwardCard';
import { PreviewRow } from './PreviewRow';
import { PreviewEmpty, previewPending, TabAction, useReportItems, type ClubTabProps } from './shared';

/** Group by year, else season label; undated awards last. Order kept from the API. */
function shelves(awards: ClubAward[]): { key: string; label: string | null; rows: ClubAward[] }[] {
  const groups = new Map<string, { key: string; label: string | null; rows: ClubAward[] }>();
  for (const a of awards) {
    const label = a.year != null ? String(a.year) : a.season_label?.trim() || null;
    const key = label ?? '__none';
    if (!groups.has(key)) groups.set(key, { key, label, rows: [] });
    groups.get(key)!.rows.push(a);
  }
  const list = [...groups.values()];
  return [...list.filter((g) => g.label), ...list.filter((g) => !g.label)];
}

export function ClubAwardsTab({ orgId, canPost, refreshKey, limit, onHasItems }: ClubTabProps) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const awards = useAsync(() => getClubAwards(orgId), [orgId, refreshKey]);
  const preview = limit != null;
  const loaded = awards.data;
  const rows = loaded == null ? [] : preview ? loaded.slice(0, limit) : loaded;
  const has = !preview
    ? null
    : previewPending(loaded, awards.error)
      ? null
      : awards.error && !loaded
        ? true
        : rows.length > 0;
  useReportItems(onHasItems, has);

  const add = !preview && canPost ? (
    <TabAction
      label={t('club.awards.add')}
      onPress={() => router.push(Routes.clubAward(orgId))}
      testID="club-add-award"
    />
  ) : null;

  if (preview && awards.error && !loaded) return <ErrorState message={awards.error} onRetry={awards.reload} compact />;
  if (preview && has === false) return <PreviewEmpty title={t('club.awards.emptyTitle')} />;
  if (preview && has !== true) return null;
  if (preview) {
    return (
      <PreviewRow>
        {rows.map((a) => (
          <AwardCard key={a.id} award={a} />
        ))}
      </PreviewRow>
    );
  }
  if (awards.loading) return <SkeletonList count={2} variant="row" />;
  if (awards.error) return <ErrorState message={awards.error} onRetry={awards.reload} compact />;

  if (!preview && rows.length === 0) {
    return (
      <View style={{ gap: spacing.md }}>
        {add}
        <EmptyState
          compact
          icon={<Trophy size={26} color={colors.textMuted} />}
          title={t('club.awards.emptyTitle')}
          body={t('club.awards.emptyBody')}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {add}
      {shelves(rows).map((shelf) => (
        <View key={shelf.key}>
          <SectionHeader title={shelf.label ?? t('club.awards.undated')} />
          <View style={{ gap: spacing.md }}>
            {shelf.rows.map((a, i) => (
              <Reveal key={a.id} index={i}>
                <AwardCard award={a} />
              </Reveal>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
