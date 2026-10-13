import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Handshake, Megaphone } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Reveal,
  SectionHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import {
  getMySponsorship,
  getSponsorCalls,
  getSponsors,
  type CallFeedItem,
  type SponsorListing,
} from '@/lib/api.sponsorship';
import { displayName, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import { CallCard } from './CallCard';
import { ApplySheet } from './Sheets';
import { TagRow } from './Tags';

/**
 * Discover → Sponsors, for everyone who is not a sponsor.
 *
 * Three things, top to bottom: where I stand (an athlete's own request, or the
 * way to make one), the calls verified sponsors have open, and the sponsors
 * themselves. `query` comes from the search bar above the tabs.
 */
export function SponsorsTab({ query }: { query: string }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const { isAthlete } = useAuth();

  const mine = useAsync(() => (isAthlete ? getMySponsorship() : Promise.resolve(null)), [isAthlete], {
    refetchOnFocus: true,
  });
  const calls = useAsync(() => getSponsorCalls({ query }), [query], { refetchOnFocus: true });
  const sponsors = useAsync(() => getSponsors(query), [query]);
  const [applyTo, setApplyTo] = useState<CallFeedItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([mine.reload(), calls.reload(), sponsors.reload()]);
    setRefreshing(false);
  }, [mine, calls, sponsors]);

  const openProfile = useCallback((id: string) => router.push(Routes.profile(id)), [router]);
  const openRequests = useMemo(
    () => (mine.data?.requests ?? []).filter((r) => r.status === 'open'),
    [mine.data],
  );
  const gate = mine.data?.gate ?? 'ok';

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.giant, gap: spacing.xl }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
      testID="sponsors-tab"
    >
      {isAthlete ? (
        <Reveal>
          <View style={{ borderRadius: theme.radii.xl, overflow: 'hidden' }}>
            <LinearGradient
              colors={theme.gradients.warm}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: spacing.lg, gap: spacing.sm }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Handshake size={22} color="#FFFFFF" />
                <Text variant="heading" color="#FFFFFF" style={{ flex: 1 }}>
                  {openRequests.length > 0 ? t('sponsorship.seekingNow') : t('sponsorship.seekTitle')}
                </Text>
              </View>
              <Text variant="body" color="rgba(255,255,255,0.9)">
                {openRequests.length > 0
                  ? openRequests.map((r) => r.title).join(' · ')
                  : gate === 'guardian_consent_required'
                    ? t('sponsorship.guardianBody')
                    : t('sponsorship.seekBody')}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                {gate === 'guardian_consent_required' ? (
                  <Button
                    label={t('sponsorship.askGuardian')}
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push({ pathname: Routes.settingsGuardian, params: { add: 'sponsorship' } })}
                    testID="sponsorship-ask-guardian"
                  />
                ) : openRequests.length > 0 ? (
                  <Button
                    label={t('sponsorship.manage')}
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push(Routes.sponsorship)}
                    testID="sponsorship-manage"
                  />
                ) : (
                  <Button
                    label={t('sponsorship.seekCta')}
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push(Routes.sponsorshipRequest)}
                    testID="sponsorship-seek"
                  />
                )}
                {openRequests.length === 0 && (mine.data?.deals.length ?? 0) > 0 ? (
                  <Button
                    label={t('sponsorship.openPortal')}
                    variant="ghost"
                    size="sm"
                    onPress={() => router.push(Routes.sponsorship)}
                  />
                ) : null}
              </View>
            </LinearGradient>
          </View>
        </Reveal>
      ) : null}

      <View>
        <SectionHeader title={t('sponsorship.callsTitle')} />
        {calls.loading && !calls.data ? (
          <SkeletonList count={2} variant="card" />
        ) : calls.error && !calls.data ? (
          <ErrorState message={calls.error} onRetry={calls.reload} compact />
        ) : (calls.data ?? []).length === 0 ? (
          <EmptyState
            compact
            icon={<Megaphone size={24} color={colors.textMuted} />}
            title={t('sponsorship.callsEmpty')}
            body={t('sponsorship.callsEmptyBody')}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {(calls.data ?? []).map((call, i) => (
              <Reveal key={call.call_id} index={i}>
                <CallCard
                  call={call}
                  onApply={isAthlete && gate === 'ok' ? setApplyTo : undefined}
                  onOpenSponsor={openProfile}
                />
              </Reveal>
            ))}
            {!isAthlete ? (
              <Text variant="caption" tone="muted">
                {t('sponsorship.athletesOnly')}
              </Text>
            ) : gate === 'guardian_consent_required' ? (
              <InfoNote tone="warning" icon="warning">
                {t('sponsorship.guardianBody')}
              </InfoNote>
            ) : null}
          </View>
        )}
      </View>

      <View>
        <SectionHeader title={t('sponsorship.sponsorsTitle')} />
        {sponsors.loading && !sponsors.data ? (
          <SkeletonList count={3} variant="row" />
        ) : sponsors.error && !sponsors.data ? (
          <ErrorState message={sponsors.error} onRetry={sponsors.reload} compact />
        ) : (sponsors.data ?? []).length === 0 ? (
          <EmptyState compact title={t('sponsorship.sponsorsEmpty')} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {(sponsors.data ?? []).map((sponsor) => (
              <SponsorRow key={sponsor.user_id} sponsor={sponsor} onPress={openProfile} />
            ))}
          </View>
        )}
      </View>

      <ApplySheet
        target={applyTo ? { callId: applyTo.call_id, name: applyTo.company_name || displayName(applyTo.sponsor_name) } : null}
        onClose={() => setApplyTo(null)}
        onSent={() => {
          setApplyTo(null);
          calls.reload();
        }}
      />
    </ScrollView>
  );
}

function SponsorRow({ sponsor, onPress }: { sponsor: SponsorListing; onPress: (id: string) => void }) {
  const { colors, spacing } = useTheme();
  const t = useT();
  const brand = sponsor.company_name || displayName(sponsor.full_name);
  return (
    <Card
      onPress={() => onPress(sponsor.user_id)}
      padded="sm"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      testID={`sponsor-row-${sponsor.user_id}`}
    >
      <Avatar uri={sponsor.avatar_url} name={brand} size="md" />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {brand}
          </Text>
          {sponsor.is_verified ? <BadgeCheck size={15} color={colors.info} /> : null}
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {metaLine(
            sponsor.industry,
            sponsor.open_calls > 0 ? t('sponsorship.openCallsCount', { n: sponsor.open_calls }) : null,
          )}
        </Text>
        <TagRow group="offer" tags={sponsor.offers.slice(0, 3)} />
      </View>
    </Card>
  );
}
