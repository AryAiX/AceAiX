import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck, CalendarDays, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Card, EmptyState, ErrorState, SkeletonList, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getBookableCoaches, type BookableCoach } from '@/lib/api.coaching';
import { whenLabel } from '@/lib/coaching';
import { displayName, metaLine } from '@/lib/format';
import { currentLanguage } from '@/lib/i18n-bridge';
import { Routes } from '@/lib/routes';
import { amountLabel } from '@/lib/sponsorship';

/**
 * Coaches who are taking students, soonest free time first. A minor is only
 * ever handed coaches they could book (the database filters to verified ones).
 */
export function BookableCoaches({ query }: { query: string }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const coaches = useAsync(() => getBookableCoaches(query), [query], { refetchOnFocus: true });

  if (coaches.error && !coaches.data) return <ErrorState message={coaches.error} onRetry={coaches.reload} />;
  if (coaches.loading && !coaches.data) {
    return (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <SkeletonList count={3} variant="row" />
      </View>
    );
  }

  return (
    <FlatList<BookableCoach>
      style={{ flex: 1 }}
      data={coaches.data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.giant, gap: spacing.sm }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={coaches.refreshing}
          onRefresh={coaches.refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListHeaderComponent={
        <Button
          label={t('coaching.myBookings')}
          variant="secondary"
          size="sm"
          icon={<CalendarDays size={15} color={colors.text} />}
          onPress={() => router.push(Routes.coaching)}
          style={{ alignSelf: 'flex-start', marginBottom: spacing.sm }}
          testID="open-my-sessions"
        />
      }
      renderItem={({ item }) => <BookableCoachRow coach={item} />}
      ListEmptyComponent={
        <EmptyState icon={<Users size={26} color={colors.textMuted} />} title={t('coaching.noBookableCoaches')} />
      }
      testID="bookable-coaches"
    />
  );
}

function BookableCoachRow({ coach }: { coach: BookableCoach }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const name = displayName(coach.full_name);
  const price = coach.price_from != null ? amountLabel(coach.price_from, coach.currency) : null;

  return (
    <Card
      onPress={() => router.push(Routes.coachBooking(coach.id))}
      padded="sm"
      style={{ gap: spacing.sm }}
      testID={`bookable-coach-${coach.id}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar uri={coach.avatar_url} name={name} size="md" />
        <View style={{ flex: 1, gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
              {name}
            </Text>
            {coach.is_verified ? <BadgeCheck size={15} color={colors.info} /> : null}
          </View>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {metaLine(coach.specialty, [coach.city, coach.country].filter(Boolean).join(', '))}
          </Text>
        </View>
        {price ? (
          <Text variant="captionStrong" tone="success">
            {t('coaching.priceFrom', { amount: price })}
          </Text>
        ) : null}
      </View>
      {coach.headline ? (
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {coach.headline}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
          {coach.kinds.map((k) => t(`coaching.kind.${k}`)).join(' · ')}
        </Text>
        <Text variant="captionStrong" tone={coach.next_slot ? 'primary' : 'muted'}>
          {coach.next_slot
            ? t('coaching.nextFree', { date: whenLabel(coach.next_slot, currentLanguage()) })
            : t('coaching.noTimes')}
        </Text>
      </View>
    </Card>
  );
}
