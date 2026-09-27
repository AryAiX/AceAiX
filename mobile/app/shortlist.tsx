import React, { useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark } from 'lucide-react-native';

import { AthleteCard } from '@/components/discover/AthleteCard';
import { NO_CRITERIA } from '@/components/discover/MatchBadge';
import {
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SkeletonList,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { removeFromShortlist, shortlistedAthletes } from '@/lib/api.discover';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { useTheme } from '@/theme/ThemeProvider';
import type { DiscoveredAthlete } from '@/types/models';

export default function ShortlistScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();

  const list = useAsync(() => shortlistedAthletes(), [], { refetchOnFocus: true });
  const items = list.data ?? [];

  const onToggleSave = useCallback(
    async (athlete: DiscoveredAthlete, next: boolean) => {
      if (next) return;
      list.mutate((current) => (current ?? []).filter((row) => row.athlete_id !== athlete.athlete_id));
      try {
        await removeFromShortlist(athlete.athlete_id);
      } catch (err) {
        list.reload();
        toast.error(errorMessage(err));
      }
    },
    [list, toast],
  );

  const backToDiscover = () => {
    if (router.canGoBack()) router.back();
    else router.navigate(Routes.discover);
  };

  const renderEmpty = () => {
    if (list.loading && items.length === 0) return <SkeletonList count={3} />;
    if (list.error && items.length === 0) {
      return <ErrorState message={list.error} onRetry={list.reload} />;
    }
    return (
      <EmptyState
        icon={<Bookmark size={26} color={colors.textMuted} />}
        title={t('discover.shortlist.emptyTitle')}
        body={t('discover.shortlist.emptyBody')}
        actionLabel={t('discover.shortlist.emptyAction')}
        onAction={backToDiscover}
      />
    );
  };

  return (
    <Screen header={<Header back title={t('discover.shortlist.title')} />} scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.athlete_id}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.giant,
          gap: spacing.md,
        }}
        refreshControl={
          <RefreshControl
            refreshing={list.refreshing}
            onRefresh={list.refresh}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <AthleteCard
            athlete={item}
            criteria={NO_CRITERIA}
            saved
            onToggleSave={onToggleSave}
          />
        )}
        ListEmptyComponent={renderEmpty()}
      />
    </Screen>
  );
}
