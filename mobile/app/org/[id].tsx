import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Building2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, Header, Screen, SkeletonList } from '@/components/ui';
import { ClubHeader } from '@/components/club/page/ClubHeader';
import { ClubBanners } from '@/components/club/page/ClubBanners';
import { ClubSectionBody, type ClubSectionContext } from '@/components/club/page/ClubSectionBody';
import { PreviewSection } from '@/components/club/page/PreviewSection';
import { toOpportunityOrganization, useClubFollow, useSavedOpenings } from '@/components/club/page/usePublicClub';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { getClubMapUrl, getClubPage } from '@/lib/api.club';
import { organizationOpenings } from '@/lib/api.opportunities';
import { CLUB_SECTIONS } from '@/lib/clubSection';
import { Routes } from '@/lib/routes';
import type { Organization } from '@/types/models';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A club or academy page. Under the header, the visitor scrolls the whole
 * club: a short preview of each section that has something to show, and
 * "See all" opens that section on its own screen.
 */
export default function OrganizationScreen() {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof raw === 'string' && UUID.test(raw) ? raw : null;

  const page = useAsync(() => getClubPage(id as string), [id], { enabled: !!id });
  const mapLink = useAsync(() => getClubMapUrl(id as string), [id], { enabled: !!id });
  const club = page.data ?? null;
  const org = club?.organization ?? null;

  const organization = useMemo(
    () => (org ? toOpportunityOrganization(org) : null),
    [org],
  );

  const openings = useAsync(
    () => organizationOpenings(organization as Organization),
    [organization?.id],
    { enabled: !!organization },
  );

  const { following, followers, followBusy, onToggleFollow, resetFollow } = useClubFollow(
    id,
    club?.viewer.following ?? false,
    org?.followers_count ?? 0,
  );
  const { saved, onToggleSave } = useSavedOpenings(id);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(() => {
    resetFollow();
    page.refresh();
    mapLink.refresh();
    openings.refresh();
    setRefreshKey((key) => key + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetFollow, page.refresh, mapLink.refresh, openings.refresh]);

  const fallbackHeader = <Header back title={t('common.club')} />;

  if (!id) {
    return (
      <Screen header={fallbackHeader}>
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
      <Screen header={fallbackHeader}>
        <SkeletonList count={2} />
      </Screen>
    );
  }

  if (page.error && !club) {
    return (
      <Screen header={fallbackHeader}>
        <ErrorState message={page.error} onRetry={page.reload} />
      </Screen>
    );
  }

  if (!club || !org) {
    return (
      <Screen header={fallbackHeader}>
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
      header={<Header back title={org.name} />}
      padded={false}
      onRefresh={onRefresh}
      refreshing={page.refreshing || openings.refreshing}
      testID="organization-screen"
    >
      <View style={{ paddingBottom: spacing.xxxl }}>
        <View style={{ gap: spacing.xl }}>
          <ClubHeader
            page={club}
            following={following}
            followers={followers}
            followBusy={followBusy}
            onToggleFollow={onToggleFollow}
          />

          <ClubBanners page={club} onChanged={page.refresh} />
        </View>

        {CLUB_SECTIONS.map((name) => (
          <PreviewSection
            key={name}
            title={t(`club.tabs.${name}`)}
            onSeeAll={() => router.push(Routes.clubSection(org.id, name))}
            testID={`club-section-${name}`}
          >
            {(onHasItems) => <ClubSectionBody name={name} ctx={ctx} preview onHasItems={onHasItems} />}
          </PreviewSection>
        ))}
      </View>
    </Screen>
  );
}
