import React from 'react';
import { ViewStyle } from 'react-native';
import { CalendarClock } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { deadlineLabel } from '@/lib/format';

/** Whole days until a deadline. Negative once it has passed. */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const end = new Date(date).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

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
