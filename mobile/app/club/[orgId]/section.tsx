import React, { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Building2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, Header, Screen, SkeletonList } from '@/components/ui';
import { ClubSectionBody, type ClubSectionContext } from '@/components/club/page/ClubSectionBody';
import { toOpportunityOrganization, useClubFollow, useSavedOpenings } from '@/components/club/page/usePublicClub';
import { useOrgId } from '@/components/club/manage/shared';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getClubMapUrl, getClubPage } from '@/lib/api.club';
import { organizationOpenings } from '@/lib/api.opportunities';
import { parseClubSection } from '@/lib/clubSection';
import { Routes } from '@/lib/routes';
import type { Organization } from '@/types/models';

/**
 * One club section in full — the same component the public page previews,
 * with the same data, buttons, and empty messages the tabs used to show.
 */
export default function ClubSectionScreen() {
  const t = useT();
  const theme = useTheme();
  const { colors } = theme;
  const router = useRouter();
  const orgId = useOrgId();
  const params = useLocalSearchParams<{ name?: string | string[] }>();
  const name = parseClubSection(params.name);

  const page = useAsync(() => getClubPage(orgId as string), [orgId], { enabled: !!orgId });
  const mapLink = useAsync(() => getClubMapUrl(orgId as string), [orgId], {
    enabled: !!orgId && name === 'about',
  });

  const club = page.data ?? null;
  const org = club?.organization ?? null;
  const organization = useMemo(
    () => (org ? toOpportunityOrganization(org) : null),
    [org],
  );
  const openings = useAsync(
    () => organizationOpenings(organization as Organization),
    [organization?.id],
    { enabled: name === 'openings' && !!organization },
  );

  const { following, onToggleFollow, resetFollow } = useClubFollow(
    orgId,
    club?.viewer.following ?? false,
    org?.followers_count ?? 0,
  );
  const { saved, onToggleSave } = useSavedOpenings(orgId);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(() => {
    resetFollow();
    page.refresh();
    if (name === 'about') mapLink.refresh();
    if (name === 'openings') openings.refresh();
    setRefreshKey((key) => key + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetFollow, page.refresh, mapLink.refresh, openings.refresh, name]);

  const title = name ? t(`club.tabs.${name}`) : t('common.club');
  const header = <Header back title={title} />;

  if (!name) {
    return (
      <Screen header={<Header back title={t('common.club')} />}>
        <EmptyState title={t('common.somethingWentWrong')} body={t('common.tryAgainLater')} />
      </Screen>
    );
  }

  if (!orgId) {
    return (
      <Screen header={header}>
        <EmptyState
          icon={<Building2 size={26} color={colors.textMuted} />}
          title={t('opportunities.org.missingTitle')}
          body={t('opportunities.org.missingBody')}
          actionLabel={t('opportunities.org.backToDiscover')}
          onAction={() => router.replace(Routes.discover)}
        />
      </Screen>
    );
  }

  if (page.loading && !club) {
    return (
      <Screen header={header}>
        <SkeletonList count={3} />
      </Screen>
    );
  }

  if (page.error && !club) {
    return (
      <Screen header={header}>
        <ErrorState message={page.error} onRetry={page.reload} />
      </Screen>
    );
  }

  if (!club || !org) {
    return (
      <Screen header={header}>
        <EmptyState
          icon={<Building2 size={26} color={colors.textMuted} />}
          title={t('opportunities.org.goneTitle')}
          body={t('opportunities.org.goneBody')}
          actionLabel={t('opportunities.org.backToDiscover')}
          onAction={() => router.replace(Routes.discover)}
        />
      </Screen>
    );
  }

  const viewer = club.viewer;
  const pageTeam = viewer.can_manage || viewer.can_post || viewer.can_score;
  const ctx: ClubSectionContext = {
    orgId: org.id,
    canPost: viewer.can_post,
    onTeam: viewer.role != null,
    clubName: org.name,
    refreshKey,
    page: club,
    mapUrl: mapLink.data ?? null,
    openings: {
      loading: openings.loading,
      error: openings.error,
      data: openings.data,
      reload: openings.reload,
    },
    following,
    onFollow: pageTeam ? undefined : onToggleFollow,
    saved,
    onToggleSave,
  };

  return (
    <Screen
      header={header}
      onRefresh={onRefresh}
      refreshing={page.refreshing || openings.refreshing || mapLink.refreshing}
      testID="club-section-screen"
    >
      <ClubSectionBody name={name} ctx={ctx} />
    </Screen>
  );
}
