import React from 'react';
import { View } from 'react-native';
import { ArrowDown, ArrowUp, BadgeCheck, Check, Star } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card, ChevronForward, Text } from '@/components/ui';
import { sportLabel } from '@/constants/sports';
import { daysUntil, metaLine } from '@/lib/format';
import { useT } from '@/i18n';
import type { Challenge } from '@/types/models';

/**
 * Open, and still taking clips: the status says open and the closing time has
 * not passed. A challenge can say "open" for a while after it closes, until
 * the server moves it on, so the phone checks the clock too.
 */
export function isChallengeLive(challenge: Challenge): boolean {
  if (challenge.status !== 'open') return false;
  const closes = new Date(challenge.closes_at).getTime();
  return Number.isNaN(closes) || closes > Date.now();
}

/** Readable orange for words on a light page; the plain flame in dark mode. */
export function useChallengeInk(): string {
  const theme = useTheme();
  return theme.scheme === 'dark' ? theme.play.flame : '#D9480F';
}

/** Inside a week counts as closing soon. */
export const CLOSING_SOON_DAYS = 7;

/**
 * One challenge, as a calm row card.
 *
 * What a fourteen-year-old decides on is what it is and how long is left, so
 * the title and the days-left tag lead. No picture: a challenge has none of
 * its own, and a stand-in only took room from the title. Orange is kept for two small things —
 * the tag when it is closing soon, and the way in — so a list of them stays
 * quiet. The entry count is social proof, not pressure: it never says hurry.
 */
export function ChallengeCard({
  challenge,
  onPress,
}: {
  challenge: Challenge;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const ink = useChallengeInk();

  const live = isChallengeLive(challenge);
  const entered = !!challenge.my_entry_id;
  const days = daysUntil(challenge.closes_at);
  const soon = live && days != null && days <= CLOSING_SOON_DAYS;

  const sport = sportLabel(t, challenge.sport);
  const who = challenge.org_name ?? challenge.setter_name ?? null;

  const ages =
    challenge.age_min != null && challenge.age_max != null
      ? t('challenges.ageRange', { min: challenge.age_min, max: challenge.age_max })
      : challenge.age_min != null
        ? t('challenges.ageMin', { min: challenge.age_min })
        : challenge.age_max != null
          ? t('challenges.ageMax', { max: challenge.age_max })
          : null;

  const tag =
    challenge.status === 'judging'
      ? t('challenges.judging')
      : !live
        ? t('challenges.closed')
        : t('challenges.daysLeft', { count: Math.max(days ?? 0, 0) });

  const entries = t('challenges.entries', { count: challenge.entry_count });
  const rule = challenge.metric_label
    ? metaLine(
        challenge.metric_label,
        challenge.metric_better === 'lower' ? t('challenges.lowerWins') : t('challenges.higherWins'),
        entries,
      )
    : metaLine(t('challenges.measuredNo'), entries);
  const RuleIcon = challenge.metric_label
    ? challenge.metric_better === 'lower'
      ? ArrowDown
      : ArrowUp
    : Star;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={metaLine(challenge.title, who, sport, tag, rule)}
      style={{ gap: spacing.md, opacity: live || entered ? 1 : 0.6 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {challenge.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
              {metaLine(who, sport, ages)}
            </Text>
            {challenge.setter_verified ? (
              <BadgeCheck size={14} color={colors.info} fill={theme.alpha(colors.info, 0.16)} />
            ) : null}
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            borderRadius: radii.pill,
            backgroundColor: soon ? theme.alpha(theme.play.flame, 0.14) : colors.surfaceAlt,
          }}
        >
          <Text variant="captionStrong" color={soon ? ink : colors.textSecondary} numberOfLines={1}>
            {tag}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <RuleIcon size={14} color={colors.textMuted} strokeWidth={2.4} />
        <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {rule}
        </Text>
        {entered ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Check size={14} color={colors.success} strokeWidth={2.6} />
            <Text variant="captionStrong" color={colors.success}>
              {t('challenges.tabEntered')}
            </Text>
          </View>
        ) : live ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text variant="bodyStrong" color={ink}>
              {t('challenges.enter')}
            </Text>
            <ChevronForward size={16} color={ink} />
          </View>
        ) : null}
      </View>
    </Card>
  );
}
