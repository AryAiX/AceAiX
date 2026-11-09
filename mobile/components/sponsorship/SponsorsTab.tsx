import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck, Handshake, Megaphone } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Button,
  Card,
  ChevronForward,
  EmptyState,
  ErrorState,
  Reveal,
  SectionHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useTabReselect } from '@/hooks/useTabReselect';
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
import { offerPlaybooks, removeFromAllPlaybooks } from '@/lib/playbooks';
import { toggleSavedCall, useSavedCalls } from '@/lib/savedCalls';
import { useAuth } from '@/providers/AuthProvider';
import { CallCard } from './CallCard';
import { ApplySheet } from './Sheets';
import { groupedRowStyle } from '@/components/discover/groupedRow';
import { useEndPadding } from '@/components/navigation/dockInset';

/**
 * Discover → Sponsors, for everyone who is not a sponsor.
 *
 * Three things, top to bottom: where I stand (an athlete's own request, or the
 * way to make one), the calls verified sponsors have open, and the sponsors
 * themselves. `query` comes from the search bar above the tabs.
 */
export function SponsorsTab({ query }: { query: string }) {
  const endPad = useEndPadding();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const { isAthlete, user } = useAuth();
  const savedCalls = useSavedCalls(user?.id);
  const savedIds = useMemo(() => new Set(savedCalls.map((c) => c.id)), [savedCalls]);

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

  /* Tap Discover while on Sponsors: back to the top and a quiet reload. */
  const scrollRef = useTabReselect(() => {
    mine.reload();
    calls.reload();
    sponsors.reload();
  });

  const toggleSave = useCallback(
    async (call: CallFeedItem) => {
      if (!user) return;
      const nowSaved = await toggleSavedCall(user.id, call);
      if (nowSaved) {
        offerPlaybooks({
          kind: 'call',
          id: call.call_id,
          title: call.company_name || displayName(call.sponsor_name),
          subtitle: call.title,
          thumb: call.sponsor_avatar,
        });
      } else {
        void removeFromAllPlaybooks(user.id, 'call', call.call_id);
      }
    },
    [user],
  );

  const openProfile = useCallback((id: string) => router.push(Routes.profile(id)), [router]);
  const openRequests = useMemo(
    () => (mine.data?.requests ?? []).filter((r) => r.status === 'open'),
    [mine.data],
  );
  const gate = mine.data?.gate ?? 'ok';

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: endPad, gap: spacing.xl }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
      testID="sponsors-tab"
    >
      {isAthlete ? (
        <Reveal>
          {/* Where I stand, as one quiet row: tap it to ask, to manage what is
              open, or to bring in a guardian first. */}
          <Card
            padded="sm"
            onPress={() =>
              gate === 'guardian_consent_required'
                ? router.push({ pathname: Routes.settingsGuardian, params: { add: 'sponsorship' } })
                : openRequests.length > 0
                  ? router.push(Routes.sponsorship)
                  : router.push(Routes.sponsorshipRequest)
            }
            accessibilityLabel={
              gate === 'guardian_consent_required'
                ? t('sponsorship.askGuardian')
                : openRequests.length > 0
                  ? t('sponsorship.manage')
                  : t('sponsorship.seekCta')
            }
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            testID={
              gate === 'guardian_consent_required'
                ? 'sponsorship-ask-guardian'
                : openRequests.length > 0
                  ? 'sponsorship-manage'
                  : 'sponsorship-seek'
            }
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primarySoft,
              }}
            >
              <Handshake size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {openRequests.length > 0 ? t('sponsorship.seekingNow') : t('sponsorship.seekTitle')}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={2}>
                {openRequests.length > 0
                  ? openRequests.map((r) => r.title).join(' · ')
                  : gate === 'guardian_consent_required'
                    ? t('sponsorship.guardianBody')
                    : t('sponsorship.seekBody')}
              </Text>
            </View>
            <ChevronForward size={18} color={colors.textMuted} />
          </Card>
          {openRequests.length === 0 && (mine.data?.deals.length ?? 0) > 0 ? (
            <Button
              label={t('sponsorship.openPortal')}
              variant="ghost"
              size="sm"
              onPress={() => router.push(Routes.sponsorship)}
              style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
            />
          ) : null}
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
                  saved={savedIds.has(call.call_id)}
                  onToggleSave={user ? toggleSave : undefined}
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
          <View>
            {(sponsors.data ?? []).map((sponsor, index, all) => (
              <SponsorRow
                key={sponsor.user_id}
                sponsor={sponsor}
                onPress={openProfile}
                style={groupedRowStyle(index, all.length, colors, theme.radii.xl)}
              />
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

function SponsorRow({
  sponsor,
  onPress,
  style,
}: {
  sponsor: SponsorListing;
  onPress: (id: string) => void;
  style: ViewStyle;
}) {
  const { colors, spacing } = useTheme();
  const t = useT();
  const brand = sponsor.company_name || displayName(sponsor.full_name);
  return (
    <Pressable
      onPress={() => onPress(sponsor.user_id)}
      accessibilityRole="button"
      accessibilityLabel={brand}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
      testID={`sponsor-row-${sponsor.user_id}`}
    >
      <Avatar uri={sponsor.avatar_url} name={brand} size="md" />
      <View style={{ flex: 1, gap: 2 }}>
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
      </View>
      <ChevronForward size={18} color={colors.textMuted} />
    </Pressable>
  );
}
