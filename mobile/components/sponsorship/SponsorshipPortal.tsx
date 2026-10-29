import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, Building2, Handshake, Plus, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ExpandableText,
  Header,
  Reveal,
  Screen,
  SectionHeader,
  SegmentedControl,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { DealRow } from '@/components/sponsorship/DealRow';
import { TagRow } from '@/components/sponsorship/Tags';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import {
  getMySponsorship,
  setSponsorCallActive,
  setSponsorshipRequestStatus,
  type MySponsorship,
} from '@/lib/api.sponsorship';
import { errorMessage } from '@/lib/errors';
import { fullDate, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { amountLabel, formatLocation, rangeLabel, statusTone, type RequestStatus } from '@/lib/sponsorship';

/** The raw `?section=` value. Each role reads only the values it understands. */
function sectionParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The sponsorship portal.
 *
 * One screen for three readers. An athlete switches between their requests
 * and the offers on them. A sponsor switches between their calls and the
 * applications to them. A guardian sees what has been offered to, or sent
 * by, their children, with no switch. Whatever is waiting for an answer
 * sits at the top of Sent and answered.
 *
 * `?section=deals` opens Sent and answered. Any other value opens My
 * requests for an athlete and My calls for a sponsor.
 *
 * The stack screen at `/sponsorship` shows a back button. The sponsor tab
 * does not: it is a destination, not a page you leave.
 */
export function SponsorshipPortal({ back = true }: { back?: boolean }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();

  const params = useLocalSearchParams<{ section?: string }>();
  const state = useAsync(getMySponsorship, [], { refetchOnFocus: true });
  const data = state.data;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | undefined>(() => sectionParam(params.section));

  useEffect(() => {
    if (params.section) setPicked(sectionParam(params.section));
  }, [params.section]);

  const waiting = useMemo(() => (data?.deals ?? []).filter((d) => d.can_respond), [data]);
  const others = useMemo(() => (data?.deals ?? []).filter((d) => !d.can_respond), [data]);

  const run = useCallback(
    async (id: string, work: () => Promise<void>) => {
      setBusyId(id);
      try {
        await work();
        await state.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setBusyId(null);
      }
    },
    [state, toast],
  );

  const header = <Header title={t('sponsorship.portal')} back={back} />;

  if (state.loading && !data) {
    return (
      <Screen header={header} testID="sponsorship-portal">
        <SkeletonList count={3} variant="card" />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen header={header} testID="sponsorship-portal">
        <ErrorState message={state.error ?? t('common.somethingWentWrong')} onRetry={state.reload} />
      </Screen>
    );
  }

  const isAthlete = data.role === 'athlete';
  const isSponsor = data.role === 'sponsor';
  const isGuardian = data.role === 'guardian';
  // Anything other than `deals` is the first segment: My calls, or My requests.
  const sponsorSection = picked === 'deals' ? 'deals' : 'calls';
  const athleteSection = picked === 'deals' ? 'deals' : 'requests';
  const showCalls = isSponsor && sponsorSection === 'calls';
  const showRequests = isAthlete && athleteSection === 'requests';
  const showDeals = isAthlete ? athleteSection === 'deals' : isSponsor ? sponsorSection === 'deals' : true;

  if (!isAthlete && !isSponsor && data.deals.length === 0) {
    return (
      <Screen header={header} testID="sponsorship-portal">
        <EmptyState
          icon={<Handshake size={28} color={colors.textMuted} />}
          title={isGuardian ? t('sponsorship.noDeals') : t('sponsorship.otherRoleTitle')}
          body={isGuardian ? t('sponsorship.guardianIntro') : t('sponsorship.otherRoleBody')}
          actionLabel={t('sponsorship.tabSponsors')}
          onAction={() => router.push({ pathname: Routes.discover, params: { view: 'sponsors' } })}
        />
      </Screen>
    );
  }

  return (
    <Screen header={header} onRefresh={state.refresh} refreshing={state.refreshing} testID="sponsorship-portal">
      <View style={{ gap: spacing.xl }}>
        {isGuardian ? (
          <Text variant="body" tone="secondary">
            {t('sponsorship.guardianIntro')}
          </Text>
        ) : null}

        {data.gate === 'sponsor_not_verified' ? (
          <InfoNote
            tone="warning"
            icon="warning"
            actionLabel={t('sponsorship.requestVerification')}
            onAction={() => router.push(Routes.settingsAccount)}
          >
            {`${t('sponsorship.notVerifiedTitle')}. ${t('sponsorship.notVerifiedBody')}`}
          </InfoNote>
        ) : null}

        {isSponsor ? (
          <SegmentedControl<'calls' | 'deals'>
            testID="sponsorship-section"
            value={sponsorSection}
            onChange={setPicked}
            options={[
              { value: 'calls', label: t('sponsorship.myCalls') },
              { value: 'deals', label: t('sponsorship.dealsOther') },
            ]}
          />
        ) : null}

        {isAthlete ? (
          <SegmentedControl<'requests' | 'deals'>
            testID="sponsorship-section"
            value={athleteSection}
            onChange={setPicked}
            options={[
              { value: 'requests', label: t('sponsorship.myRequests') },
              { value: 'deals', label: t('sponsorship.dealsOther') },
            ]}
          />
        ) : null}

        {showRequests && data.gate === 'guardian_consent_required' ? (
          <InfoNote
            tone="warning"
            icon="warning"
            actionLabel={t('sponsorship.askGuardian')}
            onAction={() => router.push({ pathname: Routes.settingsGuardian, params: { add: 'sponsorship' } })}
          >
            {`${t('sponsorship.guardianTitle')}. ${t('sponsorship.guardianBody')}`}
          </InfoNote>
        ) : null}

        {waiting.length > 0 && showDeals ? (
          <View>
            <SectionHeader title={t('sponsorship.dealsWaiting')} />
            <View style={{ gap: spacing.md }}>
              {waiting.map((deal, i) => (
                <Reveal key={deal.id} index={i}>
                  <DealRow deal={deal} onChanged={state.refresh} />
                </Reveal>
              ))}
            </View>
          </View>
        ) : null}

        {showRequests ? (
          <View>
            <SectionHeader
              title={t('sponsorship.myRequests')}
              action={data.gate === 'ok' ? t('sponsorship.newRequest') : undefined}
              onAction={data.gate === 'ok' ? () => router.push(Routes.sponsorshipRequest) : undefined}
            />
            {data.requests.length === 0 ? (
              <EmptyState
                compact
                title={t('sponsorship.noRequests')}
                body={t('sponsorship.seekBody')}
                actionLabel={data.gate === 'ok' ? t('sponsorship.seekCta') : undefined}
                onAction={data.gate === 'ok' ? () => router.push(Routes.sponsorshipRequest) : undefined}
              />
            ) : (
              <View style={{ gap: spacing.md }}>
                {data.requests.map((request) => {
                  const amount = amountLabel(request.amount, request.currency);
                  const set = (status: RequestStatus) =>
                    run(request.id, () => setSponsorshipRequestStatus(request.id, status));
                  return (
                    <Card key={request.id} padded level={1} style={{ gap: spacing.sm }} testID={`request-${request.id}`}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                        <Text variant="subheading" style={{ flex: 1 }}>
                          {request.title}
                        </Text>
                        <Badge
                          label={t(`sponsorship.status.${request.status}`)}
                          tone={statusTone(request.status)}
                          size="md"
                        />
                      </View>
                      <Text variant="caption" tone="muted">
                        {metaLine(
                          request.event_name,
                          request.event_date ? fullDate(request.event_date) : null,
                          formatLocation(request.location, t),
                          amount,
                        )}
                      </Text>
                      {request.pitch ? (
                        <ExpandableText text={request.pitch} lines={3} variant="body" tone="secondary" />
                      ) : null}
                      <TagRow group="need" tags={request.needs} otherText={request.needs_other} />
                      {request.pending_offers > 0 ? (
                        <Text variant="captionStrong" tone="primary">
                          {t('sponsorship.pendingOffers', { n: request.pending_offers })}
                        </Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
                        {request.status === 'open' ? (
                          <>
                            <Button
                              label={t('sponsorship.edit')}
                              variant="secondary"
                              size="sm"
                              onPress={() =>
                                router.push({ pathname: Routes.sponsorshipRequest, params: { id: request.id } })
                              }
                            />
                            <Button
                              label={t('sponsorship.markFunded')}
                              variant="secondary"
                              size="sm"
                              loading={busyId === request.id}
                              onPress={() => set('funded')}
                              testID={`request-funded-${request.id}`}
                            />
                            <Button
                              label={t('sponsorship.closeRequest')}
                              variant="ghost"
                              size="sm"
                              disabled={busyId === request.id}
                              onPress={() => set('closed')}
                            />
                          </>
                        ) : (
                          <Button
                            label={t('sponsorship.reopen')}
                            variant="secondary"
                            size="sm"
                            loading={busyId === request.id}
                            onPress={() => set('open')}
                          />
                        )}
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {showCalls ? (
          <View>
            <SectionHeader
              title={t('sponsorship.myCalls')}
              action={data.gate === 'ok' ? t('sponsorship.newCall') : undefined}
              onAction={data.gate === 'ok' ? () => router.push(Routes.sponsorshipCall) : undefined}
            />
            {data.calls.length === 0 ? (
              <EmptyState
                compact
                title={t('sponsorship.noCalls')}
                actionLabel={data.gate === 'ok' ? t('sponsorship.newCall') : undefined}
                onAction={data.gate === 'ok' ? () => router.push(Routes.sponsorshipCall) : undefined}
              />
            ) : (
              <View style={{ gap: spacing.md }}>
                {data.calls.map((call) => (
                  <Card key={call.id} padded level={1} style={{ gap: spacing.sm }} testID={`call-${call.id}`}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                      <Text variant="subheading" style={{ flex: 1 }}>
                        {call.title}
                      </Text>
                      <Badge
                        label={t(call.is_active ? 'sponsorship.status.open' : 'sponsorship.status.closed')}
                        tone={call.is_active ? 'info' : 'neutral'}
                        size="md"
                      />
                    </View>
                    <Text variant="caption" tone="muted">
                      {metaLine(
                        rangeLabel(call.amount_min, call.amount_max, call.currency),
                        t('sponsorship.spots', { n: call.slots }),
                        call.deadline ? t('sponsorship.deadline', { date: fullDate(call.deadline) }) : null,
                      )}
                    </Text>
                    {call.description ? (
                      <ExpandableText text={call.description} lines={3} variant="body" tone="secondary" />
                    ) : null}
                    <TagRow group="offer" tags={call.offers} />
                    {call.pending_applications > 0 ? (
                      <Text variant="captionStrong" tone="primary">
                        {t('sponsorship.pendingApplications', { n: call.pending_applications })}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                      <Button
                        label={t('sponsorship.edit')}
                        variant="secondary"
                        size="sm"
                        onPress={() => router.push({ pathname: Routes.sponsorshipCall, params: { id: call.id } })}
                      />
                      <Button
                        label={call.is_active ? t('sponsorship.closeCall') : t('sponsorship.reopen')}
                        variant="ghost"
                        size="sm"
                        loading={busyId === call.id}
                        onPress={() => run(call.id, () => setSponsorCallActive(call.id, !call.is_active))}
                        testID={`call-toggle-${call.id}`}
                      />
                    </View>
                  </Card>
                ))}
              </View>
            )}
            <Button
              label={t('sponsorship.findAthletes')}
              variant="secondary"
              fullWidth
              icon={<Search size={16} color={colors.text} />}
              onPress={() => router.push(Routes.discover)}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : null}

        {showDeals ? (
        <View>
          <SectionHeader title={t('sponsorship.dealsOther')} />
          {others.length === 0 ? (
            <EmptyState compact title={t('sponsorship.noDeals')} />
          ) : (
            <View style={{ gap: spacing.md }}>
              {others.map((deal) => (
                <DealRow key={deal.id} deal={deal} onChanged={state.refresh} />
              ))}
            </View>
          )}
        </View>
        ) : null}

        <Text variant="caption" tone="muted" align="center">
          {t('sponsorship.noMoneyNote')}
        </Text>

        {showRequests && data.gate === 'ok' ? (
          <Button
            label={t('sponsorship.newRequest')}
            fullWidth
            icon={<Plus size={18} color={colors.textOnBrand} />}
            onPress={() => router.push(Routes.sponsorshipRequest)}
            testID="portal-new-request"
          />
        ) : null}
      </View>
    </Screen>
  );
}

/** The sponsor's brand card, loaded for their own profile. */
export function MyBrandCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const state = useAsync(() => getMySponsorship(), [refreshKey], { refetchOnFocus: true });
  if (!state.data || state.data.role !== 'sponsor') return null;
  return <BrandCard data={state.data} />;
}

function BrandCard({ data }: { data: MySponsorship }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const brand = data.profile;
  const complete = !!brand?.company_name;

  return (
    <Card
      padded
      level={1}
      tone={complete ? 'surface' : 'primarySoft'}
      onPress={() => router.push(Routes.sponsorshipBrand)}
      style={{ gap: spacing.sm }}
      testID="brand-card"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Building2 size={20} color={colors.primary} />
        <Text variant="subheading" style={{ flex: 1 }} numberOfLines={1}>
          {complete ? brand?.company_name : t('sponsorship.brandIncomplete')}
        </Text>
        {data.is_verified ? <BadgeCheck size={18} color={colors.info} /> : null}
      </View>
      <Text variant="caption" tone="muted">
        {complete ? metaLine(brand?.industry, brand?.website) : t('sponsorship.brandIncompleteBody')}
      </Text>
      {complete ? <TagRow group="offer" tags={brand?.offers ?? []} /> : null}
      <Text variant="captionStrong" tone="primary">
        {t('sponsorship.editBrand')}
      </Text>
    </Card>
  );
}
