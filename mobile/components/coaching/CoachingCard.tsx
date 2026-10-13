import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, ChevronRight } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getCoachBookingPage, getMyCoaching } from '@/lib/api.coaching';
import { isUpcoming, whenLabel } from '@/lib/coaching';
import { currentLanguage } from '@/lib/i18n-bridge';
import { Routes } from '@/lib/routes';
import { amountLabel } from '@/lib/sponsorship';

/**
 * Coaching on a coach's profile, as a visitor sees it: whether they are taking
 * students, what they offer, the next free time, and the way to book.
 * Nothing is drawn for a coach who is not taking students.
 */
export function CoachBookingCard({ coachId, refreshKey }: { coachId: string; refreshKey?: number }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const page = useAsync(() => getCoachBookingPage(coachId), [coachId, refreshKey], { refetchOnFocus: true });
  const data = page.data;
  if (!data || !data.coach.accepting) return null;

  const next = data.slots.find((s) => s.spots_left > 0) ?? null;
  const prices = data.services.map((s) => s.price).filter((p): p is number => p != null);
  const from = prices.length > 0 ? amountLabel(Math.min(...prices), data.services[0]?.currency) : null;

  return (
    <Card padded level={1} style={{ gap: spacing.md }} testID="coach-booking-card">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <CalendarDays size={20} color={colors.primary} />
        <Text variant="subheading" style={{ flex: 1 }}>
          {t('coaching.title')}
        </Text>
        <Badge label={t('coaching.accepting')} tone="success" size="md" />
      </View>
      {data.coach.headline ? (
        <Text variant="body" tone="secondary">
          {data.coach.headline}
        </Text>
      ) : null}
      {data.services.length > 0 ? (
        <Text variant="caption" tone="muted">
          {[
            [...new Set(data.services.map((s) => t(`coaching.kind.${s.kind}`)))].join(' · '),
            from ? t('coaching.priceFrom', { amount: from }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
      <Text variant="captionStrong" tone={next ? 'primary' : 'muted'}>
        {next ? t('coaching.nextFree', { date: whenLabel(next.starts_at, currentLanguage()) }) : t('coaching.noTimes')}
      </Text>
      <Button
        label={t('coaching.cardBook')}
        onPress={() => router.push(Routes.coachBooking(coachId))}
        testID="coach-book-button"
      />
    </Card>
  );
}

/** The same thing on the coach's own profile: status, what is coming, and the way in. */
export function MyCoachingCard({ refreshKey }: { refreshKey?: number }) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const mine = useAsync(getMyCoaching, [refreshKey], { refetchOnFocus: true });
  const data = mine.data;
  if (!data) return null;

  const now = new Date();
  const coming = data.slots
    .filter((s) => isUpcoming(s.starts_at, now))
    .reduce((n, s) => n + s.bookings.length, 0);
  const setUp = data.services.length > 0;

  return (
    <Card
      padded
      level={1}
      onPress={() => router.push(Routes.coaching)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      testID="my-coaching-card"
    >
      <CalendarDays size={22} color={colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="subheading">{t('coaching.calendarTitle')}</Text>
        <Text variant="caption" tone="muted">
          {setUp
            ? `${t(data.accepting ? 'coaching.accepting' : 'coaching.notAccepting')} · ${t('coaching.upcomingCount', { n: coming })}`
            : t('coaching.cardSetup')}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Card>
  );
}
