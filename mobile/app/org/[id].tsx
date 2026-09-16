import React, { useCallback, useState } from 'react';
import { Image, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, Building2, MapPin, Target, Trophy, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SegmentedControl,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';
import { countryLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { toggleSaveOpportunity } from '@/lib/api';
import {
  getOrganizationPage,
  organizationOpenings,
  setOrganizationFollow,
} from '@/lib/api.opportunities';
import { errorMessage } from '@/lib/errors';
import { compactNumber, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { Opportunity, Organization } from '@/types/models';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Tab = 'about' | 'openings';

/* The stored type is English; only the label a person reads is translated. */
const TYPE_KEY: Record<Organization['type'], string> = {
  club: 'common.club',
  academy: 'opportunities.org.typeAcademy',
  federation: 'common.federation',
};

/** Matches the profile cover so the two page types feel like one app. */
const COVER_HEIGHT = 128;

/** A labelled fact on the About tab. */
function AboutRow({
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 40 }}>
      {icon}
      <Text variant="caption" tone="muted" style={{ width: 84 }}>
        {label}
      </Text>
      <Text variant="captionStrong" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * A club or academy page.
 *
 * Openings are the reason an athlete lands here, so following and applying are
 * both one tap from the top of the screen.
 */
export default function OrganizationScreen() {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const toast = useToast();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof raw === 'string' && UUID.test(raw) ? raw : null;

  const page = useAsync(() => getOrganizationPage(id as string), [id], { enabled: !!id });
  const organization = page.data?.organization ?? null;

  const openings = useAsync(
    () => organizationOpenings(organization as Organization),
    [organization?.id],
    { enabled: !!organization },
  );

  const [tab, setTab] = useState<Tab>('about');
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  const [followerDelta, setFollowerDelta] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [savedOverrides, setSavedOverrides] = useState<Record<string, boolean>>({});

  const following = followOverride ?? page.data?.following ?? false;

  const onToggleFollow = useCallback(async () => {
    if (!organization || followBusy) return;
    const next = !following;
    setFollowOverride(next);
    setFollowerDelta((d) => d + (next ? 1 : -1));
    setFollowBusy(true);
    try {
      await setOrganizationFollow(organization.id, next);
    } catch (err) {
      setFollowOverride(!next);
      setFollowerDelta((d) => d + (next ? -1 : 1));
      toast.error(errorMessage(err));
    } finally {
      setFollowBusy(false);
    }
  }, [organization, following, followBusy, toast]);

  const onToggleSave = useCallback(
    async (opportunity: Opportunity, next: boolean) => {
      setSavedOverrides((current) => ({ ...current, [opportunity.id]: next }));
      try {
        // The API takes the CURRENT state and flips it.
        await toggleSaveOpportunity(opportunity.id, !next);
        if (next) toast.success(t('opportunities.savedToast'));
      } catch (err) {
        setSavedOverrides((current) => ({ ...current, [opportunity.id]: !next }));
        toast.error(errorMessage(err));
      }
    },
    [t, toast],
  );

  if (!id) {
    return (
      <Screen header={<Header back title={t('common.club')} />}>
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

  if (page.loading) {
    return (
      <Screen header={<Header back title={t('common.club')} />}>
        <SkeletonList count={2} />
      </Screen>
    );
  }

  if (page.error) {
    return (
      <Screen header={<Header back title={t('common.club')} />}>
        <ErrorState message={page.error} onRetry={page.reload} />
      </Screen>
    );
  }

  if (!organization) {
    return (
      <Screen header={<Header back title={t('common.club')} />}>
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

  const place = metaLine(organization.city, countryLabel(t, organization.country));
  const followers = Math.max(0, organization.followers_count + followerDelta);
  const followerLabel = t('opportunities.org.followers', {
    count: followers,
    value: compactNumber(followers),
  });
  const typeLabel = t(TYPE_KEY[organization.type] ?? 'common.club');
  const openCount = openings.data?.length ?? 0;

  return (
    <Screen
      header={<Header back title={organization.name} />}
      padded={false}
      onRefresh={() => {
        page.refresh();
        openings.refresh();
      }}
      refreshing={page.refreshing}
      testID="organization-screen"
    >
      {/* Cover */}
      <View
        style={{
          height: COVER_HEIGHT,
          backgroundColor: colors.surfaceAlt,
          borderBottomLeftRadius: theme.radii.xl,
          borderBottomRightRadius: theme.radii.xl,
          overflow: 'hidden',
        }}
      >
        {organization.cover_url ? (
          <Image
            source={{ uri: organization.cover_url }}
            resizeMode="cover"
            style={{ width: '100%', height: '100%' }}
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xl }}>
        {/* Identity */}
        {/* The logo laps onto the cover, the way a club badge sits on a shirt. */}
        <View style={{ gap: spacing.md, marginTop: -spacing.xxxl }}>
          <ClubLogo
            uri={organization.logo_url}
            name={organization.name}
            size="lg"
            style={{ borderWidth: 3, borderColor: colors.bg }}
          />

          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text variant="title" style={{ flexShrink: 1 }} numberOfLines={2}>
                {organization.name}
              </Text>
              {organization.is_verified ? (
                <BadgeCheck size={20} color={colors.info} fill={colors.infoSoft} strokeWidth={2.2} />
              ) : null}
            </View>
            <Text variant="caption" tone="muted">
              {metaLine(typeLabel, organization.league, place)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text variant="captionStrong" tone="secondary" style={{ flex: 1 }}>
              {followerLabel}
            </Text>
            <Button
              label={following ? t('common.following') : t('common.follow')}
              variant={following ? 'secondary' : 'primary'}
              size="sm"
              loading={followBusy}
              onPress={onToggleFollow}
              accessibilityLabel={
                following
                  ? t('opportunities.org.unfollowA11y', { name: organization.name })
                  : t('opportunities.org.followA11y', { name: organization.name })
              }
            />
          </View>
        </View>

        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'about', label: t('opportunities.org.tabAbout') },
            {
              value: 'openings',
              label:
                openCount > 0
                  ? t('opportunities.org.tabOpeningsCount', { count: openCount })
                  : t('opportunities.org.tabOpenings'),
            },
          ]}
          testID="organization-tabs"
        />

        {tab === 'about' ? (
          <View style={{ gap: spacing.lg }}>
            {organization.description?.trim() ? (
              <Text variant="body" tone="secondary">
                {organization.description.trim()}
              </Text>
            ) : (
              <Text variant="body" tone="muted">
                {t('opportunities.org.noIntro')}
              </Text>
            )}

            <Card tone="alt" style={{ gap: spacing.xs }}>
              <AboutRow
                icon={<Building2 size={16} color={colors.textMuted} />}
                label={t('opportunities.org.factType')}
                value={typeLabel}
              />
              {organization.league ? (
                <AboutRow
                  icon={<Trophy size={16} color={colors.textMuted} />}
                  label={t('opportunities.org.factLeague')}
                  value={organization.league}
                />
              ) : null}
              {place ? (
                <AboutRow
                  icon={<MapPin size={16} color={colors.textMuted} />}
                  label={t('opportunities.org.factBasedIn')}
                  value={place}
                />
              ) : null}
              <AboutRow
                icon={<Users size={16} color={colors.textMuted} />}
                label={t('common.followers')}
                value={followerLabel}
              />
            </Card>

            {!organization.is_verified ? (
              <Text variant="caption" tone="muted">
                {t('opportunities.org.unverified')}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {openings.loading ? (
              <SkeletonList count={2} variant="row" />
            ) : openings.error ? (
              <ErrorState message={openings.error} onRetry={openings.reload} compact />
            ) : openCount === 0 ? (
              <EmptyState
                compact
                icon={<Target size={26} color={colors.textMuted} />}
                title={t('opportunities.org.openingsEmptyTitle')}
                body={
                  following
                    ? t('opportunities.org.openingsEmptyFollowing')
                    : t('opportunities.org.openingsEmptyBody')
                }
                actionLabel={following ? undefined : t('common.follow')}
                onAction={following ? undefined : onToggleFollow}
              />
            ) : (
              (openings.data ?? []).map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  saved={savedOverrides[opportunity.id] ?? opportunity.is_saved}
                  onToggleSave={onToggleSave}
                />
              ))
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
