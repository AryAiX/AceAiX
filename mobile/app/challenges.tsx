import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Flame, SlidersHorizontal, Trophy, X } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Chip,
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
  const [sport, setSport] = useState<string | null>(null);
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

  /* The sports that actually have a challenge, so the sheet never offers a
     sport that leads to an empty list. */
  const sportsHere = useMemo(() => {
    const present = new Set((data ?? []).map((c) => (c.sport ?? '').toLowerCase()));
    return SPORTS.filter((entry) => present.has(entry.key.toLowerCase()));
  }, [data]);
  const shown = useMemo(
    () =>
      sport
        ? (data ?? []).filter((c) => (c.sport ?? '').toLowerCase() === sport.toLowerCase())
        : (data ?? []),
    [data, sport],
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
    if (sport) {
      return (
        <EmptyState
          compact
          icon={<Trophy size={24} color={ink} />}
          title={t('opportunities.athlete.openEmptyFilteredTitle')}
          body={t('challenges.emptyBody')}
          actionLabel={t('opportunities.athlete.clearFilters')}
          actionVariant="soft"
          onAction={() => setSport(null)}
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
  }, [tab, t, router, ink, sport]);

  const picked = sport ? SPORTS.find((entry) => entry.key === sport) : undefined;

  /** One soft pill: "All sports ▾" until a sport is picked, then that sport in
      solid blue with an × to clear it. */
  const sportChip = (
    <View style={{ flexDirection: 'row' }}>
      <Pressable
        onPress={() => setSportOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={sport ? sportLabel(t, sport) : t('sports.allSports')}
        testID="challenges-sport"
        hitSlop={6}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 7,
          paddingLeft: spacing.md,
          paddingRight: sport ? 6 : spacing.md,
          borderRadius: radii.pill,
          backgroundColor: sport ? colors.primary : colors.surfaceAlt,
          opacity: pressed ? 0.75 : 1,
          ...(sport
            ? {
                shadowColor: colors.primary,
                shadowOpacity: 0.25,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 3,
              }
            : null),
        })}
      >
        {sport ? null : <SlidersHorizontal size={14} color={colors.textSecondary} strokeWidth={2.4} />}
        <Text variant="captionStrong" color={sport ? colors.textOnBrand : colors.textSecondary}>
          {sport
            ? `${picked?.emoji ? `${picked.emoji} ` : ''}${sportLabel(t, sport)}`
            : t('sports.allSports')}
        </Text>
        {sport ? (
          <Pressable
            onPress={() => setSport(null)}
            accessibilityRole="button"
            accessibilityLabel={t('opportunities.removeFilter', { label: sportLabel(t, sport) })}
            hitSlop={10}
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
          </Pressable>
        ) : (
          <ChevronDown size={14} color={colors.textSecondary} strokeWidth={2.6} />
        )}
      </Pressable>
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
              {sportsHere.length > 1 || sport ? sportChip : null}
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
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.lg }}>
          {sportsHere.map((entry) => (
            <Chip
              key={entry.key}
              label={sportLabel(t, entry.key)}
              icon={<Text variant="caption">{entry.emoji}</Text>}
              selected={sport === entry.key}
              onPress={() => {
                setSport((current) => (current === entry.key ? null : entry.key));
                setSportOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}
