import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { useIsFocused, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  MapPin,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { dayRange, shortDay } from '@/lib/format';

import { useTheme } from '@/theme/ThemeProvider';
import { useTabReselect } from '@/hooks/useTabReselect';
import {
  Button,
  Dropdown,
  EmptyState,
  ErrorState,
  Header,
  Reveal,
  Screen,
  Sheet,
  SkeletonList,
  Text,
} from '@/components/ui';
import { OptionList } from '@/components/onboarding/PickerSheet';
import { MeetupRow } from '@/components/meetups/MeetupCard';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { Routes } from '@/lib/routes';
import { SPORTS, sportLabel } from '@/constants/sports';
import { findMeetups, myMeetups, type MeetupCard } from '@/lib/api.meetups';
import { useEndPadding } from '@/components/navigation/dockInset';

/**
 * Play — find people to play with, here or somewhere you are going.
 *
 * Two tabs, because there are two questions: "who is playing near me" and
 * "what have I signed up for". Searching is the default, since the second
 * question is only interesting once you have answered the first.
 *
 * Meetups are eighteen-plus. The database returns nothing to a minor, the tab
 * is hidden from their bar, and this screen also gates deep links so a minor
 * who arrives here sees an adults-only message rather than an empty list.
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

const WINDOW_ICONS: Record<Window, typeof CalendarDays> = {
  any: Sparkles,
  today: CalendarCheck,
  week: CalendarRange,
  month: CalendarDays,
};

export default function MeetupsScreen() {
  const endPad = useEndPadding();
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const insets = useSafeAreaInsets();
  /* White status-bar icons over the gradient, only while this tab is on
     screen; leaving it hands the bar back to the other screens. */
  const focused = useIsFocused();
  const router = useRouter();
  const t = useT();
  const { profile } = useAuth();
  const canMeet = profile?.is_minor === false;

  const [tab, setTab] = useState<Tab>('find');
  const [place, setPlace] = useState('');
  const [sport, setSport] = useState<string | null>(null);
  const [when, setWhen] = useState<Window>('any');
  /* Which picker is open from the search card, if any. */
  const [picking, setPicking] = useState<'sport' | 'when' | null>(null);

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
  /* Mine has loaded and holds nothing: the empty card is shown in the header. */
  const mineEmpty = tab === 'mine' && !mine.loading && !mine.error && (mine.data?.length ?? 0) === 0;
  /* Tap Play again: back to the top, then reload whichever list is open. */
  const listRef = useTabReselect(() => (tab === 'mine' ? mine.reload() : found.reload()));

  const tabs = useMemo(
    () => [
      { value: 'find' as Tab, label: t('meetups.nearby') },
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

  /* The dates each choice covers, worked out on the phone. */
  const windowHint = (w: Window): string => {
    const now = new Date();
    if (w === 'any') return t('meetups.anyDateHint');
    if (w === 'today') return shortDay(now);
    const range = windowRange(w);
    return range.to ? dayRange(now, new Date(range.to)) : '';
  };

  const openOne = useCallback(
    (id: string) => router.push(Routes.meetup(id)),
    [router],
  );

  /* A small Nearby / Mine toggle beside the title, so "Play" is said once. */
  const toggle = (
    <View
      style={{ flexDirection: 'row', padding: 3, borderRadius: radii.pill, backgroundColor: theme.alpha('#FFFFFF', 0.18) }}
      testID="meetups-tabs"
    >
      {tabs.map((o) => {
        const on = tab === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => setTab(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            testID={`meetups-tab-${o.value}`}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: 7,
              borderRadius: radii.pill,
              backgroundColor: on ? '#FFFFFF' : 'transparent',
            }}
          >
            <Text variant="captionStrong" color={on ? theme.gradients.action[1] : '#FFFFFF'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  /*
    The header is a blue → violet block that runs up under the status bar,
    with the title, the toggle and (on Nearby) a short line in white. The
    search card then floats over its bottom edge — half on the colour, half on
    the page — which is what gives the screen its depth.
  */
  const hero = (
    <View
      style={{
        marginHorizontal: -spacing.lg,
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        /* Room for a card to float over the bottom edge: the search card on
           Nearby, the empty card on Mine. With games listed on Mine there is
           nothing to float, so the block ends sooner. */
        paddingBottom: tab === 'find' || mineEmpty ? 74 : spacing.xl,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
      }}
    >
      {focused ? <StatusBar style="light" /> : null}
      <LinearGradient
        colors={theme.gradients.action}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {theme.scheme === 'dark' ? (
        /* Same colours in dark mode, with depth: light from the top-left,
           shading along the bottom, and two faint court circles. */
        <>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(10,8,40,0)', 'rgba(10,8,40,0.32)'] as const}
            start={{ x: 0.5, y: 0.45 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: -60,
              top: -40,
              width: 240,
              height: 240,
              borderRadius: 120,
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: 20,
              top: 40,
              width: 120,
              height: 120,
              borderRadius: 60,
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          />
        </>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="screenTitle" color="#FFFFFF" accessibilityRole="header" numberOfLines={1}>
          {t('meetups.title')}
        </Text>
        {toggle}
      </View>
      <Text variant="caption" color={theme.alpha('#FFFFFF', 0.9)} style={{ marginTop: spacing.xs }}>
        {t(tab === 'find' ? 'meetups.subtitle' : 'meetups.mineSubtitle')}
      </Text>
    </View>
  );

  const sportName = sport ? sportLabel(t, sport) : t('meetups.anySport');
  const whenName = windows.find((w) => w.value === when)?.label ?? t('meetups.anyDate');

  /** One labelled cell of the search card: a small caps label over a value. */
  const cell = (label: string, value: string, onPress: () => void, testID: string) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      testID={testID}
      style={({ pressed }) => ({ flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, opacity: pressed ? 0.7 : 1 })}
    >
      <Text variant="overline" tone="muted">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
          {value}
        </Text>
        <ChevronDown size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );

  /*
    Where, sport and when in one card, like a travel search: the place on top,
    the two choices side by side under it. Sport and date open short lists in
    a sheet instead of two rows of chips running off the screen.
  */
  const filters =
    tab === 'find' ? (
      <View style={{ paddingBottom: spacing.lg }}>
        {hero}
        <View
          style={{
            marginTop: -58,
            borderRadius: radii.lg,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            ...theme.elevation(1),
          }}
          testID="meetups-search"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
            }}
          >
            <MapPin size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="overline" tone="muted">
                {t('meetups.fieldWhere')}
              </Text>
              <TextInput
                value={place}
                onChangeText={setPlace}
                onSubmitEditing={() => setApplied(place.trim())}
                onBlur={() => setApplied(place.trim())}
                placeholder={t('meetups.searchPlace')}
                placeholderTextColor={colors.textMuted}
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel={t('meetups.searchPlace')}
                style={{ padding: 0, fontFamily: theme.font.semibold, fontSize: 16, color: colors.text }}
                testID="meetups-where"
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {cell(t('meetups.fieldSport'), sportName, () => setPicking('sport'), 'meetups-sport')}
            <View style={{ width: 1, backgroundColor: colors.divider }} />
            {cell(t('meetups.fieldWhen'), whenName, () => setPicking('when'), 'meetups-when')}
          </View>
        </View>

        <Sheet
          visible={picking !== null}
          onClose={() => setPicking(null)}
          title={picking === 'sport' ? t('meetups.fieldSport') : t('meetups.fieldWhen')}
        >
          {picking === 'sport' ? (
            <View style={{ paddingBottom: spacing.sm }}>
              {/* The same dropdown as every other sport filter. Meetup search
                  takes one sport, so picking one closes the sheet. */}
              <Dropdown
                inline
                placeholder={t('meetups.anySport')}
                options={SPORTS.map((s) => ({ key: s.key, label: sportLabel(t, s.key), emoji: s.emoji }))}
                value={sport ? [sport] : []}
                onChange={(next) => {
                  setSport(next[0] ?? null);
                  setPicking(null);
                }}
                testID="meetups-sport-options"
              />
              <Text variant="captionStrong" color={colors.primary} style={{ marginTop: spacing.sm }}>
                {t('meetups.oneSportHint')}
              </Text>
            </View>
          ) : picking === 'when' ? (
            <OptionList
              selected={[when]}
              rows={windows.map((w) => ({
                key: w.value,
                label: w.label,
                sublabel: windowHint(w.value),
                icon: (color: string) => {
                  const Icon = WINDOW_ICONS[w.value];
                  return <Icon size={19} color={color} strokeWidth={2.2} />;
                },
              }))}
              onPick={(key) => {
                setWhen(key as Window);
                setPicking(null);
              }}
              testID="meetups-when-options"
            />
          ) : null}
        </Sheet>
      </View>
    ) : (
      <View style={{ paddingBottom: spacing.md }}>
        {hero}
        {mineEmpty ? (
          /* The empty card floats over the header's edge, like the search
             card on Nearby, so the two tabs are built the same way. */
          <View
            style={{
              marginTop: -58,
              borderRadius: radii.lg,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              ...theme.elevation(1),
            }}
          >
            <EmptyState
              icon={<CalendarDays size={26} color={colors.textMuted} />}
              title={t('meetups.mineEmptyTitle')}
              body={t('meetups.mineEmptyBody')}
              actionLabel={t('meetups.emptyAction')}
              onAction={() => router.push(Routes.newMeetup)}
              style={{ paddingVertical: spacing.xl }}
            />
          </View>
        ) : null}
      </View>
    );

  /* With games listed the empty state's button is gone, so a quiet one sits
     under the list instead: one way to post a game on screen, always. */
  const postFooter = (
    <Button
      size="sm"
      label={t('meetups.createTitle')}
      variant="soft"
      icon={<Plus size={16} color={colors.primary} />}
      onPress={() => router.push(Routes.newMeetup)}
      style={{ alignSelf: 'center', marginTop: spacing.lg }}
    />
  );

  if (!canMeet) {
    return (
      <Screen header={<Header title={t('meetups.title')} />}>
        <EmptyState
          icon={<Users size={26} color={colors.textMuted} />}
          title={t('meetups.adultsOnlyTitle')}
          body={t('meetups.adultsOnlyBody')}
        />
      </Screen>
    );
  }

  if (tab === 'mine') {
    return (
      <Screen scroll={false} padded={false} edges={[]} testID="meetups-screen">
        <FlatList
          ref={listRef}
          data={mine.data ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={filters}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: endPad }}
          refreshControl={
            <RefreshControl refreshing={mine.loading} onRefresh={mine.reload} tintColor={colors.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListFooterComponent={mine.data?.length ? postFooter : undefined}
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
            ) : undefined
          }
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} edges={[]} testID="meetups-screen">
      <FlatList
        ref={listRef}
        data={found.data ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={filters}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: endPad }}
        refreshControl={
          <RefreshControl refreshing={found.loading} onRefresh={found.reload} tintColor={colors.primary} />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListFooterComponent={found.data?.length ? postFooter : undefined}
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
              style={{ paddingTop: spacing.sm, paddingBottom: spacing.lg }}
              onAction={() => router.push(Routes.newMeetup)}
            />
          )
        }
      />
    </Screen>
  );
}
