import React from 'react';
import { View, ViewStyle } from 'react-native';
import { CalendarClock, Clock } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Text } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { daysUntil, deadlineLabel } from '@/lib/format';
import { Tag, useTagInk } from './Tag';

export { daysUntil };

export function isClosed(date: string | null | undefined): boolean {
  const days = daysUntil(date);
  return days != null && days < 0;
}

/**
 * The deadline, coloured by how much time is left.
 *
 * Urgency is the one thing a teenager scanning a list must not have to work
 * out: inside three days it goes amber, once it has passed it goes red.
 */
export function DeadlineChip({
  deadline,
  size = 'sm',
  style,
}: {
  deadline: string | null | undefined;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}) {
  const { colors } = useTheme();

  const label = deadlineLabel(deadline);
  if (!label) return null;

  const days = daysUntil(deadline);
  const tone: BadgeTone =
    days == null ? 'neutral' : days < 0 ? 'danger' : days <= 3 ? 'warning' : 'neutral';
  const iconColor =
    tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.textSecondary;

  return (
    <Badge
      label={label}
      tone={tone}
      size={size}
      style={style}
      icon={<CalendarClock size={size === 'sm' ? 11 : 13} color={iconColor} strokeWidth={2.4} />}
    />
  );
}

/**
 * The time left on a trial, as the board shows it.
 *
 * Orange while it is counting down (two weeks or less), red once it has
 * passed, and plain grey with the date when it is still far off — so the
 * orange on a card always means "this one is closing".
 */
export function DaysLeftTag({
  deadline,
  size = 'sm',
}: {
  deadline: string | null | undefined;
  size?: 'sm' | 'md';
}) {
  const days = daysUntil(deadline);
  const tone = days == null ? 'neutral' : days < 0 ? 'danger' : days <= 14 ? 'warm' : 'neutral';
  const ink = useTagInk(tone);

  const label = deadlineLabel(deadline);
  if (!label) return null;

  return (
    <Tag
      label={label}
      tone={tone}
      size={size}
      icon={<Clock size={size === 'sm' ? 12 : 14} color={ink} strokeWidth={2.4} />}
    />
  );
}

/**
 * The time left as a quiet line of text with a clock, for the compact trial
 * card. Same colours as DaysLeftTag: orange while closing, red once passed,
 * grey when still far off.
 */
export function DaysLeftText({ deadline }: { deadline: string | null | undefined }) {
  const days = daysUntil(deadline);
  const tone = days == null ? 'neutral' : days < 0 ? 'danger' : days <= 14 ? 'warm' : 'neutral';
  const ink = useTagInk(tone);
  const { colors } = useTheme();
  const label = deadlineLabel(deadline);
  if (!label) return null;
  const color = tone === 'neutral' ? colors.textMuted : ink;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Clock size={13} color={color} strokeWidth={2.4} />
      <Text variant={tone === 'neutral' ? 'caption' : 'captionStrong'} color={color} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
