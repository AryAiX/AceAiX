import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';

export type TagTone = 'blue' | 'neutral' | 'warm' | 'danger';

/**
 * A small sentence-case tag for the trials board: the type, the sport, the
 * place, the time left.
 *
 * Badge's small size is all caps, which shouts on a card with four of them;
 * these read as words. Warm is kept for time running out, so a list of trials
 * has one orange thing per card at most.
 */
export function Tag({
  label,
  tone = 'neutral',
  icon,
  size = 'sm',
}: {
  label: string;
  tone?: TagTone;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const fg = useTagInk(tone);
  const bg =
    tone === 'blue'
      ? colors.primarySoft
      : tone === 'warm'
        ? theme.alpha(theme.play.flame, 0.14)
        : tone === 'danger'
          ? colors.dangerSoft
          : colors.surfaceAlt;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        backgroundColor: bg,
        borderRadius: radii.pill,
        paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
        paddingVertical: size === 'sm' ? 4 : 6,
      }}
    >
      {icon}
      <Text variant="captionStrong" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** The word colour for a tone, for an icon drawn beside the label. */
export function useTagInk(tone: TagTone): string {
  const theme = useTheme();
  const { colors } = theme;
  if (tone === 'blue') return colors.primary;
  if (tone === 'danger') return colors.danger;
  if (tone === 'warm') return theme.scheme === 'dark' ? theme.play.flame : '#D9480F';
  return colors.textSecondary;
}
