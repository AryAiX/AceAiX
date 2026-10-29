import React, { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Building2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, Header, Screen, SkeletonList } from '@/components/ui';
import { ClubMatchesTab } from '@/components/club/page/MatchesTab';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { getClubPage, getMyManagedClub, type ClubPage } from '@/lib/api.club';
import { Routes } from '@/lib/routes';

/**
 * Matches — a club account's tab, in the slot Play uses for everyone else.
 * The list is the full matches section from the club page. There is no back
 * button: this is a tab.
 */
export default function ClubMatchesScreen() {
  const t = useT();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const managed = useAsync(getMyManagedClub, [user?.id], { refetchOnFocus: true });
  const managedId = managed.data?.id ?? null;
  /* Tag the result with the id it was loaded for, so a null from before the
     page id arrived is not read as "this club is gone". */
  const page = useAsync(
    async (): Promise<{ id: string | null; club: ClubPage | null }> => {
      if (!managedId) return { id: null, club: null };
      return { id: managedId, club: await getClubPage(managedId) };
    },
    [managedId],
    { refetchOnFocus: true },
  );
  const club = page.data?.id === managedId ? page.data.club : null;
  const pagePending = managedId != null && page.data?.id !== managedId && page.error == null;
  const pageFailed = page.error != null && page.data?.id !== managedId;

  const onRefresh = useCallback(() => {
    managed.refresh();
    if (managedId) page.refresh();
    setRefreshKey((key) => key + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managed.refresh, managedId, page.refresh]);

  const header = <Header title={t('common.matches')} large />;
  const refreshing = managed.refreshing || page.refreshing;

  if (managed.loading && !managed.data) {
    return (
      <Screen header={header} testID="club-matches-tab">
        <SkeletonList count={3} />
      </Screen>
    );
  }

  if (managed.error && !managed.data) {
    return (
      <Screen header={header} onRefresh={onRefresh} refreshing={refreshing} testID="club-matches-tab">
        <ErrorState message={managed.error} onRetry={managed.reload} />
      </Screen>
    );
  }

  if (!managed.data) {
    return (
      <Screen header={header} onRefresh={onRefresh} refreshing={refreshing} testID="club-matches-tab">
        <EmptyState
          icon={<Building2 size={26} color={colors.textMuted} />}
          title={t('clubManage.profile.setupTitle')}
          body={t('clubManage.profile.setupBody')}
          actionLabel={t('clubManage.profile.setupAction')}
          onAction={() => router.push(Routes.clubSetup)}
        />
      </Screen>
    );
  }

  if (pagePending) {
    return (
      <Screen header={header} testID="club-matches-tab">
        <SkeletonList count={3} />
      </Screen>
    );
  }

  if (pageFailed) {
    return (
      <Screen header={header} onRefresh={onRefresh} refreshing={refreshing} testID="club-matches-tab">
        <ErrorState message={page.error} onRetry={page.reload} />
      </Screen>
    );
  }

  if (!club) {
    return (
      <Screen header={header} onRefresh={onRefresh} refreshing={refreshing} testID="club-matches-tab">
        <EmptyState
          icon={<Building2 size={26} color={colors.textMuted} />}
          title={t('opportunities.org.goneTitle')}
          body={t('opportunities.org.goneBody')}
        />
      </Screen>
    );
  }

  return (
    <Screen header={header} onRefresh={onRefresh} refreshing={refreshing} testID="club-matches-tab">
      <ClubMatchesTab
        orgId={club.organization.id}
        canPost={club.viewer.can_post}
        refreshKey={refreshKey}
        clubName={club.organization.name}
      />
    </Screen>
  );
}
