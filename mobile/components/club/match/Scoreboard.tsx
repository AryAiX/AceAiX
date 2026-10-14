import React from 'react';
import { Pressable, View } from 'react-native';
import { BadgeCheck, MapPin, Trophy } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AnimatedGradient, AnimatedNumber, Pulse, Text } from '@/components/ui';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { sportEmoji } from '@/constants/sports';
import { useT } from '@/i18n';
import type { ClubMatch } from '@/lib/api.club';
import { clubInitials, isLive, scoreLine } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { currentLanguage } from '@/lib/i18n-bridge';
import { metaLine } from '@/lib/format';

import { dateTimeLabel, periodLabel } from './matchFormat';

interface Props {
  match: ClubMatch;
  club: { id: string; name: string; logo_url: string | null; is_verified: boolean };
  onOpenClub: () => void;
}

/**
 * The top of a match page: the two sides in home–away order, the score big
 * enough to read from across a room, and what state the game is in.
 */
export function Scoreboard({ match, club, onOpenClub }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const locale = currentLanguage();

  const live = isLive(match.status);
  const started = live || match.status === 'finished';
  const score = scoreLine(match);
  const onBrand = colors.textOnBrand;
  const soft = 'rgba(255,255,255,0.82)';

  const ours = (
    <Pressable
      onPress={onOpenClub}
      accessibilityRole="link"
      accessibilityLabel={t('clubMatch.match.openClub', { name: club.name })}
      hitSlop={6}
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: spacing.sm, opacity: pressed ? 0.75 : 1 })}
    >
      <ClubLogo uri={club.logo_url} name={club.name} size="lg" style={{ borderWidth: 2, borderColor: soft }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' }}>
        <Text variant="captionStrong" color={onBrand} numberOfLines={2} align="center" style={{ flexShrink: 1 }}>
          {club.name}
        </Text>
        {club.is_verified ? <BadgeCheck size={14} color={onBrand} strokeWidth={2.4} /> : null}
      </View>
    </Pressable>
  );

  const theirs = (
    <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radii.lg,
          borderWidth: 2,
          borderColor: soft,
          backgroundColor: 'rgba(255,255,255,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text variant="title" color={onBrand}>
          {clubInitials(match.opponent_name)}
        </Text>
      </View>
      <Text variant="captionStrong" color={onBrand} numberOfLines={2} align="center">
        {match.opponent_name}
      </Text>
    </View>
  );

  const homeName = match.is_home ? club.name : match.opponent_name;
  const awayName = match.is_home ? match.opponent_name : club.name;
  const clock =
    live && match.status === 'live'
      ? metaLine(
          match.minute != null ? t('clubMatch.match.minute', { minute: match.minute }) : null,
          periodLabel(t, match.period),
        )
      : '';

  return (
    <AnimatedGradient
      colors={live ? theme.gradients.action : theme.gradients.hero}
      radius={radii.xl}
      period={live ? 6 : 12}
      style={{ padding: spacing.xl, gap: spacing.lg }}
      testID="match-scoreboard"
    >
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <StatusPill status={match.status} />
        {clock ? (
          <Text variant="captionStrong" color={onBrand}>
            {clock}
          </Text>
        ) : null}
        {!started && match.status === 'scheduled' ? (
          <Text variant="captionStrong" color={onBrand}>
            {dateTimeLabel(match.kickoff_at, locale)}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {match.is_home ? ours : theirs}

        <View
          style={{ alignItems: 'center', minWidth: 112 }}
          accessible
          accessibilityLabel={
            started
              ? t('clubMatch.match.scoreA11y', {
                  home: homeName,
                  homeScore: score.home,
                  away: awayName,
                  awayScore: score.away,
                })
              : t('clubMatch.match.vs')
          }
        >
          {started ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <AnimatedNumber value={score.home} variant="hero" color={onBrand} />
              <Text variant="title" color={soft}>
                –
              </Text>
              <AnimatedNumber value={score.away} variant="hero" color={onBrand} />
            </View>
          ) : (
            <Text variant="display" color={onBrand}>
              {t('clubMatch.match.vs')}
            </Text>
          )}
        </View>

        {match.is_home ? theirs : ours}
      </View>

      <View style={{ alignItems: 'center', gap: 4 }}>
        {match.competition || match.category ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Trophy size={14} color={soft} />
            <Text variant="caption" color={soft} numberOfLines={1}>
              {metaLine(
                `${sportEmoji(match.sport)} ${match.competition ?? ''}`.trim(),
                clubLabel(t, 'category', match.category),
              )}
            </Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <MapPin size={14} color={soft} />
          <Text variant="caption" color={soft} numberOfLines={2} style={{ flexShrink: 1 }}>
            {metaLine(match.is_home ? t('clubMatch.match.home') : t('clubMatch.match.away'), match.venue)}
          </Text>
        </View>
      </View>
    </AnimatedGradient>
  );
}

/** LIVE with a beating dot, or the plain state of the game. */
export function StatusPill({ status }: { status: ClubMatch['status'] }) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const live = status === 'live';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: radii.pill,
        backgroundColor: live ? colors.surface : 'rgba(255,255,255,0.2)',
      }}
      accessibilityRole="text"
      accessibilityLabel={clubLabel(t, 'matchStatus', status)}
    >
      {live ? (
        <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Pulse color={colors.danger} size={10} period={1.4} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />
        </View>
      ) : null}
      <Text variant="overline" color={live ? colors.danger : colors.textOnBrand}>
        {clubLabel(t, 'matchStatus', status)}
      </Text>
    </View>
  );
}
