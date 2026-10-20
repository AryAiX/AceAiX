import React from 'react';
import { Pressable, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { IconButton, Reveal, Text } from '@/components/ui';
import { sportEmoji } from '@/constants/sports';
import { useT } from '@/i18n';
import type { MatchEvent } from '@/lib/api.club';
import { SCORING_KINDS, type MatchEventKind } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';

interface Props {
  events: MatchEvent[];
  sport: string;
  /** Our side sits at the start when we are at home, at the end when away. */
  isHome: boolean;
  canScore: boolean;
  onOpenProfile: (userId: string) => void;
  onDelete: (event: MatchEvent) => void;
}

function KindIcon({ kind, sport }: { kind: MatchEventKind; sport: string }) {
  const { colors } = useTheme();
  if (kind === 'yellow_card' || kind === 'red_card') {
    return (
      <View
        style={{
          width: 14,
          height: 19,
          borderRadius: 3,
          backgroundColor: kind === 'yellow_card' ? colors.warning : colors.danger,
        }}
      />
    );
  }
  const emoji: Record<MatchEventKind, string> = {
    goal: sportEmoji(sport),
    penalty_goal: '🎯',
    own_goal: sportEmoji(sport),
    point: '➕',
    yellow_card: '',
    red_card: '',
    substitution: '🔄',
    timeout: '⏱️',
    period: '⏸️',
    note: '📝',
  };
  return <Text style={{ fontSize: 18, lineHeight: 22 }}>{emoji[kind]}</Text>;
}

/**
 * What happened, newest first. Each side's moments sit on that side of the
 * board, so a glance tells you who is having the better half.
 */
export function MatchTimeline({ events, sport, isHome, canScore, onOpenProfile, onDelete }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();

  const ordered = [...events].sort((a, b) => {
    const ma = a.minute ?? -1;
    const mb = b.minute ?? -1;
    if (ma !== mb) return mb - ma;
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <View style={{ gap: spacing.sm }} testID="match-timeline">
      {ordered.map((event, index) => {
        const label = clubLabel(t, 'matchEvent', event.kind);
        const minute = event.minute != null ? t('clubMatch.match.minute', { minute: event.minute }) : '';
        const neutral = event.kind === 'period' || (event.kind === 'note' && !event.player_name);
        const atStart = neutral ? false : (event.side === 'us') === isHome;
        const scoring = SCORING_KINDS.includes(event.kind);
        const pointsTag = event.kind === 'point' ? t('clubMatch.match.points', { points: event.points }) : '';
        const name = event.player_name;
        const nameNode = name ? (
          event.player_user_id ? (
            <Pressable
              onPress={() => onOpenProfile(event.player_user_id as string)}
              accessibilityRole="link"
              accessibilityLabel={t('clubMatch.match.openProfile', { name })}
              hitSlop={8}
            >
              <Text variant="bodyStrong" tone="primary" numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
          ) : (
            <Text variant="bodyStrong" numberOfLines={1}>
              {name}
            </Text>
          )
        ) : null;

        const remove = canScore ? (
          <IconButton
            icon={<Trash2 size={18} color={colors.textMuted} />}
            label={t('clubMatch.match.deleteEvent')}
            tone="transparent"
            onPress={() => onDelete(event)}
            testID={`match-event-delete-${event.id}`}
          />
        ) : null;

        if (neutral) {
          return (
            <Reveal key={event.id} index={Math.min(index, 6)}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.xs,
                }}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                <KindIcon kind={event.kind} sport={sport} />
                <Text variant="captionStrong" tone="secondary" style={{ flexShrink: 1 }}>
                  {[minute, event.detail || label].filter(Boolean).join(' · ')}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
                {remove}
              </View>
            </Reveal>
          );
        }

        return (
          <Reveal key={event.id} index={Math.min(index, 6)} from={atStart ? 'left' : 'right'}>
            <View
              style={{
                flexDirection: atStart ? 'row' : 'row-reverse',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  flexDirection: atStart ? 'row' : 'row-reverse',
                  alignItems: 'center',
                  gap: spacing.md,
                  maxWidth: '82%',
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: radii.md,
                  backgroundColor: scoring ? colors.primarySoft : colors.surface,
                  borderWidth: 1,
                  borderColor: scoring ? colors.primaryBorder : colors.border,
                }}
                accessible={!event.player_user_id}
                accessibilityLabel={[minute, label, pointsTag, name, event.detail].filter(Boolean).join(', ')}
              >
                <Text variant="stat" tone={scoring ? 'primary' : 'secondary'} style={{ minWidth: 34 }} align="center">
                  {minute || '–'}
                </Text>
                <KindIcon kind={event.kind} sport={sport} />
                <View style={{ flexShrink: 1, alignItems: atStart ? 'flex-start' : 'flex-end' }}>
                  <Text variant="captionStrong" tone="secondary" numberOfLines={1}>
                    {[label, pointsTag].filter(Boolean).join(' ')}
                  </Text>
                  {nameNode}
                  {event.detail ? (
                    <Text variant="caption" tone="muted" numberOfLines={2}>
                      {event.detail}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={{ flex: 1 }} />
              {remove}
            </View>
          </Reveal>
        );
      })}
    </View>
  );
}
