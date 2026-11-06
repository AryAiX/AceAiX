import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Flame, Trophy } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  EmptyState,
  ErrorState,
  Header,
  Screen,
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
  const { spacing } = theme;
  const t = useT();
  const router = useRouter();
  const { profile } = useAuth();
  const ink = useChallengeInk();

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

  /* Open is split by time: inside a week first, then the rest. A challenge
     whose closing time has passed is shown faded at the bottom instead of
     mixed in with the ones still taking clips. */
  const open = useMemo(() => {
    const all = (data ?? []).filter((c) => !c.my_entry_id);
    const live = all.filter(isChallengeLive);
    const soon = live.filter((c) => (daysUntil(c.closes_at) ?? Infinity) <= CLOSING_SOON_DAYS);
    const later = live.filter((c) => !soon.includes(c));
    const ended = all.filter((c) => c.status === 'open' && !isChallengeLive(c));
    return { live, soon, later, ended };
  }, [data]);

  const rows = useMemo<Row[]>(() => {
    const all = data ?? [];
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
  }, [data, tab, profile?.id, open, t]);

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
  }, [tab, t, router, ink]);

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
    </Screen>
  );
}
