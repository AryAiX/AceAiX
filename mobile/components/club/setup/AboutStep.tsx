import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Input } from '@/components/ui';
import { useT } from '@/i18n';
import { LIMITS, type ClubDraft } from '@/lib/clubSetup';
import { counter } from './Bits';

/** The long About tab: the story, the mission, how they coach, the league. */
export function AboutFields({
  draft,
  onChange,
}: {
  draft: ClubDraft;
  onChange: (patch: Partial<ClubDraft>) => void;
}) {
  const { spacing } = useTheme();
  const t = useT();

  return (
    <View style={{ gap: spacing.xl }}>
      <Input
        label={t('clubSetup.about.leagueLabel')}
        value={draft.league}
        onChangeText={(league) => onChange({ league })}
        placeholder={t('clubSetup.about.leaguePlaceholder')}
        maxLength={LIMITS.league}
        testID="club-edit-league"
      />
      <Input
        label={t('clubSetup.about.storyLabel')}
        value={draft.about_story}
        onChangeText={(about_story) => onChange({ about_story })}
        placeholder={t('clubSetup.about.storyPlaceholder')}
        hint={counter(t, draft.about_story, LIMITS.aboutStory)}
        maxLength={LIMITS.aboutStory}
        multiline
        testID="club-edit-story"
      />
      <Input
        label={t('clubSetup.about.missionLabel')}
        value={draft.mission}
        onChangeText={(mission) => onChange({ mission })}
        placeholder={t('clubSetup.about.missionPlaceholder')}
        hint={counter(t, draft.mission, LIMITS.mission)}
        maxLength={LIMITS.mission}
        multiline
        testID="club-edit-mission"
      />
      <Input
        label={t('clubSetup.about.philosophyLabel')}
        value={draft.philosophy}
        onChangeText={(philosophy) => onChange({ philosophy })}
        placeholder={t('clubSetup.about.philosophyPlaceholder')}
        hint={counter(t, draft.philosophy, LIMITS.philosophy)}
        maxLength={LIMITS.philosophy}
        multiline
        testID="club-edit-philosophy"
      />
    </View>
  );
}
