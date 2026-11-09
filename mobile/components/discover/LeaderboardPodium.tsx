import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { Avatar, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { displayName, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { LeaderboardEntry } from '@/lib/api.discover';
import { tierLabel } from './MatchBadge';

const STEP: Record<1 | 2 | 3, number> = { 1: 72, 2: 52, 3: 40 };

interface Props {
  /** The first three rows of the board, in rank order. */
  top: LeaderboardEntry[];
  viewerId: string | null;
}

/**
 * The top three on a podium: second, first, third from the left, the first
 * place raised and in the brand gradient. It names places people already hold
 * and nothing else, the same as the list under it.
 */
export function LeaderboardPodium({ top, viewerId }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const router = useRouter();

  if (top.length < 3) return null;
  const order = [top[1], top[0], top[2]];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
        paddingTop: spacing.lg,
        paddingHorizontal: spacing.md,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: 'hidden',
        marginBottom: spacing.md,
      }}
      testID="leaderboard-podium"
    >
      {order.map((entry) => {
        const place = (entry.rank >= 1 && entry.rank <= 3 ? entry.rank : 3) as 1 | 2 | 3;
        const name = displayName(entry.full_name);
        const first = name.split(' ')[0] || name;
        const tier = tierForScore(entry.overall);
        const isYou = entry.user_id === viewerId;
        return (
          <Pressable
            key={entry.athlete_id}
            onPress={() => router.push(Routes.profile(entry.user_id))}
            accessibilityRole="button"
            accessibilityLabel={metaLine(
              t('discover.board.rankA11y', { rank: entry.rank }),
              isYou ? t('discover.board.youA11y', { name }) : name,
              t('discover.board.scoreA11y', { score: entry.overall, tier: tierLabel(t, tier) }),
            )}
            style={({ pressed }) => ({ flex: 1, alignItems: 'center', opacity: pressed ? 0.75 : 1 })}
          >
            <Avatar
              uri={entry.avatar_url}
              name={name}
              size={place === 1 ? 'lg' : 'md'}
              score={entry.overall}
            />
            <Text variant="captionStrong" numberOfLines={1} style={{ marginTop: spacing.xs }}>
              {isYou ? t('discover.board.you') : first}
            </Text>
            <Text variant="stat" color={TierColors[tier]} style={{ fontSize: 17 }}>
              {Math.round(entry.overall)}
            </Text>
            {place === 1 ? (
              <LinearGradient
                colors={[colors.primary, '#7A6CFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  alignSelf: 'stretch',
                  height: STEP[1],
                  marginTop: spacing.xs,
                  borderTopLeftRadius: radii.lg,
                  borderTopRightRadius: radii.lg,
                  alignItems: 'center',
                  paddingTop: spacing.xs,
                }}
              >
                <Text variant="stat" color="#FFFFFF" style={{ fontSize: 24 }}>
                  1
                </Text>
              </LinearGradient>
            ) : (
              <View
                style={{
                  alignSelf: 'stretch',
                  height: STEP[place],
                  marginTop: spacing.xs,
                  borderTopLeftRadius: radii.lg,
                  borderTopRightRadius: radii.lg,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  paddingTop: spacing.xs,
                }}
              >
                <Text variant="stat" tone="secondary" style={{ fontSize: 22 }}>
                  {place}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
