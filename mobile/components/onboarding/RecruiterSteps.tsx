import React, { useMemo, useRef } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip, Input, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { SPORTS, positionLabel, positionsFor, sportLabel } from '@/constants/sports';
import { CountryPicker, SportTile, StepHeading } from './Shared';

/** The coach and club path. Short: who they are, and who they are looking for. */

// ── Sports they work in ──────────────────────────────────────────────────────
export function RecruiterSportsStep({
  value,
  onToggle,
}: {
  value: string[];
  onToggle: (sport: string) => void;
}) {
  const theme = useTheme();
  const t = useT();

  return (
    <View>
      <StepHeading
        title={t('onboarding.recruiterSportsTitle')}
        subtitle={t('onboarding.recruiterSportsSubtitle')}
      />
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.md,
        }}
      >
        {SPORTS.map((sport) => (
          <SportTile
            key={sport.key}
            label={sportLabel(t, sport.key)}
            emoji={sport.emoji}
            control="checkbox"
            selected={value.includes(sport.key)}
            onPress={() => onToggle(sport.key)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Role and organisation ────────────────────────────────────────────────────
export function RecruiterRoleStep({
  isClub,
  specialty,
  club,
  specialtyError,
  onChangeSpecialty,
  onChangeClub,
}: {
  isClub: boolean;
  specialty: string;
  club: string;
  specialtyError: string | null;
  onChangeSpecialty: (value: string) => void;
  onChangeClub: (value: string) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const clubRef = useRef<TextInput>(null);

  return (
    <View>
      <StepHeading
        title={t('onboarding.recruiterRoleTitle')}
        subtitle={t('onboarding.recruiterRoleSubtitle')}
      />
      <View style={{ gap: theme.spacing.xl }}>
        <Input
          label={t('onboarding.recruiterRoleLabel')}
          required
          value={specialty}
          onChangeText={onChangeSpecialty}
          error={specialtyError}
          placeholder={t(
            isClub
              ? 'onboarding.recruiterRolePlaceholderClub'
              : 'onboarding.recruiterRolePlaceholderCoach',
          )}
          autoCapitalize="sentences"
          returnKeyType="next"
          onSubmitEditing={() => clubRef.current?.focus()}
          testID="recruiter-specialty"
        />
        <Input
          ref={clubRef}
          label={t(isClub ? 'onboarding.recruiterClubLabel' : 'onboarding.clubLabel')}
          value={club}
          onChangeText={onChangeClub}
          placeholder={t('onboarding.clubPlaceholder')}
          hint={t(
            isClub ? 'onboarding.recruiterClubHintClub' : 'onboarding.recruiterClubHintCoach',
          )}
          autoCapitalize="words"
          returnKeyType="done"
          testID="recruiter-club"
        />
      </View>
    </View>
  );
}

// ── Where they are ───────────────────────────────────────────────────────────
export function RecruiterPlaceStep({
  country,
  city,
  onChangeCountry,
  onChangeCity,
}: {
  country: string | null;
  city: string;
  onChangeCountry: (value: string) => void;
  onChangeCity: (value: string) => void;
}) {
  const theme = useTheme();
  const t = useT();

  return (
    <View>
      <StepHeading
        title={t('onboarding.recruiterPlaceTitle')}
        subtitle={t('onboarding.recruiterPlaceSubtitle')}
      />
      <View style={{ gap: theme.spacing.xl }}>
        <CountryPicker value={country} onChange={onChangeCountry} />
        <Input
          label={t('onboarding.cityLabel')}
          value={city}
          onChangeText={onChangeCity}
          placeholder={t('onboarding.cityPlaceholder')}
          autoCapitalize="words"
          testID="recruiter-city"
        />
      </View>
    </View>
  );
}

// ── What they are looking for ────────────────────────────────────────────────
export interface AgeBandOption {
  key: string;
  labelKey: string;
  min: number | null;
  max: number | null;
}

/* The band itself is stored as an age range, so only its label is translated. */
export const RECRUITER_AGE_BANDS: AgeBandOption[] = [
  { key: 'any', labelKey: 'onboarding.ageBandAny', min: null, max: null },
  { key: 'u14', labelKey: 'onboarding.ageBandUnder14', min: 13, max: 13 },
  { key: '14_16', labelKey: 'onboarding.ageBand14To16', min: 14, max: 16 },
  { key: '16_18', labelKey: 'onboarding.ageBand16To18', min: 16, max: 18 },
  { key: '18_21', labelKey: 'onboarding.ageBand18To21', min: 18, max: 21 },
  { key: '21_plus', labelKey: 'onboarding.ageBand21Plus', min: 21, max: null },
];

export function RecruiterTargetStep({
  sports,
  positions,
  ageBandKey,
  onTogglePosition,
  onChangeAgeBand,
}: {
  sports: string[];
  positions: string[];
  ageBandKey: string;
  onTogglePosition: (position: string) => void;
  onChangeAgeBand: (key: string) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { spacing } = theme;

  // Positions only make sense for the sports they already chose.
  const available = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    sports.forEach((sport) => {
      positionsFor(sport).forEach((position) => {
        if (!seen.has(position)) {
          seen.add(position);
          list.push(position);
        }
      });
    });
    return list;
  }, [sports]);

  return (
    <View>
      <StepHeading
        title={t('onboarding.recruiterTargetTitle')}
        subtitle={t('onboarding.recruiterTargetSubtitle')}
      />

      <View style={{ gap: spacing.xxl }}>
        <View style={{ gap: spacing.md }}>
          <Text variant="captionStrong" tone="secondary">
            {t('onboarding.recruiterPositionsTitle')}
          </Text>
          {available.length === 0 ? (
            <Text variant="caption" tone="muted">
              {t('onboarding.recruiterPositionsEmpty')}
            </Text>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.sm,
              }}
            >
              {available.map((position) => (
                <Chip
                  key={position}
                  label={positionLabel(t, position)}
                  selected={positions.includes(position)}
                  onPress={() => onTogglePosition(position)}
                  style={{ minHeight: theme.hit.min }}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: spacing.md }}>
          <Text variant="captionStrong" tone="secondary">
            {t('onboarding.recruiterAgeGroupTitle')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {RECRUITER_AGE_BANDS.map((band) => (
              <Chip
                key={band.key}
                label={t(band.labelKey)}
                selected={ageBandKey === band.key}
                onPress={() => onChangeAgeBand(band.key)}
                style={{ minHeight: theme.hit.min }}
              />
            ))}
          </View>
          <Text variant="caption" tone="muted">
            {t('onboarding.recruiterMinorsNote')}
          </Text>
        </View>
      </View>
    </View>
  );
}
