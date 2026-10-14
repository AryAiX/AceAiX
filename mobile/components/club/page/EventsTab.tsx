import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, Reveal, SectionHeader, SkeletonList } from '@/components/ui';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { getClubEvents } from '@/lib/api.club';
import { Routes } from '@/lib/routes';
import { EventCard } from './EventCard';
import { TabAction, type ClubTabProps } from './shared';

export function ClubEventsTab({ orgId, canPost, refreshKey }: ClubTabProps) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const events = useAsync(() => getClubEvents(orgId), [orgId, refreshKey]);

  const add = canPost ? (
    <TabAction
      label={t('club.events.add')}
      onPress={() => router.push(Routes.clubEventEdit(orgId))}
      testID="club-add-event"
    />
  ) : null;

  if (events.loading) return <SkeletonList count={2} />;
  if (events.error) return <ErrorState message={events.error} onRetry={events.reload} compact />;

  const rows = events.data ?? [];
  const upcoming = rows.filter((e) => e.is_upcoming);
  const past = rows.filter((e) => !e.is_upcoming);

  if (rows.length === 0) {
    return (
      <View style={{ gap: spacing.md }}>
        {add}
        <EmptyState
          compact
          icon={<CalendarDays size={26} color={colors.textMuted} />}
          title={t('club.events.emptyTitle')}
          body={t('club.events.emptyBody')}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {add}
      {upcoming.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          {upcoming.map((e, i) => (
            <Reveal key={e.id} index={i}>
              <EventCard event={e} />
            </Reveal>
          ))}
        </View>
      ) : null}
      {past.length > 0 ? (
        <View>
          <SectionHeader title={t('club.events.past')} />
          <View style={{ gap: spacing.md }}>
            {past.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
