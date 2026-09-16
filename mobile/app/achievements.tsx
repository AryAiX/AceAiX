import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Card,
  Header,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
} from '@/components/ui';
import { AchievementBadge } from '@/components/celebrate/AchievementBadge';
import { StreakCalendar } from '@/components/celebrate/StreakCalendar';
import { TierProgress } from '@/components/celebrate/TierProgress';
import {
  ACHIEVEMENT_GROUPS,
  GROUP_TITLE_KEYS,
  RARITY_LABEL_KEYS,
  achievementFor,
  achievementsInGroup,
  type AchievementGroup,
  type AchievementMeta,
} from '@/components/celebrate/achievements';
import { useProgress } from '@/providers/ProgressProvider';
import { fullDate } from '@/lib/format';
import { useT } from '@/i18n';
import type { AchievementKey } from '@/types/models';

/**
 * The wall.
 *
 * Unearned achievements are shown, not hidden. A locked grid of question marks
 * is a puzzle; a dimmed badge with the real name and the real condition under
 * it is an answer to "what should I do next?", which is the only question this
 * screen exists to answer.
 *
 * Nothing here is ranked against another person, and nothing counts down.
 */
export default function AchievementsScreen() {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const { progress, refresh } = useProgress();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  /* The provider loads this on the first foreground, but the screen can be
     opened from a deep link before that has landed. */
  useEffect(() => {
    if (!progress) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * key → unlock date, for the earned ones.
   *
   * A key this build's catalogue does not know about is dropped rather than
   * counted, so a server running a newer migration cannot produce "20 of 19".
   */
  const earned = useMemo(() => {
    const map = new Map<AchievementKey, string>();
    for (const row of progress?.achievements ?? []) {
      if (achievementFor(row.key)) map.set(row.key, row.unlocked_at);
    }
    return map;
  }, [progress?.achievements]);

  const header = <Header back title={t('progress.title')} />;

  if (!progress) {
    return (
      <Screen
        header={header}
        onRefresh={onRefresh}
        refreshing={refreshing}
        testID="achievements-screen"
      >
        {/* No error state on purpose. If progress cannot be loaded there is
            nothing here worth alarming anyone about — pulling down retries. */}
        <SkeletonList count={3} variant="row" />
      </Screen>
    );
  }

  const total = ACHIEVEMENT_GROUPS.reduce(
    (sum, group) => sum + achievementsInGroup(group).length,
    0,
  );

  return (
    <Screen
      header={header}
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentStyle={{ gap: spacing.xxl }}
      testID="achievements-screen"
    >
      {/* ── How many ── */}
      <View style={{ alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
        <Text variant="display">{t('progress.earnedOf', { earned: earned.size, total })}</Text>
        <Text variant="caption" tone="muted" align="center" style={{ maxWidth: 300 }}>
          {t('progress.subtitle')}
        </Text>
      </View>

      {/* ── Turning up ── */}
      <View>
        <SectionHeader title={t('progress.calendarTitle')} />
        <Card padded>
          <StreakCalendar streak={progress.streak} days={progress.last_7_days} />
        </Card>
      </View>

      {/* ── Where the score is going ── */}
      <View>
        <SectionHeader title={t('progress.nextTierTitle')} />
        <Card padded>
          <TierProgress score={progress.score} />
        </Card>
      </View>

      {/* ── The wall ── */}
      {ACHIEVEMENT_GROUPS.map((group) => (
        <Group key={group} group={group} earned={earned} />
      ))}
    </Screen>
  );
}

function Group({
  group,
  earned,
}: {
  group: AchievementGroup;
  earned: Map<AchievementKey, string>;
}) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();

  /* Earned first, then the catalogue's own order. What you have done is the
     reward; what is next is the invitation, and it belongs underneath. */
  const entries = useMemo(() => {
    const all = achievementsInGroup(group);
    return [
      ...all.filter((entry) => earned.has(entry.key)),
      ...all.filter((entry) => !earned.has(entry.key)),
    ];
  }, [group, earned]);

  const count = entries.filter((entry) => earned.has(entry.key)).length;

  return (
    <View>
      {/* `SectionHeader`'s action slot is a button, and this count is not
          tappable, so the row is built here instead of faking one. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        }}
      >
        <Text variant="heading">{t(GROUP_TITLE_KEYS[group])}</Text>
        <Text variant="caption" tone="muted">
          {t('progress.earnedOf', { earned: count, total: entries.length })}
        </Text>
      </View>

      {/* Two to a row. `space-between` rather than `gap` so a group with an odd
          number of badges leaves the last one half-width instead of stretching
          it across the screen. */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: spacing.md,
        }}
      >
        {entries.map((entry) => (
          <Tile key={entry.key} meta={entry} unlockedAt={earned.get(entry.key) ?? null} />
        ))}
      </View>
    </View>
  );
}

function Tile({ meta, unlockedAt }: { meta: AchievementMeta; unlockedAt: string | null }) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();

  const isEarned = unlockedAt !== null;
  const title = t(meta.titleKey);
  const hint = t(meta.hintKey);
  const detail = isEarned ? t('progress.unlockedOn', { date: fullDate(unlockedAt) }) : hint;

  return (
    <Card
      padded="sm"
      tone={isEarned ? 'surface' : 'alt'}
      accessible
      accessibilityLabel={
        isEarned
          ? t('progress.tileEarnedA11y', { title, date: fullDate(unlockedAt), hint })
          : t('progress.tileLockedA11y', { title, hint })
      }
      style={{
        width: '48%',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 172,
        opacity: isEarned ? 1 : 0.85,
      }}
    >
      <AchievementBadge meta={meta} earned={isEarned} size="md" />

      <Text variant="captionStrong" align="center" tone={isEarned ? 'default' : 'secondary'}>
        {title}
      </Text>

      <Text variant="caption" tone="muted" align="center" style={{ flex: 1 }}>
        {detail}
      </Text>

      <Text variant="overline" tone="muted">
        {t(RARITY_LABEL_KEYS[meta.rarity])}
      </Text>
    </Card>
  );
}
