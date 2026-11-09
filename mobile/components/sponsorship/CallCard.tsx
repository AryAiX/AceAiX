import React from 'react';
import { Pressable, View } from 'react-native';
import { BadgeCheck, Bookmark } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Badge, Button, Card, ExpandableText, Text } from '@/components/ui';
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
  /** The bookmark in the corner. Calls are saved on this phone. */
  saved?: boolean;
  onToggleSave?: (call: CallFeedItem) => void;
}

/**
 * A sponsor's call, as an athlete reads it. Calls only come from verified
 * sponsors. Who, then what, then a footer with the money, the deadline and
 * the one action.
 */
export function CallCard({ call, onApply, onOpenSponsor, saved, onToggleSave }: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const brand = call.company_name || displayName(call.sponsor_name);
  const range = rangeLabel(call.amount_min, call.amount_max, call.currency);
  const canApply =
    !!onApply && (!call.my_status || call.my_status === 'withdrawn' || call.my_status === 'declined');

  return (
    <Card padded style={{ gap: spacing.md }} testID={`sponsor-call-${call.call_id}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          onPress={() => onOpenSponsor(call.sponsor_user_id)}
          accessibilityRole="button"
          accessibilityLabel={brand}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            flex: 1,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Avatar uri={call.sponsor_avatar} name={brand} size="sm" />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {brand}
              </Text>
              <BadgeCheck size={14} color={colors.info} />
            </View>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {metaLine(
                call.industry,
                call.sport ? sportLabel(t, call.sport) : t('sponsorship.anySport'),
                t('sponsorship.spots', { n: call.slots }),
              )}
            </Text>
          </View>
        </Pressable>
        {onToggleSave ? (
          <Pressable
            onPress={() => onToggleSave(call)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityState={{ selected: !!saved }}
            accessibilityLabel={saved ? t('feed.removeFromSaved') : t('common.save')}
            testID={`save-call-${call.call_id}`}
            style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.5 : 1 })}
          >
            <Bookmark
              size={21}
              color={saved ? colors.primary : colors.textMuted}
              fill={saved ? colors.primary : 'transparent'}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: 4 }}>
        <Text variant="subheading">{call.title}</Text>
        {call.description ? (
          <ExpandableText text={call.description} lines={2} variant="caption" tone="secondary" />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        <TagRow group="offer" tags={call.offers} max={2} />
        {call.open_to_minors ? <Badge label={t('sponsorship.juniorsWelcome')} tone="info" /> : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          {range ? (
            <Text variant="bodyStrong" tone="success" numberOfLines={1}>
              {range}
            </Text>
          ) : null}
          {call.deadline ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {t('sponsorship.deadline', { date: fullDate(call.deadline) })}
            </Text>
          ) : null}
        </View>
        {call.my_status ? (
          <Badge
            label={
              call.my_status === 'pending' ? t('sponsorship.applied') : t(`sponsorship.status.${call.my_status}`)
            }
            tone={statusTone(call.my_status)}
            size="md"
          />
        ) : null}
        {canApply ? (
          <Button
            label={t('sponsorship.apply')}
            size="sm"
            variant="warm"
            onPress={() => onApply?.(call)}
            testID={`apply-call-${call.call_id}`}
          />
        ) : null}
      </View>
    </Card>
  );
}
