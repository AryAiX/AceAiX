import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Card, Chip, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { SportTile } from '@/components/onboarding/Shared';
import { SPORTS, sportEmoji, sportLabel } from '@/constants/sports';
import { CATEGORY_PRESETS } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { LIMITS, toggleCategory, toggleSport, type ClubDraft } from '@/lib/clubSetup';
import { AddOwnInput, GroupLabel } from './Bits';

/** Step 3: the sports the club runs, and the age groups or teams in each. */
export function SportsFields({
  draft,
  showError,
  onChange,
}: {
  draft: ClubDraft;
  /** They tried to move on with nothing picked. */
  showError: boolean;
  onChange: (patch: Partial<ClubDraft>) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { spacing } = theme;
  const chosen = new Set(draft.sports.map((s) => s.sport));

  return (
    <View style={{ gap: spacing.xxl }}>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {SPORTS.map((sport) => (
            <SportTile
              key={sport.key}
              label={sportLabel(t, sport.key)}
              emoji={sport.emoji}
              control="checkbox"
              selected={chosen.has(sport.key)}
              onPress={() => onChange({ sports: toggleSport(draft.sports, sport.key) })}
            />
          ))}
        </View>
        {showError && draft.sports.length === 0 ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {t('clubSetup.sports.required')}
          </Text>
        ) : null}
      </View>

      {draft.sports.map((entry) => {
        const presetKeys = new Set(CATEGORY_PRESETS.map((c) => c.toLowerCase()));
        const custom = entry.categories.filter((c) => !presetKeys.has(c.toLowerCase()));
        const has = (c: string) => entry.categories.some((x) => x.toLowerCase() === c.toLowerCase());
        const name = sportLabel(t, entry.sport);

        return (
          <Card key={entry.sport} tone="alt" style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text variant="heading">{sportEmoji(entry.sport)}</Text>
              <Text variant="subheading" style={{ flex: 1 }}>
                {name}
              </Text>
              <Text variant="caption" tone="muted">
                {t('clubSetup.sports.picked', { count: entry.categories.length })}
              </Text>
            </View>
            <GroupLabel>{t('clubSetup.sports.categoriesLabel')}</GroupLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {[...CATEGORY_PRESETS, ...custom].map((category) => (
                <Chip
                  key={category}
                  label={clubLabel(t, 'category', category)}
                  selected={has(category)}
                  onPress={() =>
                    onChange({ sports: toggleCategory(draft.sports, entry.sport, category) })
                  }
                  style={{ minHeight: theme.hit.min }}
                />
              ))}
            </View>
            {entry.categories.length < LIMITS.categories ? (
              <AddOwnInput
                placeholder={t('clubSetup.sports.customPlaceholder')}
                maxLength={LIMITS.category}
                accessibilityLabel={t('clubSetup.sports.customA11y', { sport: name })}
                onAdd={(value) => {
                  if (has(value)) return;
                  onChange({ sports: toggleCategory(draft.sports, entry.sport, value) });
                }}
              />
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}
