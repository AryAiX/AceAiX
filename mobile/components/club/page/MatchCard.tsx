import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Pulse, Text } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import type { ClubMatch } from '@/lib/api.club';
import { isLive, matchOutcome, scoreLine } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { whenLabel } from './shared';

/** A small dot that breathes: the one sign of "happening now" on the page. */
export function LiveDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size * 2, height: size * 2, alignItems: 'center', justifyContent: 'center' }}>
      <Pulse color={color} size={size * 2} period={1.4} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

const OUTCOME: Record<'win' | 'draw' | 'loss', { key: string; a11y: string; tone: BadgeTone }> = {
  win: { key: 'club.matches.win', a11y: 'club.matches.winA11y', tone: 'success' },
  draw: { key: 'club.matches.draw', a11y: 'club.matches.drawA11y', tone: 'neutral' },
  loss: { key: 'club.matches.loss', a11y: 'club.matches.lossA11y', tone: 'danger' },
};

function StatusPill({ match }: { match: ClubMatch }) {
  const t = useT();
  const { colors, radii, spacing } = useTheme();
  const label = clubLabel(t, 'matchStatus', match.status);

  if (isLive(match.status)) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          paddingStart: spacing.xs,
          paddingEnd: spacing.sm,
          borderRadius: radii.pill,
          backgroundColor: colors.dangerSoft,
        }}
      >
        <LiveDot color={colors.danger} size={6} />
        <Text variant="overline" color={colors.danger}>
          {match.minute != null && match.status === 'live'
            ? `${label} · ${t('club.matches.minute', { n: match.minute })}`
            : label}
        </Text>
      </View>
    );
  }

  const tone: BadgeTone =
    match.status === 'cancelled' ? 'danger' : match.status === 'postponed' ? 'warning' : 'neutral';
  return <Badge label={label} tone={tone} />;
}

/**
 * One fixture or result, home side first. The club's own name is bold so a
 * glance finds "us" on either side.
 */
export function MatchCard({ match, clubName }: { match: ClubMatch; clubName: string }) {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();

  const live = isLive(match.status);
  const showScore = live || match.status === 'finished';
  const { home, away } = scoreLine(match);
  const homeName = match.is_home ? clubName : match.opponent_name;
  const awayName = match.is_home ? match.opponent_name : clubName;
  const outcome = matchOutcome(match);

  const sideRow = (name: string, score: number, ours: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Text
        variant={ours ? 'bodyStrong' : 'body'}
        tone={ours ? 'default' : 'secondary'}
        style={{ flex: 1 }}
        numberOfLines={1}
      >
        {name}
      </Text>
      {showScore ? (
        <Text variant="stat" color={live ? colors.danger : colors.text}>
          {score}
        </Text>
      ) : null}
    </View>
  );

  const meta = metaLine(
    match.competition,
    match.category ? clubLabel(t, 'category', match.category) : null,
    sportLabel(t, match.sport),
  );

  return (
    <Card
      level={live ? 2 : 1}
      onPress={() => router.push(Routes.match(match.id))}
      accessibilityRole="button"
      accessibilityLabel={t('club.matches.cardA11y', {
        home: homeName,
        away: awayName,
        when: whenLabel(match.kickoff_at),
      })}
      style={{
        gap: spacing.sm,
        ...(live ? { borderWidth: 1.5, borderColor: colors.danger } : null),
      }}
      testID={`club-match-${match.id}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          {meta ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        {outcome ? (
          <View accessible accessibilityLabel={t(OUTCOME[outcome].a11y)}>
            <Badge label={t(OUTCOME[outcome].key)} tone={OUTCOME[outcome].tone} solid />
          </View>
        ) : null}
        <StatusPill match={match} />
      </View>

      <View style={{ gap: 2 }}>
        {sideRow(homeName, home, match.is_home)}
        {sideRow(awayName, away, !match.is_home)}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
        <Text variant="caption" tone="secondary">
          {whenLabel(match.kickoff_at)}
        </Text>
        {match.venue ? (
          <>
            <MapPin size={12} color={colors.textMuted} style={{ marginStart: spacing.sm }} />
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
              {match.venue}
            </Text>
          </>
        ) : null}
      </View>
    </Card>
  );
}
