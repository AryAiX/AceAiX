import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { HeartHandshake } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { Avatar, Badge, Text } from '@/components/ui';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { displayName, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { LeaderboardEntry } from '@/lib/api.discover';
import { tierLabel } from './MatchBadge';

const RING = 50;
const STROKE = 4.5;

/** The score inside a ring that fills to it, in the tier's colour. */
export function ScoreDial({ score, color, label, track }: { score: number; color: string; label: string; track: string }) {
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, score)) / 100;
  return (
    <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={RING} height={RING} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={track} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * filled} ${c}`}
        />
      </Svg>
      <Text variant="stat" color={color} style={{ fontSize: 17, lineHeight: 18 }}>
        {Math.round(score)}
      </Text>
      <Text variant="overline" color={color} style={{ fontSize: 6.5, lineHeight: 8, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

interface Props {
  entry: LeaderboardEntry;
  /** Highlights the viewer's own row. */
  isYou: boolean;
  /** Highlights a guardian's approved child. Yields to isYou. */
  isChild?: boolean;
}

/**
 * One place on the board, as its own card: the place on the left in the
 * title face, the person, and their score in a ring on the right. The place
 * and the score sit at opposite ends, so they are never read as one number.
 */
export function LeaderboardRow({ entry, isYou, isChild = false }: Props) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;
  const dark = theme.scheme === 'dark';
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

  return (
    <Pressable
      onPress={() => router.push(Routes.profile(entry.user_id))}
      accessibilityRole="button"
      accessibilityLabel={metaLine(
        t('discover.board.rankA11y', { rank: entry.rank }),
        isYou
          ? t('discover.board.youA11y', { name })
          : isChild
            ? t('discover.board.childA11y', { name })
            : name,
        meta,
        t('discover.board.scoreA11y', { score: entry.overall, tier: tierName }),
      )}
      accessibilityHint={t('discover.card.openProfile')}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: 72,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: isYou ? colors.primary : isChild ? colors.info : colors.border,
          backgroundColor: isYou ? colors.primarySoft : isChild ? colors.infoSoft : colors.surface,
          shadowColor: dark ? '#000000' : '#28206E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: dark ? 0.3 : 0.05,
          shadowRadius: 10,
          elevation: 2,
          opacity: pressed ? 0.8 : 1,
        },
        isYou || isChild ? null : theme.raised('card'),
      ]}
    >
      <Text variant="stat" tone="secondary" style={{ fontSize: 20, minWidth: 34 }}>
        {`#${entry.rank}`}
      </Text>

      <Avatar uri={entry.avatar_url} name={name} size="md" />

      <View style={{ flex: 1, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text variant="name" numberOfLines={1} style={{ flexShrink: 1 }}>
            {isYou ? t('discover.board.you') : name}
          </Text>
          {isChild && !isYou ? (
            <Badge
              label={t('discover.board.yourChild')}
              tone="info"
              icon={<HeartHandshake size={12} color={colors.info} />}
            />
          ) : null}
        </View>
        {meta ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      <ScoreDial score={entry.overall} color={tierColor} label={tierName} track={colors.surfaceAlt} />
    </Pressable>
  );
}
