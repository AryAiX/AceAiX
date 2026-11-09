import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { tierForScore } from '@/theme/tokens';
import { Avatar, Text } from '@/components/ui';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { displayName, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { LeaderboardEntry } from '@/lib/api.discover';
import { tierLabel } from './MatchBadge';

type Place = 1 | 2 | 3;

/* The sunburst behind first place: thin wedges round a point just above the
   crown, fading out towards the edges. Drawn once, in a 420pt square. */
const BURST = 420;
const BURST_RAYS = 16;
const BURST_PATHS = Array.from({ length: BURST_RAYS }, (_, i) => {
  const c = BURST / 2;
  const a0 = ((i * 360) / BURST_RAYS - 4) * (Math.PI / 180);
  const a1 = ((i * 360) / BURST_RAYS + 4) * (Math.PI / 180);
  const r = BURST / 2;
  const x0 = c + r * Math.cos(a0);
  const y0 = c + r * Math.sin(a0);
  const x1 = c + r * Math.cos(a1);
  const y1 = c + r * Math.sin(a1);
  return `M ${c} ${c} L ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
});

function Sunburst({ dark }: { dark: boolean }) {
  return (
    <Svg
      pointerEvents="none"
      width={BURST}
      height={BURST}
      style={{ position: 'absolute', left: '50%', marginLeft: -BURST / 2, top: -BURST / 2 + 70 }}
    >
      <Defs>
        <RadialGradient id="burst" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFC83C" stopOpacity={dark ? 0.22 : 0.32} />
          <Stop offset="0.7" stopColor="#FFC83C" stopOpacity={dark ? 0.06 : 0.1} />
          <Stop offset="1" stopColor="#FFC83C" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {BURST_PATHS.map((d) => (
        <Path key={d} d={d} fill="url(#burst)" />
      ))}
    </Svg>
  );
}

/** Metal for each place: light, deep, and the ink that reads on it. */
const METAL: Record<Place, { light: string; deep: string; ink: string }> = {
  1: { light: '#FFE27A', deep: '#F2A51A', ink: '#7A4A00' },
  2: { light: '#F1F3FA', deep: '#A9AFCB', ink: '#3F4462' },
  3: { light: '#FFD2AE', deep: '#C9783F', ink: '#6A2F08' },
};
const STEP: Record<Place, number> = { 1: 74, 2: 50, 3: 36 };
const PLACE_KEY: Record<Place, string> = {
  1: 'discover.board.place1',
  2: 'discover.board.place2',
  3: 'discover.board.place3',
};

interface Props {
  /** The first three rows of the board, in rank order. */
  top: LeaderboardEntry[];
  viewerId: string | null;
}

/**
 * The top three on a podium: second, first, third from the left. The place is
 * a metal medal on the photo and the name of the step; the score is a pill of
 * its own under the name, so the two numbers are never side by side. It names
 * places people already hold and nothing else, the same as the list.
 */
export function LeaderboardPodium({ top, viewerId }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const dark = theme.scheme === 'dark';
  const t = useT();
  const router = useRouter();

  if (top.length < 3) return null;
  const order = [top[1], top[0], top[2]];

  return (
    <View
      style={{
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        borderTopColor: dark ? colors.edgeLight : '#FFFFFF',
        marginBottom: spacing.md,
        shadowColor: dark ? '#000000' : '#28206E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: dark ? 0.4 : 0.12,
        shadowRadius: 22,
        elevation: 6,
      }}
      testID="leaderboard-podium"
    >
      <LinearGradient
        colors={dark ? (['#3A4260', colors.surface] as const) : (['#FFFFFF', '#EEEBFB'] as const)}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          borderRadius: radii.xl,
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: spacing.sm,
          paddingTop: spacing.xl + spacing.sm,
          paddingHorizontal: spacing.md,
        }}
      >
        <Sunburst dark={dark} />
        {order.map((entry) => {
          const place = (entry.rank >= 1 && entry.rank <= 3 ? entry.rank : 3) as Place;
          const metal = METAL[place];
          const name = displayName(entry.full_name);
          const first = name.split(' ')[0] || name;
          const tier = tierForScore(entry.overall);
          const isYou = entry.user_id === viewerId;
          const big = place === 1;
          /* Avatar sizes come in steps (60, 88); first place is the 60 scaled up. */
          const size = big ? 72 : 60;
          const role = positionLabel(t, entry.position) || sportLabel(t, entry.sport);
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
              style={({ pressed }) => ({ flex: 1, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}
            >
              {big ? (
                <Text style={{ fontSize: 20, lineHeight: 24, marginBottom: -4 }} accessibilityElementsHidden>
                  👑
                </Text>
              ) : null}
              <View>
                {/* The photo in a ring of its place's metal, with a soft halo. */}
                <View
                  style={{
                    padding: 3,
                    borderRadius: 999,
                    backgroundColor: metal.deep,
                    shadowColor: metal.deep,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.45,
                    shadowRadius: 10,
                  }}
                >
                  <View
                    style={{
                      borderRadius: 999,
                      overflow: 'hidden',
                      width: size,
                      height: size,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View style={{ transform: [{ scale: size / 60 }] }}>
                      <Avatar uri={entry.avatar_url} name={name} size="lg" />
                    </View>
                  </View>
                </View>
                {/* The medal: the place, on the photo. */}
                <LinearGradient
                  colors={[metal.light, metal.deep]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={{
                    position: 'absolute',
                    right: -6,
                    bottom: -6,
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    borderWidth: 2.5,
                    borderColor: colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text variant="stat" color={metal.ink} style={{ fontSize: 16, lineHeight: 18 }}>
                    {place}
                  </Text>
                </LinearGradient>
              </View>

              <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: spacing.sm + 2 }}>
                {isYou ? t('discover.board.you') : first}
              </Text>
              {role ? (
                <Text variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 11, lineHeight: 14 }}>
                  {role}
                </Text>
              ) : null}

              {/* The score: a pill of its place's metal, labelled, apart from the place. */}
              <LinearGradient
                colors={[metal.light, metal.deep]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: 3,
                  marginTop: spacing.xs + 2,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                  borderRadius: 999,
                }}
              >
                <Text variant="stat" color={metal.ink} style={{ fontSize: 17, lineHeight: 21 }}>
                  {Math.round(entry.overall)}
                </Text>
                <Text variant="overline" color={metal.ink} style={{ fontSize: 8.5 }}>
                  {t('discover.board.pts')}
                </Text>
              </LinearGradient>

              {/* The step, in the same metal, lit along its top edge. */}
              <LinearGradient
                colors={[metal.light, metal.deep]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                  alignSelf: 'stretch',
                  height: STEP[place],
                  marginTop: spacing.sm + 2,
                  borderTopLeftRadius: radii.lg,
                  borderTopRightRadius: radii.lg,
                  borderTopWidth: 2,
                  borderTopColor: 'rgba(255,255,255,0.7)',
                  alignItems: 'center',
                  paddingTop: spacing.sm,
                }}
              >
                <Text variant="overline" color={metal.ink} style={{ fontSize: 11 }}>
                  {t(PLACE_KEY[place])}
                </Text>
              </LinearGradient>
            </Pressable>
          );
        })}
      </LinearGradient>
    </View>
  );
}
