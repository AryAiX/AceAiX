import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Input, Text } from '@/components/ui';
import { TeamPicker } from '@/components/teams/TeamPicker';
import { useT } from '@/i18n';
import type { Team } from '@/types/models';

/**
 * The last question in the wizard, and the only one that is pure enjoyment.
 *
 * It comes after the measurements and the guardian form on purpose: by then the
 * person has answered a lot of things about themselves that felt like a form,
 * and this one does not. It is also the question that gives the feed something
 * to show on day one, before they have posted anything.
 *
 * The body copy has one job — to say this is *not* where they play. Somebody
 * typing "Real Madrid" into their current club is a bad row in a scout's search
 * results, and this step is the reason they will not.
 */
export function TeamsStep({
  sport,
  teams,
  venue,
  onChangeTeams,
  onChangeVenue,
}: {
  sport: string | null;
  teams: Team[];
  venue: string;
  onChangeTeams: (teams: Team[]) => void;
  onChangeVenue: (venue: string) => void;
}) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="title">{t('teams.stepTitle')}</Text>
        <Text variant="body" tone="secondary">
          {t('teams.stepBody')}
        </Text>
      </View>

      <TeamPicker value={teams} onChange={onChangeTeams} sport={sport} />

      <View style={{ gap: spacing.sm }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="subheading">{t('teams.venueTitle')}</Text>
          <Text variant="caption" tone="secondary">
            {t('teams.venueBody')}
          </Text>
        </View>
        <Input
          placeholder={t('teams.venuePlaceholder')}
          value={venue}
          onChangeText={onChangeVenue}
          maxLength={80}
          testID="favourite-venue"
        />
      </View>
    </View>
  );
}
