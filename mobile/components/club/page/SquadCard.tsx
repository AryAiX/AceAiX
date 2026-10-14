import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, ShieldCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Card, Text } from '@/components/ui';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import type { ClubSquad, SquadPerson } from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import { Routes } from '@/lib/routes';

function PersonRow({ person }: { person: SquadPerson }) {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const router = useRouter();
  const userId = person.user_id;

  const detail =
    person.kind === 'staff'
      ? clubLabel(t, 'staffRole', person.staff_role ?? 'other')
      : person.position
        ? positionLabel(t, person.position)
        : null;

  const lead =
    person.kind === 'player' ? (
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radii.sm,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="captionStrong" tone="secondary">
          {person.shirt_number != null ? String(person.shirt_number) : '–'}
        </Text>
      </View>
    ) : (
      <Avatar uri={person.avatar_url} name={person.display_name} size="xs" />
    );

  const content = (
    <>
      {lead}
      <View style={{ flex: 1 }}>
        <Text variant="captionStrong" numberOfLines={1}>
          {person.display_name}
        </Text>
        {detail ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {userId ? <ChevronRight size={16} color={colors.textMuted} /> : null}
    </>
  );

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    minHeight: theme.hit.min,
  };

  if (!userId) return <View style={rowStyle}>{content}</View>;
  return (
    <Pressable
      onPress={() => router.push(Routes.profile(userId))}
      accessibilityRole="button"
      accessibilityLabel={person.display_name}
      style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.7 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

/** One squad: staff on top, then players by shirt number. */
export function SquadCard({ squad, showYouthNote }: { squad: ClubSquad; showYouthNote: boolean }) {
  const t = useT();
  const { colors, spacing } = useTheme();

  const title = [clubLabel(t, 'category', squad.category), sportLabel(t, squad.sport)].join(' · ');
  const empty = squad.staff.length === 0 && squad.players.length === 0;

  return (
    <Card level={1} style={{ gap: spacing.md }} testID={`club-squad-${squad.id}`}>
      <View style={{ gap: 2 }}>
        <Text variant="subheading">{title}</Text>
        {squad.name ? (
          <Text variant="caption" tone="secondary">
            {squad.name}
          </Text>
        ) : null}
      </View>

      {squad.is_youth && showYouthNote ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <ShieldCheck size={14} color={colors.info} />
          <Text variant="caption" tone="info" style={{ flex: 1 }}>
            {t('club.squads.youthNote')}
          </Text>
        </View>
      ) : null}

      {empty ? (
        <Text variant="caption" tone="muted">
          {t('club.squads.emptySquad')}
        </Text>
      ) : null}

      {squad.staff.length > 0 ? (
        <View>
          <Text variant="overline" tone="muted">
            {t('club.squads.staff')}
          </Text>
          {squad.staff.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
        </View>
      ) : null}

      {squad.players.length > 0 ? (
        <View>
          <Text variant="overline" tone="muted">
            {t('club.squads.players')}
          </Text>
          {squad.players.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}
