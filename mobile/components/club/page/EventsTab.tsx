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
import { PreviewRow } from './PreviewRow';
import { PreviewEmpty, previewPending, TabAction, useReportItems, type ClubTabProps } from './shared';

export function ClubEventsTab({ orgId, canPost, refreshKey, limit, onHasItems }: ClubTabProps) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const events = useAsync(() => getClubEvents(orgId), [orgId, refreshKey]);
  const preview = limit != null;
  const loaded = events.data;
  const rows = loaded == null ? [] : preview ? loaded.slice(0, limit) : loaded;
  const has = !preview
    ? null
    : previewPending(loaded, events.error)
      ? null
      : events.error && !loaded
        ? true
        : rows.length > 0;
  useReportItems(onHasItems, has);

  const add = !preview && canPost ? (
    <TabAction
      label={t('club.events.add')}
      onPress={() => router.push(Routes.clubEventEdit(orgId))}
      testID="club-add-event"
    />
  ) : null;

  if (preview && events.error && !loaded) return <ErrorState message={events.error} onRetry={events.reload} compact />;
  if (preview && has === false) return <PreviewEmpty title={t('club.events.emptyTitle')} />;
  if (preview && has !== true) return null;
  if (preview) {
    return (
      <PreviewRow>
        {rows.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </PreviewRow>
    );
  }
  if (events.loading) return <SkeletonList count={2} />;
  if (events.error) return <ErrorState message={events.error} onRetry={events.reload} compact />;

  const upcoming = rows.filter((e) => e.is_upcoming);
  const past = rows.filter((e) => !e.is_upcoming);

  if (!preview && rows.length === 0) {
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
