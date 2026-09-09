import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, Plus, Search, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Header,
  Input,
  Reveal,
  Screen,
  SegmentedControl,
  SkeletonList,
  Text,
} from '@/components/ui';
import { MeetupRow } from '@/components/meetups/MeetupCard';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { SPORTS, sportLabel } from '@/constants/sports';
import { findMeetups, myMeetups, type MeetupCard } from '@/lib/api.meetups';

/**
 * Play — find people to play with, here or somewhere you are going.
 *
 * Two tabs, because there are two questions: "who is playing near me" and
 * "what have I signed up for". Searching is the default, since the second
 * question is only interesting once you have answered the first.
 *
 * The eighteen-plus rule is not implemented here. `find_meetups` returns
 * nothing to a minor and this screen renders its ordinary empty state — but a
 * minor never reaches it, because the tab is not in their tab bar.
 */

type Tab = 'find' | 'mine';
type Window = 'any' | 'today' | 'week' | 'month';

function windowRange(w: Window): { from: string | null; to: string | null } {
  if (w === 'any') return { from: null, to: null };
  const now = new Date();
  const end = new Date(now);
  if (w === 'today') end.setHours(23, 59, 59, 999);
  if (w === 'week') end.setDate(end.getDate() + 7);
  if (w === 'month') end.setMonth(end.getMonth() + 1);
  return { from: now.toISOString(), to: end.toISOString() };
}

export default function MeetupsScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();

  const [tab, setTab] = useState<Tab>('find');
  const [place, setPlace] = useState('');
  const [sport, setSport] = useState<string | null>(null);
  const [when, setWhen] = useState<Window>('any');

  /* The typed place is not a dependency of the query — searching on every
     keystroke would fire a request per letter. The submit handler reloads. */
  const [applied, setApplied] = useState('');

  const range = useMemo(() => windowRange(when), [when]);

  const found = useAsync<MeetupCard[]>(
    () => findMeetups({ place: applied || null, sport, from: range.from, to: range.to }),
    [applied, sport, range.from, range.to],
    { enabled: tab === 'find', refetchOnFocus: true },
  );

  const mine = useAsync(() => myMeetups(false), [], {
    enabled: tab === 'mine',
    refetchOnFocus: true,
  });

  const tabs = useMemo(
    () => [
      { value: 'find' as Tab, label: t('meetups.title') },
      { value: 'mine' as Tab, label: t('meetups.mine') },
    ],
    [t],
  );

  const windows = useMemo(
    () => [
      { value: 'any' as Window, label: t('meetups.anyDate') },
      { value: 'today' as Window, label: t('meetups.today') },
      { value: 'week' as Window, label: t('meetups.thisWeek') },
      { value: 'month' as Window, label: t('meetups.thisMonth') },
    ],
    [t],
  );

  const openOne = useCallback(
    (id: string) => router.push(Routes.meetup(id)),
    [router],
  );

  const header = (
    <Header
      title={t('meetups.title')}
      large
      right={
        <Button
          label={t('meetups.createTitle')}
          size="sm"
          icon={<Plus size={16} color={colors.textOnBrand} />}
          onPress={() => router.push(Routes.newMeetup)}
        />
      }
    />
  );

  const filters = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <SegmentedControl value={tab} options={tabs} onChange={setTab} />
      {/* In the body rather than the header, where the large title and the
          action button had already squeezed it to "wherev…". */}
      {tab === 'find' ? (
        <Text variant="caption" tone="muted">
          {t('meetups.subtitle')}
        </Text>
      ) : null}

      {tab === 'find' ? (
        <>
          <Input
            placeholder={t('meetups.searchPlace')}
            hint={t('meetups.searchPlaceHint')}
            value={place}
            onChangeText={setPlace}
            onSubmitEditing={() => setApplied(place.trim())}
            returnKeyType="search"
            autoCorrect={false}
            icon={<Search size={18} color={colors.textMuted} />}
            accessibilityLabel={t('meetups.searchPlace')}
          />

          {/*
            Both rows scroll sideways rather than wrapping. Twelve sports and
            four date ranges wrapped to seven rows of chips — a full screen of
            filters above the first game, which is the one thing this screen
            exists to show. A horizontal row costs one gesture and gives the
            list back its space.
          */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
          >
            <Chip
              label={t('meetups.anySport')}
              selected={sport === null}
              onPress={() => setSport(null)}
            />
            {SPORTS.map((s) => (
              <Chip
                key={s.key}
                label={`${s.emoji} ${sportLabel(t, s.key)}`}
                selected={sport === s.key}
                onPress={() => setSport(sport === s.key ? null : s.key)}
              />
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
          >
            {windows.map((w) => (
              <Chip
                key={w.value}
                label={w.label}
                selected={when === w.value}
                onPress={() => setWhen(w.value)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );

  if (tab === 'mine') {
    return (
      <Screen scroll={false} header={header} testID="meetups-screen">
        <FlatList
          data={mine.data ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={filters}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.giant }}
          refreshControl={
            <RefreshControl refreshing={mine.loading} onRefresh={mine.reload} tintColor={colors.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item, index }) => (
            <Reveal index={index}>
              {/* `my_meetups` returns no host — you already know who is running
                  the games you are in — so the row simply renders without one. */}
              <MeetupRow meetup={item} onPress={() => openOne(item.id)} />
            </Reveal>
          )}
          ListEmptyComponent={
            mine.loading ? (
              <SkeletonList count={3} variant="row" />
            ) : mine.error ? (
              <ErrorState message={mine.error} onRetry={mine.reload} />
            ) : (
              <EmptyState
                icon={<CalendarDays size={26} color={colors.textMuted} />}
                title={t('meetups.mineEmptyTitle')}
                body={t('meetups.mineEmptyBody')}
                actionLabel={t('meetups.emptyAction')}
                onAction={() => router.push(Routes.newMeetup)}
              />
            )
          }
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} header={header} testID="meetups-screen">
      <FlatList
        data={found.data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={filters}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.giant }}
        refreshControl={
          <RefreshControl refreshing={found.loading} onRefresh={found.reload} tintColor={colors.primary} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => (
          <Reveal index={index}>
            <MeetupRow meetup={item} onPress={() => openOne(item.id)} />
          </Reveal>
        )}
        ListEmptyComponent={
          found.loading ? (
            <SkeletonList count={3} variant="row" />
          ) : found.error ? (
            <ErrorState message={found.error} onRetry={found.reload} />
          ) : (
            <EmptyState
              icon={<Users size={26} color={colors.textMuted} />}
              title={t(applied || sport ? 'meetups.emptySearchTitle' : 'meetups.emptyTitle')}
              body={t(applied || sport ? 'meetups.emptySearchBody' : 'meetups.emptyBody')}
              actionLabel={t('meetups.emptyAction')}
              onAction={() => router.push(Routes.newMeetup)}
            />
          )
        }
      />
    </Screen>
  );
}
