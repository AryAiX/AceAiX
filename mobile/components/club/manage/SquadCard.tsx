import React from 'react';
import { Pressable, View } from 'react-native';
import { ClipboardList, Link2, Shirt, Trash2, UserPlus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Button, Card, Divider, IconButton, Text } from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import type { ClubSquad, SquadPerson } from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';

function LinkBadge({ status }: { status: SquadPerson['link_status'] }) {
  const t = useT();
  if (status === 'invited') return <Badge label={t('clubManage.squads.linkInvited')} tone="warning" />;
  if (status === 'accepted')
    return <Badge label={t('clubManage.squads.linkLinked')} tone="success" />;
  if (status === 'declined') return <Badge label={t('clubManage.squads.linkDeclined')} tone="neutral" />;
  return null;
}

function PersonRow({ person, onPress }: { person: SquadPerson; onPress: () => void }) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const t = useT();
  const sub =
    person.kind === 'staff'
      ? clubLabel(t, 'staffRole', person.staff_role ?? 'other')
      : positionLabel(t, person.position);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[person.display_name, sub].filter(Boolean).join(', ')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: theme.hit.comfortable,
        paddingVertical: spacing.xs,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radii.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: person.kind === 'staff' ? colors.infoSoft : colors.primarySoft,
        }}
      >
        {person.kind === 'staff' ? (
          <ClipboardList size={18} color={colors.info} />
        ) : person.shirt_number != null ? (
          <Text variant="captionStrong" tone="primary">
            {String(person.shirt_number)}
          </Text>
        ) : (
          <Shirt size={18} color={colors.primary} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {person.display_name}
        </Text>
        {sub ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {person.link_status && person.link_status !== 'none' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Link2 size={14} color={colors.textMuted} />
          <LinkBadge status={person.link_status} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** One squad on the page team's Squads screen: staff, players, and the ways to add to both. */
export function SquadCard({
  squad,
  onOpenPerson,
  onAdd,
  onDelete,
}: {
  squad: ClubSquad;
  onOpenPerson: (person: SquadPerson) => void;
  onAdd: (kind: 'player' | 'staff') => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const title = squad.name?.trim() || clubLabel(t, 'category', squad.category);

  return (
    <Card padded level={1} style={{ gap: spacing.md }} testID={`club-squad-${squad.id}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subheading" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" tone="muted">
            {[sportLabel(t, squad.sport), squad.name ? clubLabel(t, 'category', squad.category) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        {squad.is_youth ? <Badge label={t('clubManage.squads.youth')} tone="info" /> : null}
        <IconButton
          icon={<Trash2 size={18} color={colors.danger} />}
          label={t('clubManage.squads.deleteSquad')}
          tone="transparent"
          onPress={onDelete}
        />
      </View>

      {squad.is_youth ? <InfoNote icon="shield">{t('clubManage.squads.youthNote')}</InfoNote> : null}

      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" tone="muted">
          {t('clubManage.squads.staff')}
        </Text>
        {squad.staff.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('clubManage.squads.noStaff')}
          </Text>
        ) : (
          squad.staff.map((p) => <PersonRow key={p.id} person={p} onPress={() => onOpenPerson(p)} />)
        )}
      </View>

      <Divider />

      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" tone="muted">
          {t('clubManage.squads.playersCount', { count: squad.players.length })}
        </Text>
        {squad.players.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('clubManage.squads.noPlayers')}
          </Text>
        ) : (
          squad.players.map((p) => <PersonRow key={p.id} person={p} onPress={() => onOpenPerson(p)} />)
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label={t('clubManage.squads.addPlayer')}
          size="sm"
          icon={<UserPlus size={16} color={colors.textOnBrand} />}
          onPress={() => onAdd('player')}
          style={{ flex: 1 }}
          testID={`club-squad-add-player-${squad.id}`}
        />
        <Button
          label={t('clubManage.squads.addStaff')}
          size="sm"
          variant="secondary"
          onPress={() => onAdd('staff')}
          style={{ flex: 1 }}
          testID={`club-squad-add-staff-${squad.id}`}
        />
      </View>
    </Card>
  );
}
