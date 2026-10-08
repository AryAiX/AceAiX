import React from 'react';
import { View } from 'react-native';
import { CalendarDays, MapPin } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Badge, Button, Card, Text } from '@/components/ui';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import type { Seeker } from '@/lib/api.sponsorship';
import { displayName, fullDate, metaLine } from '@/lib/format';
import { amountLabel, statusTone } from '@/lib/sponsorship';
import { TagRow } from './Tags';

interface Props {
  seeker: Seeker;
  /** Absent for an unverified sponsor: they can look, not offer. */
  onOffer?: (seeker: Seeker) => void;
  onOpenProfile: (userId: string) => void;
}

/** An athlete's request, as a sponsor reads it. */
export function SeekerCard({ seeker, onOffer, onOpenProfile }: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const name = displayName(seeker.full_name);
  const amount = amountLabel(seeker.amount, seeker.currency);

  return (
    <Card padded level={1} style={{ gap: spacing.md }} testID={`seeker-${seeker.request_id}`}>
      <Card
        level={0}
        padded={false}
        onPress={() => onOpenProfile(seeker.athlete_user_id)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      >
        <Avatar uri={seeker.avatar_url} name={name} size="md" score={seeker.talent_score} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {metaLine(sportLabel(t, seeker.sport), positionLabel(t, seeker.athlete_position), seeker.country)}
          </Text>
        </View>
        {seeker.is_minor ? <Badge label={t('common.under18')} tone="info" /> : null}
      </Card>

      <View style={{ gap: 4 }}>
        <Text variant="subheading">{seeker.title}</Text>
        {seeker.event_name || seeker.event_date || seeker.location ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {seeker.event_name || seeker.event_date ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <CalendarDays size={13} color={colors.textMuted} />
                <Text variant="caption" tone="muted">
                  {metaLine(seeker.event_name, seeker.event_date ? fullDate(seeker.event_date) : null)}
                </Text>
              </View>
            ) : null}
            {seeker.location ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} color={colors.textMuted} />
                <Text variant="caption" tone="muted">
                  {seeker.location}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {seeker.pitch ? (
          <Text variant="body" tone="secondary" numberOfLines={4}>
            {seeker.pitch}
          </Text>
        ) : null}
      </View>

      <TagRow group="need" tags={seeker.needs} label={t('sponsorship.needsLabel')} />
      <TagRow group="give" tags={seeker.gives} label={t('sponsorship.givesLabel')} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text variant="bodyStrong" tone={amount ? 'success' : 'muted'} style={{ flex: 1 }}>
          {amount ? t('sponsorship.asksFor', { amount }) : t('sponsorship.amountHidden')}
        </Text>
        {seeker.my_offer_status ? (
          <Badge
            label={
              seeker.my_offer_status === 'pending'
                ? t('sponsorship.offerSent')
                : t(`sponsorship.status.${seeker.my_offer_status}`)
            }
            tone={statusTone(seeker.my_offer_status)}
            size="md"
          />
        ) : null}
        {onOffer && seeker.my_offer_status !== 'pending' && seeker.my_offer_status !== 'accepted' ? (
          <Button
            label={t('sponsorship.makeOffer')}
            size="sm"
            onPress={() => onOffer(seeker)}
            testID={`offer-${seeker.request_id}`}
          />
        ) : null}
      </View>

      {seeker.is_minor ? (
        <Text variant="caption" tone="muted">
          {t('sponsorship.under18Note')}
        </Text>
      ) : null}
    </Card>
  );
}
