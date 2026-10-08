import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck, ChevronRight, ExternalLink, Handshake } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, Text } from '@/components/ui';
import { sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getSponsorshipCard, type SponsorshipCard as CardData, type SponsorshipRequest } from '@/lib/api.sponsorship';
import { fullDate, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { amountLabel, statusTone } from '@/lib/sponsorship';
import { useAuth } from '@/providers/AuthProvider';
import { ApplySheet, OfferSheet } from './Sheets';
import { TagRow } from './Tags';

/**
 * Sponsorship on a profile.
 *
 * On an athlete's: that they are looking, and for what — with an offer button
 * for a verified sponsor. On a sponsor's: the brand and its open calls. The
 * database decides what each viewer may see (`sponsorship_card`); when it
 * returns nothing, nothing is drawn.
 */
export function SponsorshipProfileCard({
  userId,
  displayName,
  refreshKey,
}: {
  userId: string;
  displayName: string;
  refreshKey?: number;
}) {
  const { isAthlete } = useAuth();
  const card = useAsync(() => getSponsorshipCard(userId), [userId, refreshKey], { refetchOnFocus: true });
  const data = card.data;
  if (!data) return null;
  if (data.kind === 'sponsor') {
    return <SponsorCard data={data} displayName={displayName} canApply={isAthlete} onChanged={card.reload} />;
  }
  return <SeekingCard data={data} displayName={displayName} onChanged={card.reload} />;
}

function SeekingCard({
  data,
  displayName,
  onChanged,
}: {
  data: Extract<CardData, { kind: 'athlete' }>;
  displayName: string;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const [offerOn, setOfferOn] = useState<SponsorshipRequest | null>(null);

  /* On someone else's profile an athlete who is not looking shows nothing. */
  if (data.requests.length === 0 && !data.is_self) return null;

  if (data.requests.length === 0) {
    return (
      <Card
        padded
        level={1}
        onPress={() => router.push(Routes.sponsorship)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        testID="sponsorship-card"
      >
        <Handshake size={22} color={colors.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subheading">{t('sponsorship.title')}</Text>
          <Text variant="caption" tone="muted">
            {t('sponsorship.cardNotSeeking')}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </Card>
    );
  }

  return (
    <Card
      padded
      level={1}
      onPress={data.is_self ? () => router.push(Routes.sponsorship) : undefined}
      style={{ gap: spacing.md }}
      testID="sponsorship-card"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Handshake size={20} color={colors.primary} />
        <Text variant="subheading" style={{ flex: 1 }}>
          {t('sponsorship.cardSeeking')}
        </Text>
        {data.is_self ? <ChevronRight size={18} color={colors.textMuted} /> : null}
      </View>

      {data.requests.map((request) => {
        const amount = amountLabel(request.amount, request.currency);
        return (
          <View key={request.id} style={{ gap: spacing.xs }}>
            <Text variant="bodyStrong">{request.title}</Text>
            <Text variant="caption" tone="muted">
              {metaLine(
                request.event_name,
                request.event_date ? fullDate(request.event_date) : null,
                request.location,
                amount,
              )}
            </Text>
            <TagRow group="need" tags={request.needs} />
            {request.my_offer_status ? (
              <Badge
                label={
                  request.my_offer_status === 'pending'
                    ? t('sponsorship.offerSent')
                    : t(`sponsorship.status.${request.my_offer_status}`)
                }
                tone={statusTone(request.my_offer_status)}
                style={{ alignSelf: 'flex-start' }}
              />
            ) : null}
            {data.can_offer && request.my_offer_status !== 'pending' && request.my_offer_status !== 'accepted' ? (
              <Button
                label={t('sponsorship.makeOffer')}
                size="sm"
                onPress={() => setOfferOn(request)}
                style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
                testID={`profile-offer-${request.id}`}
              />
            ) : null}
          </View>
        );
      })}

      <OfferSheet
        target={
          offerOn
            ? { requestId: offerOn.id, name: displayName, currency: offerOn.currency, amount: offerOn.amount }
            : null
        }
        onClose={() => setOfferOn(null)}
        onSent={() => {
          setOfferOn(null);
          onChanged();
        }}
      />
    </Card>
  );
}

function SponsorCard({
  data,
  displayName,
  canApply,
  onChanged,
}: {
  data: Extract<CardData, { kind: 'sponsor' }>;
  displayName: string;
  canApply: boolean;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const [applyTo, setApplyTo] = useState<{ callId: string; name: string } | null>(null);
  const brand = data.profile;
  const name = brand?.company_name || displayName;

  return (
    <Card padded level={1} style={{ gap: spacing.md }} testID="sponsor-card">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Handshake size={20} color={colors.primary} />
        <Text variant="subheading" style={{ flex: 1 }} numberOfLines={1}>
          {name}
        </Text>
        {data.is_verified ? <BadgeCheck size={18} color={colors.info} /> : null}
      </View>
      <Text variant="caption" tone="muted">
        {metaLine(t('sponsorship.cardSponsor'), brand?.industry)}
      </Text>
      {brand?.about ? (
        <Text variant="body" tone="secondary">
          {brand.about}
        </Text>
      ) : null}
      <TagRow group="offer" tags={brand?.offers ?? []} />
      {brand?.sports?.length ? (
        <Text variant="caption" tone="muted">
          {`${t('sponsorship.backs')}: ${brand.sports.map((s) => sportLabel(t, s)).join(', ')}`}
        </Text>
      ) : null}
      {brand?.website ? (
        <Button
          label={t('sponsorship.visitWebsite')}
          variant="secondary"
          size="sm"
          icon={<ExternalLink size={15} color={colors.text} />}
          onPress={() => Linking.openURL(brand.website as string).catch(() => {})}
          style={{ alignSelf: 'flex-start' }}
        />
      ) : null}

      {data.calls.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('sponsorship.callsTitle')}
          </Text>
          {data.calls.map((call) => (
            <View key={call.call_id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {call.title}
                </Text>
                <Text variant="caption" tone="muted">
                  {metaLine(
                    call.sport ? sportLabel(t, call.sport) : t('sponsorship.anySport'),
                    call.deadline ? t('sponsorship.deadline', { date: fullDate(call.deadline) }) : null,
                  )}
                </Text>
              </View>
              {call.my_status ? (
                <Badge
                  label={call.my_status === 'pending' ? t('sponsorship.applied') : t(`sponsorship.status.${call.my_status}`)}
                  tone={statusTone(call.my_status)}
                />
              ) : canApply ? (
                <Button
                  label={t('sponsorship.apply')}
                  size="sm"
                  onPress={() => setApplyTo({ callId: call.call_id, name })}
                  testID={`profile-apply-${call.call_id}`}
                />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <ApplySheet
        target={applyTo}
        onClose={() => setApplyTo(null)}
        onSent={() => {
          setApplyTo(null);
          onChanged();
        }}
      />
    </Card>
  );
}
