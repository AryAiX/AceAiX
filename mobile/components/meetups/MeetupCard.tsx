import React from 'react';
import { View } from 'react-native';
import { CalendarDays, MapPin, Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Badge, Card, Tappable, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { deadlineLabel, metaLine } from '@/lib/format';
import type { MeetupStatus, MyMeetupStatus } from '@/lib/api.meetups';

/**
 * Only what the row draws.
 *
 * Declared structurally rather than as `MeetupCard`, so the "Mine" tab — whose
 * rows come from `my_meetups` and carry no host or country — can pass what it
 * has instead of being cast into a shape it is not.
 */
export interface MeetupRowData {
  id: string;
  title: string;
  city: string;
  area?: string | null;
  venue?: string | null;
  starts_at: string;
  spots_total: number;
  spots_taken: number;
  spots_left: number;
  status: MeetupStatus;
  my_status?: MyMeetupStatus | null;
  host_name?: string | null;
  host_avatar?: string | null;
  cost_note?: string | null;
}

/**
 * One game, as a row in a list.
 *
 * The number that matters is how many spots are left, so it is the only thing
 * on the card wearing a colour, and it changes colour as the game fills:
 * plenty of room reads calm, one spot left reads urgent. That is the whole
 * reason somebody scrolls this list.
 */

export function MeetupRow({
  meetup,
  onPress,
}: {
  meetup: MeetupRowData;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();

  const left = meetup.spots_left;
  const full = left <= 0 || meetup.status === 'full';

  /* Three states, because "2 left" and "12 left" are different decisions:
     nearly full is worth hurrying for, and full is worth not tapping. */
  const spotsColour = full
    ? colors.textMuted
    : left <= 2
      ? colors.play.flame
      : left <= 5
        ? colors.play.amber
        : colors.play.mint;

  const where = metaLine(meetup.venue, meetup.area, meetup.city);
  const when = deadlineLabel(meetup.starts_at);

  return (
    <Tappable
      onPress={onPress}
      accessibilityLabel={t('meetups.a11yCard', {
        title: meetup.title,
        city: meetup.city,
        spots: full ? t('meetups.full') : t('meetups.spotsLeft', { count: left }),
      })}
    >
      <Card padded>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Avatar
            uri={meetup.host_avatar}
            name={meetup.host_name}
            size="md"
          />

          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {meetup.title}
            </Text>

            {where ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} color={colors.textMuted} />
                <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                  {where}
                </Text>
              </View>
            ) : null}

            {when ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <CalendarDays size={13} color={colors.textMuted} />
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {when}
                  {meetup.cost_note
                    ? ` · ${t('meetups.costEach', { cost: meetup.cost_note })}`
                    : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* The count, and nothing competing with it. */}
          <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={14} color={spotsColour} />
              <Text variant="bodyStrong" color={spotsColour}>
                {t('meetups.spotsOf', {
                  taken: meetup.spots_taken,
                  total: meetup.spots_total,
                })}
              </Text>
            </View>
            <Text variant="caption" color={spotsColour} numberOfLines={1}>
              {full ? t('meetups.full') : t('meetups.spotsLeft', { count: left })}
            </Text>
          </View>
        </View>

        {meetup.my_status && meetup.my_status !== 'declined' ? (
          <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
            <Badge
              label={t(
                meetup.my_status === 'host'
                  ? 'meetups.youAreHosting'
                  : meetup.my_status === 'joined'
                    ? 'meetups.joined'
                    : 'meetups.requested',
              )}
              tone={meetup.my_status === 'requested' ? 'neutral' : 'success'}
            />
          </View>
        ) : null}
      </Card>
    </Tappable>
  );
}
