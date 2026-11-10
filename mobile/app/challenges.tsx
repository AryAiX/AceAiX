import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Flame, SlidersHorizontal, Trophy, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Dropdown,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  Sheet,
  SkeletonList,
  Text,
  TextTabs,
} from '@/components/ui';
import {
  CLOSING_SOON_DAYS,
  ChallengeCard,
  isChallengeLive,
  useChallengeInk,
} from '@/components/challenges/ChallengeCard';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { openChallenges } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { daysUntil } from '@/lib/format';
import { SPORTS, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import type { Challenge } from '@/types/models';

type Tab = 'open' | 'entered' | 'mine';

/** A list row: a small section label, or one challenge. */
type Row =
  | { kind: 'section'; key: string; label: string }
  | { kind: 'card'; key: string; challenge: Challenge };

function tabFromParam(raw: string | string[] | undefined): Tab | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'open' || value === 'entered' || value === 'mine') return value;
  return null;
}

/**
 * Challenges a coach has set, and the ones this person is already in.
 *
 * The list is deliberately short and unsorted by cleverness: `open_challenges`
 * puts the ones you have not entered first, then orders by closing date. A
 * fourteen-year-old opening this should see the thing to do today at the top,
 * not a ranked wall of everything.
 */
export default function ChallengesScreen() {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const ink = useChallengeInk();
  const [sports, setSports] = useState<string[]>([]);
  const [sportOpen, setSportOpen] = useState(false);

  const isSetter =
    profile?.role === 'coach' || profile?.role === 'club' || profile?.role === 'scout';

  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const requested = tabFromParam(params.tab);
  const [tab, setTab] = useState<Tab>(requested ?? 'open');

  // `/challenges?tab=mine` opens the challenges this person set.
  useEffect(() => {
    if (!requested) return;
    if (requested === 'mine' && !isSetter) {
      setTab('open');
      return;
    }
    setTab(requested);
  }, [requested, isSetter]);

  const { data, loading, error, refreshing, refresh, reload } = useAsync<Challenge[]>(
    () => openChallenges(null, 50, 0),
    [],
    { refetchOnFocus: true },
  );

  /* Which sports have a challenge right now. The sheet lists every sport;
     the ones with nothing open are faded, but can still be picked. */
  const sportsHere = useMemo(
    () => new Set((data ?? []).map((c) => (c.sport ?? '').toLowerCase())),
    [data],
  );
  const shown = useMemo(
    () =>
      sports.length > 0
        ? (data ?? []).filter((c) =>
            sports.some((key) => key.toLowerCase() === (c.sport ?? '').toLowerCase()),
          )
        : (data ?? []),
    [data, sports],
  );

  /* Open is split by time: inside a week first, then the rest. A challenge
     whose closing time has passed is shown faded at the bottom instead of
     mixed in with the ones still taking clips. */
  const open = useMemo(() => {
    const all = shown.filter((c) => !c.my_entry_id);
    const live = all.filter(isChallengeLive);
    const soon = live.filter((c) => (daysUntil(c.closes_at) ?? Infinity) <= CLOSING_SOON_DAYS);
    const later = live.filter((c) => !soon.includes(c));
    const ended = all.filter((c) => c.status === 'open' && !isChallengeLive(c));
    return { live, soon, later, ended };
  }, [shown]);

  const rows = useMemo<Row[]>(() => {
    const all = shown;
    const cards = (list: Challenge[]): Row[] =>
      list.map((c) => ({ kind: 'card', key: c.id, challenge: c }));
    if (tab === 'entered') return cards(all.filter((c) => c.my_entry_id));
    if (tab === 'mine') return cards(all.filter((c) => c.setter_id === profile?.id));
    if (open.live.length === 0) return [];
    const split = open.soon.length > 0 && open.later.length > 0;
    return [
      ...(split ? [{ kind: 'section' as const, key: 'soon', label: t('challenges.closingSoon') }] : []),
      ...cards(open.soon),
      ...(split ? [{ kind: 'section' as const, key: 'more', label: t('challenges.moreChallenges') }] : []),
      ...cards(open.later),
      ...cards(open.ended),
    ];
  }, [shown, tab, profile?.id, open, t]);

  const tabs = useMemo(() => {
    const count = open.live.length;
    const base = [
      {
        value: 'open' as Tab,
        label: count > 0 ? `${t('challenges.tabOpen')} · ${count}` : t('challenges.tabOpen'),
      },
      { value: 'entered' as Tab, label: t('challenges.tabEntered') },
    ];
    return isSetter ? [...base, { value: 'mine' as Tab, label: t('challenges.tabMine') }] : base;
  }, [isSetter, t, open.live.length]);

  const empty = useCallback(() => {
    if (sports.length > 0) {
      return (
        <EmptyState
          compact
          icon={<Trophy size={24} color={ink} />}
          title={t('opportunities.athlete.openEmptyFilteredTitle')}
          body={t('challenges.emptyBody')}
          actionLabel={t('opportunities.athlete.clearFilters')}
          actionVariant="soft"
          onAction={() => setSports([])}
        />
      );
    }
    if (tab === 'entered') {
      return (
        <EmptyState
          compact
          icon={<Flame size={24} color={ink} />}
          title={t('challenges.emptyEnteredTitle')}
          body={t('challenges.emptyEnteredBody')}
          actionLabel={t('challenges.seeOpen')}
          actionVariant="soft"
          onAction={() => setTab('open')}
        />
      );
    }
    if (tab === 'mine') {
      return (
        <EmptyState
          compact
          icon={<Trophy size={24} color={ink} />}
          title={t('challenges.emptyMineTitle')}
          body={t('challenges.emptyMineBody')}
          actionLabel={t('challenges.newTitle')}
          actionVariant="soft"
          onAction={() => router.push(Routes.newChallenge)}
        />
      );
    }
    return (
      <EmptyState
        compact
        icon={<Trophy size={24} color={ink} />}
        title={t('challenges.emptyTitle')}
        body={t('challenges.emptyBody')}
      />
    );
  }, [tab, t, router, ink, sports.length]);

  const toggleSport = (key: string) =>
    setSports((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );

  /* The filter pill always stays, so more sports can be added; each chosen
     sport sits beside it as its emoji in solid blue, with its own × to take it off. */
  const sportChips = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
      <Pressable
        onPress={() => setSportOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          sports.length > 0
            ? `${t('opportunities.detail.factSport')} (${sports.length})`
            : t('sports.allSports')
        }
        testID="challenges-sport"
        hitSlop={6}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 7,
          paddingHorizontal: spacing.md,
          borderRadius: radii.pill,
          backgroundColor: colors.surfaceAlt,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <SlidersHorizontal size={14} color={colors.textSecondary} strokeWidth={2.4} />
        <Text variant="captionStrong" color={colors.textSecondary}>
          {sports.length > 0 ? t('opportunities.detail.factSport') : t('sports.allSports')}
        </Text>
        <ChevronDown size={14} color={colors.textSecondary} strokeWidth={2.6} />
      </Pressable>

      {sports.map((key) => {
        const label = sportLabel(t, key);
        const found = SPORTS.find((entry) => entry.key === key)?.emoji;
        /* Tennis and padel share 🎾, so a shared emoji keeps its name. */
        const shared = !!found && SPORTS.filter((entry) => entry.emoji === found).length > 1;
        const emoji = found && !shared ? found : undefined;
        return (
          <Pressable
            key={key}
            onPress={() => toggleSport(key)}
            accessibilityRole="button"
            accessibilityLabel={t('opportunities.removeFilter', { label })}
            testID={`challenges-sport-${key}`}
            hitSlop={4}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 7,
              paddingLeft: emoji ? spacing.sm : spacing.md,
              paddingRight: 6,
              borderRadius: radii.pill,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.75 : 1,
              shadowColor: colors.primary,
              shadowOpacity: 0.25,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            })}
          >
            {/* Just the sport's emoji, to keep the row light; the name is still
                read out to screen readers. */}
            <Text
              variant="captionStrong"
              color={colors.textOnBrand}
              style={emoji ? { fontSize: 15 } : undefined}
            >
              {emoji ?? (found ? `${found} ${label}` : label)}
            </Text>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={12} color={colors.textOnBrand} strokeWidth={3} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Screen
      scroll={false}
      padded={false}
      header={<Header title={t('challenges.allTitle')} back large />}
      testID="challenges-screen"
    >
      {loading && !data ? (
        <View style={{ padding: spacing.lg }}>
          <SkeletonList count={4} />
        </View>
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList<Row>
          data={rows}
          keyExtractor={(item) => item.key}
          refreshing={refreshing}
          onRefresh={refresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
            flexGrow: 1,
          }}
          ListHeaderComponent={
            <View style={{ gap: spacing.lg, marginBottom: spacing.xs }}>
              <Text variant="body" tone="secondary">
                {t('challenges.subtitle')}
              </Text>
              <TextTabs<Tab>
                options={tabs}
                value={tab}
                onChange={setTab}
                color={theme.play.flame}
                testID="challenge-tabs"
              />
              {sportChips}
              {isSetter ? (
                <Button
                  label={t('challenges.newTitle')}
                  variant="secondary"
                  onPress={() => router.push(Routes.newChallenge)}
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={empty()}
          renderItem={({ item }) =>
            item.kind === 'section' ? (
              <Text variant="overline" tone="muted" style={{ marginTop: spacing.xs }}>
                {item.label}
              </Text>
            ) : (
              <ChallengeCard
                challenge={item.challenge}
                onPress={() => router.push(Routes.challenge(item.challenge.id))}
              />
            )
          }
        />
      )}

      <Sheet
        visible={sportOpen}
        onClose={() => setSportOpen(false)}
        title={t('opportunities.detail.factSport')}
        testID="challenges-sport-sheet"
        footer={
          <Button
            label={t('opportunities.showResults', { count: open.live.length })}
            fullWidth
            onPress={() => setSportOpen(false)}
            testID="challenges-sport-show"
          />
        }
      >
        <View style={{ paddingBottom: spacing.lg }}>
          {/* A searchable list with ticks instead of a wall of chips; sports
              with no open challenge right now are faded. */}
          <Dropdown
            inline
            multiple
            options={SPORTS.map((entry) => ({
              key: entry.key,
              label: sportLabel(t, entry.key),
              emoji: entry.emoji,
              faded: !sportsHere.has(entry.key.toLowerCase()),
            }))}
            value={sports}
            onChange={setSports}
            testID="challenges-sport-list"
          />
        </View>
      </Sheet>
    </Screen>
  );
}
