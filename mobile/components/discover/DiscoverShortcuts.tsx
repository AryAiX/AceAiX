import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';

export type DiscoverShortcut = 'clubs' | 'coaches' | 'challenges' | 'leaderboard' | 'sponsors';

const SIZE = 36;

/* Two-tone drawings, one colour family each, so the five read apart at a
   glance. They are drawn here rather than taken from the icon set because the
   set only has single-colour outlines. */
function ClubIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 48 48">
      <Path d="M24 5l15 5v12c0 10-7 17-15 21C16 39 9 32 9 22V10z" fill="#F06A4E" />
      <Path d="M24 5v38C16 39 9 32 9 22V10z" fill="#FFB347" opacity={0.55} />
      <Path
        d="M24 15l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

/* A coach: head and shoulders in a cap. No whistle, because not every
   sport's coach blows one. */
function CoachIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 48 48">
      <Path d="M9 42c0-8 6.5-13 15-13s15 5 15 13z" fill="#1E9E5A" />
      <Path d="M24 29c-3 0-5.6.5-7.8 1.5L24 36l7.8-5.5C29.6 29.5 27 29 24 29z" fill="#7FD99A" />
      <Circle cx={24} cy={19} r={8.5} fill="#FFD3B0" />
      <Path d="M15 17.5c0-6 4-9.5 9-9.5s9 3.5 9 9.5z" fill="#1E9E5A" />
      <Path d="M24 17.5h12a2 2 0 0 1 0 3H24z" fill="#16804A" />
    </Svg>
  );
}

/* A flame in the logo's fire, the colour of everything you act on. */
function ChallengeIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 48 48">
      <Path d="M24 4c2 7 13 12 13 24a13 13 0 0 1-26 0c0-6 3-10 6-13 0 4 2 7 5 8-1-7 0-13 2-19z" fill="#FF7A2C" />
      <Path d="M24 4c2 7 13 12 13 24a13 13 0 0 1-13 13z" fill="#E8372B" opacity={0.55} />
      <Path
        d="M24 26c4 3 7 6 7 10a7 7 0 0 1-14 0c0-3 2-5 4-6 0 2 1 3 2 3 0-3 0-5 1-7z"
        fill="#FFD27A"
      />
    </Svg>
  );
}

function TrophyIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 48 48">
      <Path d="M14 6h20v10a10 10 0 0 1-20 0z" fill="#F4A340" />
      <Path
        d="M14 9H7v3a7 7 0 0 0 7 7M34 9h7v3a7 7 0 0 1-7 7"
        fill="none"
        stroke="#C77D00"
        strokeWidth={3}
      />
      <Rect x={21} y={26} width={6} height={8} fill="#C77D00" />
      <Rect x={14} y={34} width={20} height={7} rx={2} fill="#F4A340" />
      <Path
        d="M24 9l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function SponsorIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 48 48">
      <Rect x={7} y={18} width={34} height={23} rx={3} fill="#7A6CFF" />
      <Rect x={5} y={12} width={38} height={9} rx={3} fill="#B39BFF" />
      <Rect x={21} y={12} width={6} height={29} fill="#FFFFFF" opacity={0.85} />
      <Path
        d="M24 12c-3-7-11-8-11-3s8 3 11 3c3 0 11 2 11-3s-8-4-11 3z"
        fill="none"
        stroke="#B39BFF"
        strokeWidth={2.6}
      />
    </Svg>
  );
}

const ITEMS: { key: DiscoverShortcut; labelKey: string; Icon: () => React.ReactElement }[] = [
  { key: 'clubs', labelKey: 'discover.tabClubs', Icon: ClubIcon },
  { key: 'coaches', labelKey: 'discover.tabCoaches', Icon: CoachIcon },
  { key: 'challenges', labelKey: 'challenges.title', Icon: ChallengeIcon },
  { key: 'leaderboard', labelKey: 'discover.tabLeaderboard', Icon: TrophyIcon },
  { key: 'sponsors', labelKey: 'sponsorship.tabSponsors', Icon: SponsorIcon },
];

interface Props {
  onOpen: (shortcut: DiscoverShortcut) => void;
}

/**
 * The five ways into the people side of Discover, in one white bar under the
 * search. Each opens its own page; the clips stay on Discover itself.
 */
export function DiscoverShortcuts({ onOpen }: Props) {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        ...theme.raised('card'),
      }}
      testID="discover-shortcuts"
    >
      {ITEMS.map(({ key, labelKey, Icon }) => (
        <Pressable
          key={key}
          onPress={() => onOpen(key)}
          accessibilityRole="button"
          accessibilityLabel={t(labelKey)}
          testID={`discover-shortcut-${key}`}
          style={({ pressed }) => ({
            flex: 1,
            alignItems: 'center',
            gap: spacing.xs,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon />
          <Text variant="captionStrong" tone="secondary" numberOfLines={1} style={{ fontSize: 11 }}>
            {t(labelKey)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
