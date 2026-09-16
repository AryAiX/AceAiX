import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { Avatar, Badge, Text } from '@/components/ui';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { displayName, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { LeaderboardEntry } from '@/lib/api.discover';
import { tierLabel } from './MatchBadge';

/** Podium places borrow the tier ramp; everyone else gets a calm neutral. */
function rankColor(rank: number, fallback: string): string {
  if (rank === 1) return TierColors.gold;
  if (rank === 2) return TierColors.silver;
  if (rank === 3) return TierColors.bronze;
  return fallback;
}

interface Props {
  entry: LeaderboardEntry;
  /** Highlights the viewer's own row. */
  isYou: boolean;
}

export function LeaderboardRow({ entry, isYou }: Props) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;
  const router = useRouter();

  const name = displayName(entry.full_name);
  const tier = tierForScore(entry.overall);
  const tierColor = TierColors[tier];
  const tierName = tierLabel(t, tier);
  const meta = metaLine(
    sportLabel(t, entry.sport),
    positionLabel(t, entry.position),
    entry.country,
  );
  const accent = rankColor(entry.rank, colors.textMuted);

  return (
    <Pressable
      onPress={() => router.push(Routes.profile(entry.user_id))}
      accessibilityRole="button"
      accessibilityLabel={metaLine(
        t('discover.board.rankA11y', { rank: entry.rank }),
        isYou ? t('discover.board.youA11y', { name }) : name,
        meta,
        t('discover.board.scoreA11y', { score: entry.overall, tier: tierName }),
      )}
      accessibilityHint={t('discover.card.openProfile')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 64,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
        borderWidth: isYou ? 1.5 : 1,
        borderColor: isYou ? colors.primaryBorder : colors.border,
        backgroundColor: isYou ? colors.primarySoft : colors.surface,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ minWidth: 32, alignItems: 'center' }}>
        <Text variant="stat" color={accent} style={{ fontSize: 18 }}>
          {entry.rank}
        </Text>
      </View>

      <Avatar uri={entry.avatar_url} name={name} size="sm" score={entry.overall} />

      <View style={{ flex: 1, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </Text>
          {isYou ? <Badge label={t('discover.board.you')} tone="primary" /> : null}
        </View>
        {meta ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="stat" color={tierColor} style={{ fontSize: 20 }}>
          {Math.round(entry.overall)}
        </Text>
        <Text variant="overline" color={tierColor} style={{ fontSize: 9 }}>
          {tierName}
        </Text>
      </View>
    </Pressable>
  );
}
