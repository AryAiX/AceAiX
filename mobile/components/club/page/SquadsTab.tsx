import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Shirt } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip, EmptyState, ErrorState, Reveal, SkeletonList } from '@/components/ui';
import { sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { getClubSquads } from '@/lib/api.club';
import { Routes } from '@/lib/routes';
import { PreviewRow } from './PreviewRow';
import { SquadCard } from './SquadCard';
import { PreviewEmpty, previewPending, TabAction, useReportItems, type ClubTabProps } from './shared';

const ALL = '__all';

export function ClubSquadsTab({
  orgId,
  canPost,
  refreshKey,
  onTeam,
  limit,
  onHasItems,
}: ClubTabProps & { onTeam: boolean }) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  /* null asks the server for the current season. */
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [sport, setSport] = useState<string>(ALL);

  const squads = useAsync(() => getClubSquads(orgId, seasonId), [orgId, seasonId, refreshKey]);
  const preview = limit != null;
  const all = squads.data?.squads ?? [];
  const has = !preview
    ? null
    : previewPending(squads.data, squads.error)
      ? null
      : squads.error && !squads.data
        ? true
        : all.length > 0;
  useReportItems(onHasItems, has);

  if (preview) {
    if (squads.error && !squads.data) return <ErrorState message={squads.error} onRetry={squads.reload} compact />;
    if (has === false) return <PreviewEmpty title={t('club.squads.emptyTitle')} />;
    if (has !== true) return null;
    return (
      <PreviewRow>
        {all.slice(0, limit).map((squad) => (
          <SquadCard key={squad.id} squad={squad} showYouthNote={!onTeam} />
        ))}
      </PreviewRow>
    );
  }

  const edit = canPost ? (
    <TabAction
      label={t('club.squads.edit')}
      onPress={() => router.push(Routes.clubSquads(orgId))}
      testID="club-edit-squads"
    />
  ) : null;

  if (squads.loading) return <SkeletonList count={2} />;
  if (squads.error) return <ErrorState message={squads.error} onRetry={squads.reload} compact />;

  const data = squads.data;
  const seasons = data?.seasons ?? [];
  const sports = [...new Set(all.map((s) => s.sport))];
  const shown = sport === ALL || !sports.includes(sport) ? all : all.filter((s) => s.sport === sport);
  const activeSeason = data?.season_id ?? null;

  const chipRow = (children: React.ReactNode) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm }}
      style={{ flexGrow: 0 }}
    >
      {children}
    </ScrollView>
  );

  return (
    <View style={{ gap: spacing.md }}>
      {edit}

      {seasons.length > 1
        ? chipRow(
            seasons.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                selected={s.id === activeSeason}
                onPress={() => setSeasonId(s.id)}
                testID={`club-season-${s.id}`}
              />
            )),
          )
        : null}

      {sports.length > 1
        ? chipRow(
            [ALL, ...sports].map((value) => (
              <Chip
                key={value}
                label={value === ALL ? t('club.squads.allSports') : sportLabel(t, value)}
                selected={value === sport || (value === ALL && !sports.includes(sport))}
                onPress={() => setSport(value)}
              />
            )),
          )
        : null}

      {shown.length === 0 ? (
        <EmptyState
          compact
          icon={<Shirt size={26} color={colors.textMuted} />}
          title={t('club.squads.emptyTitle')}
          body={canPost ? t('club.squads.emptyTeam') : t('club.squads.emptyBody')}
        />
      ) : (
        shown.map((squad, i) => (
          <Reveal key={squad.id} index={i}>
            <SquadCard squad={squad} showYouthNote={!onTeam} />
          </Reveal>
        ))
      )}
    </View>
  );
}
