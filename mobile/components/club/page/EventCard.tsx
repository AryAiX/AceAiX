import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, MapPin, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { ClubEventSummary } from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import { Routes } from '@/lib/routes';
import { whenLabel } from './shared';

export function agesLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  min: number | null,
  max: number | null,
): string | null {
  if (min != null && max != null) return t('club.events.ages', { min, max });
  if (min != null) return t('club.events.agesFrom', { min });
  if (max != null) return t('club.events.agesTo', { max });
  return null;
}

function priceLabel(t: (key: string) => string, price: number | null, currency: string): string {
  if (price == null || price <= 0) return t('club.events.free');
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

/** A trial, camp or clinic: what, when, where, and whether there is room. */
export function EventCard({ event }: { event: ClubEventSummary }) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const cancelled = event.status === 'cancelled';
  const left = event.capacity != null ? Math.max(0, event.capacity - event.registration_count) : null;
  const ages = agesLabel(t, event.age_min, event.age_max);

  return (
    <Card
      level={1}
      onPress={() => router.push(Routes.clubEvent(event.id))}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${whenLabel(event.starts_at)}`}
      style={{ gap: spacing.sm, opacity: cancelled || !event.is_upcoming ? 0.7 : 1 }}
      testID={`club-event-${event.id}`}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <Badge label={clubLabel(t, 'eventKind', event.kind)} tone="primary" />
        {cancelled ? <Badge label={t('club.events.cancelled')} tone="danger" /> : null}
        {event.registered ? <Badge label={t('club.events.registered')} tone="success" /> : null}
        {event.category ? <Badge label={clubLabel(t, 'category', event.category)} /> : null}
      </View>

      <Text
        variant="subheading"
        numberOfLines={2}
        style={cancelled ? { textDecorationLine: 'line-through' } : undefined}
      >
        {event.title}
      </Text>

      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <CalendarDays size={14} color={colors.textMuted} />
          <Text variant="caption" tone="secondary">
            {whenLabel(event.starts_at)}
          </Text>
        </View>
        {event.location ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MapPin size={14} color={colors.textMuted} />
            <Text variant="caption" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
              {event.location}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
        <Text variant="captionStrong" tone="primary">
          {priceLabel(t, event.price, event.currency)}
        </Text>
        {ages ? (
          <Text variant="caption" tone="muted">
            {ages}
          </Text>
        ) : null}
        {left != null && !cancelled ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Users size={12} color={left === 0 ? colors.danger : colors.textMuted} />
            <Text variant="caption" tone={left === 0 ? 'danger' : 'muted'}>
              {left === 0 ? t('club.events.full') : t('club.events.placesLeft', { n: left })}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
