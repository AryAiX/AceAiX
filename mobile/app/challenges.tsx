import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flame, Trophy } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  EmptyState,
  ErrorState,
  Header,
  Screen,
  SegmentedControl,
  SkeletonList,
  Text,
} from '@/components/ui';
import { ChallengeCard } from '@/components/challenges/ChallengeCard';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { openChallenges } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { useT } from '@/i18n';
import type { Challenge } from '@/types/models';

type Tab = 'open' | 'entered' | 'mine';

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

  const isSetter =
    profile?.role === 'coach' || profile?.role === 'club' || profile?.role === 'scout';

  const [tab, setTab] = useState<Tab>('open');

  const { data, loading, error, refreshing, refresh, reload } = useAsync<Challenge[]>(
    () => openChallenges(null, 50, 0),
    [],
    { refetchOnFocus: true },
  );

  const rows = useMemo(() => {
    const all = data ?? [];
    if (tab === 'entered') return all.filter((c) => c.my_entry_id);
    if (tab === 'mine') return all.filter((c) => c.setter_id === profile?.id);
    return all.filter((c) => !c.my_entry_id && c.status === 'open');
  }, [data, tab, profile?.id]);

  const tabs = useMemo(() => {
    const base = [
      { value: 'open' as Tab, label: t('challenges.tabOpen') },
      { value: 'entered' as Tab, label: t('challenges.tabEntered') },
    ];
    return isSetter ? [...base, { value: 'mine' as Tab, label: t('challenges.tabMine') }] : base;
  }, [isSetter, t]);

  const empty = useCallback(() => {
    if (tab === 'entered') {
      return (
        <EmptyState
          icon={<Flame size={26} color={theme.colors.textMuted} />}
          title={t('challenges.emptyEnteredTitle')}
          body={t('challenges.emptyEnteredBody')}
          actionLabel={t('challenges.tabOpen')}
          onAction={() => setTab('open')}
        />
      );
    }
    if (tab === 'mine') {
      return (
        <EmptyState
          icon={<Trophy size={26} color={theme.colors.textMuted} />}
          title={t('challenges.emptyMineTitle')}
          body={t('challenges.emptyMineBody')}
          actionLabel={t('challenges.newTitle')}
          onAction={() => router.push(Routes.newChallenge)}
        />
      );
    }
    return (
      <EmptyState
        icon={<Trophy size={26} color={theme.colors.textMuted} />}
        title={t('challenges.emptyTitle')}
        body={t('challenges.emptyBody')}
      />
    );
  }, [tab, t, router, theme.colors.textMuted]);

  return (
    <Screen
      scroll={false}
      padded={false}
      header={<Header title={t('challenges.title')} back bordered />}
      testID="challenges-screen"
    >
      {loading && !data ? (
        <View style={{ padding: spacing.lg }}>
          <SkeletonList count={4} />
        </View>
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={refresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
            flexGrow: 1,
          }}
          ListHeaderComponent={
            <View style={{ gap: spacing.md, marginBottom: spacing.xs }}>
              <Text variant="body" tone="secondary">
                {t('challenges.subtitle')}
              </Text>
              <SegmentedControl
                options={tabs}
                value={tab}
                onChange={(v) => setTab(v as Tab)}
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
          ListEmptyComponent={<View style={{ paddingTop: spacing.xxl }}>{empty()}</View>}
          renderItem={({ item }) => (
            <ChallengeCard
              challenge={item}
              onPress={() => router.push(Routes.challenge(item.id))}
            />
          )}
        />
      )}
    </Screen>
  );
}
