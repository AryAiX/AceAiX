import React from 'react';
import { View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { Translate } from '@/lib/i18n-bridge';
import type { ApplicationStatus } from '@/types/models';

/**
 * Where an application stands.
 *
 * Written twice on purpose: the athlete who sent it and the recruiter reviewing
 * it are looking at the same row and need different words. "Rejected" is a fact
 * on a scout's list; on a 15-year-old's screen it is a sentence. The two voices
 * are separate keys and must stay separate in every language.
 *
 * The status itself is a stored value and is never translated — only the label
 * a person reads.
 *
 * This is a Badge in every respect but one — a withdrawn application has to
 * read as switched off, and the shared Badge has no muted tone.
 */

export type StatusVoice = 'athlete' | 'recruiter';

type Tone = 'neutral' | 'muted' | 'info' | 'warning' | 'success' | 'danger';

const STATUSES: Record<ApplicationStatus, { tone: Tone }> = {
  applied: { tone: 'neutral' },
  in_review: { tone: 'info' },
  shortlisted: { tone: 'warning' },
  invited: { tone: 'success' },
  rejected: { tone: 'danger' },
  withdrawn: { tone: 'muted' },
};

export function statusLabel(
  t: Translate,
  status: ApplicationStatus,
  voice: StatusVoice = 'athlete',
): string {
  const known = STATUSES[status] ? status : 'applied';
  return t(`opportunities.status.${voice}.${known}`);
}

export function ApplicationStatusBadge({
  status,
  voice = 'athlete',
  style,
}: {
  status: ApplicationStatus;
  voice?: StatusVoice;
  style?: ViewStyle;
}) {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  const entry = STATUSES[status] ?? STATUSES.applied;

  const skin: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary },
    muted: { bg: colors.surfaceSunken, fg: colors.textMuted },
    info: { bg: colors.infoSoft, fg: colors.info },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };
  const { bg, fg } = skin[entry.tone];

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: bg,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Text variant="overline" color={fg}>
        {statusLabel(t, status, voice)}
      </Text>
    </View>
  );
}
