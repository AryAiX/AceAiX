import React from 'react';
import { View } from 'react-native';
import { BadgeCheck, CalendarClock, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Badge, Button, Card, Text } from '@/components/ui';
import { sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import type { CallFeedItem } from '@/lib/api.sponsorship';
import { displayName, fullDate, metaLine } from '@/lib/format';
import { rangeLabel, statusTone } from '@/lib/sponsorship';
import { TagRow } from './Tags';

interface Props {
  call: CallFeedItem;
  /** Shown only to someone who can apply. */
  onApply?: (call: CallFeedItem) => void;
  onOpenSponsor: (userId: string) => void;
}

/** A sponsor's call, as an athlete reads it. Calls only come from verified sponsors. */
export function CallCard({ call, onApply, onOpenSponsor }: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const brand = call.company_name || displayName(call.sponsor_name);
  const range = rangeLabel(call.amount_min, call.amount_max, call.currency);

  return (
    <Card padded level={1} style={{ gap: spacing.md }} testID={`sponsor-call-${call.call_id}`}>
      <Card
        level={0}
        padded={false}
        tone="surface"
        onPress={() => onOpenSponsor(call.sponsor_user_id)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <Avatar uri={call.sponsor_avatar} name={brand} size="sm" />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="captionStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
              {brand}
            </Text>
            <BadgeCheck size={14} color={colors.info} />
          </View>
          {call.industry ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {call.industry}
            </Text>
          ) : null}
        </View>
        {range ? (
          <Text variant="captionStrong" tone="success">
            {range}
          </Text>
        ) : null}
      </Card>

      <View style={{ gap: 4 }}>
        <Text variant="subheading">{call.title}</Text>
        {call.description ? (
          <Text variant="body" tone="secondary" numberOfLines={3}>
            {call.description}
          </Text>
        ) : null}
      </View>

      <TagRow group="offer" tags={call.offers} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md }}>
        <Text variant="caption" tone="muted">
          {metaLine(call.sport ? sportLabel(t, call.sport) : t('sponsorship.anySport'), call.country)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Users size={13} color={colors.textMuted} />
          <Text variant="caption" tone="muted">
            {t('sponsorship.spots', { n: call.slots })}
          </Text>
        </View>
        {call.deadline ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CalendarClock size={13} color={colors.textMuted} />
            <Text variant="caption" tone="muted">
              {t('sponsorship.deadline', { date: fullDate(call.deadline) })}
            </Text>
          </View>
        ) : null}
        {call.open_to_minors ? <Badge label={t('sponsorship.juniorsWelcome')} tone="info" /> : null}
      </View>

      {call.my_status ? (
        <Badge
          label={
            call.my_status === 'pending' ? t('sponsorship.applied') : t(`sponsorship.status.${call.my_status}`)
          }
          tone={statusTone(call.my_status)}
          size="md"
          style={{ alignSelf: 'flex-start' }}
        />
      ) : null}
      {onApply && (!call.my_status || call.my_status === 'withdrawn' || call.my_status === 'declined') ? (
        <Button
          label={t('sponsorship.apply')}
          size="sm"
          onPress={() => onApply(call)}
          style={{ alignSelf: 'flex-start' }}
          testID={`apply-call-${call.call_id}`}
        />
      ) : null}
    </Card>
  );
}
