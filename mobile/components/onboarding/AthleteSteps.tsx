import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip, EmptyState, Input, Text } from '@/components/ui';
import { useT } from '@/i18n';
import {
  DOMINANT_SIDE,
  LEVELS,
  SPORTS,
  levelHint,
  levelLabelI18n,
  positionLabel,
  positionsFor,
  sideLabel,
  sportLabel,
} from '@/constants/sports';
import { CountryPicker, OptionCard, SportTile, StepHeading } from './Shared';

/** The athlete path: sport, position, level, where you play, and your body. */

// ── Sport ────────────────────────────────────────────────────────────────────
export function SportStep({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (sport: string) => void;
}) {
  const theme = useTheme();
  const t = useT();

  return (
    <View>
      <StepHeading title={t('onboarding.sportTitle')} subtitle={t('onboarding.sportSubtitle')} />
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
            selected={value === sport.key}
            onPress={() => onChange(sport.key)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Position ─────────────────────────────────────────────────────────────────
export function PositionStep({
  sport,
  value,
  onChange,
}: {
  sport: string | null;
  value: string | null;
  onChange: (position: string) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const positions = positionsFor(sport);

  return (
    <View>
      <StepHeading
        title={t('onboarding.positionTitle')}
        subtitle={t('onboarding.positionSubtitle')}
      />
      {positions.length === 0 ? (
        <EmptyState
          compact
          title={t('onboarding.positionNoneTitle')}
          body={t('onboarding.positionNoneBody', { action: t('common.continue') })}
        />
      ) : (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
          }}
        >
          {positions.map((position) => (
            <Chip
              key={position}
              label={positionLabel(t, position)}
              selected={value === position}
              onPress={() => onChange(position)}
              style={{ minHeight: theme.hit.min }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Level ────────────────────────────────────────────────────────────────────
export function LevelStep({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (level: string) => void;
}) {
  const theme = useTheme();
  const t = useT();

  return (
    <View>
      <StepHeading title={t('onboarding.levelTitle')} subtitle={t('onboarding.levelSubtitle')} />
      <View style={{ gap: theme.spacing.md }}>
        {LEVELS.map((level) => (
          <OptionCard
            key={level.key}
            title={levelLabelI18n(t, level.key)}
            subtitle={levelHint(t, level.key)}
            selected={value === level.key}
            onPress={() => onChange(level.key)}
            testID={`onboarding-level-${level.key}`}
          />
        ))}
      </View>
    </View>
  );
}

// ── Where you play ───────────────────────────────────────────────────────────
export function PlaceStep({
  club,
  country,
  city,
  onChangeClub,
  onChangeCountry,
  onChangeCity,
}: {
  club: string;
  country: string | null;
  city: string;
  onChangeClub: (value: string) => void;
  onChangeCountry: (value: string) => void;
  onChangeCity: (value: string) => void;
}) {
  const theme = useTheme();
  const t = useT();

  return (
    <View>
      <StepHeading title={t('onboarding.placeTitle')} subtitle={t('onboarding.placeSubtitle')} />
      <View style={{ gap: theme.spacing.xl }}>
        <Input
          label={t('onboarding.clubLabel')}
          value={club}
          onChangeText={onChangeClub}
          placeholder={t('onboarding.clubPlaceholder')}
          hint={t('onboarding.clubHint')}
          autoCapitalize="words"
          testID="onboarding-club"
        />

        <CountryPicker value={country} onChange={onChangeCountry} />

        <Input
          label={t('onboarding.cityLabel')}
          value={city}
          onChangeText={onChangeCity}
          placeholder={t('onboarding.cityPlaceholder')}
          autoCapitalize="words"
          testID="onboarding-city"
        />
      </View>
    </View>
  );
}

// ── Physical ─────────────────────────────────────────────────────────────────
export const HEIGHT_RANGE_CM = { min: 100, max: 250 };
export const WEIGHT_RANGE_KG = { min: 25, max: 200 };

export function PhysicalStep({
  height,
  weight,
  side,
  heightError,
  weightError,
  onChangeHeight,
  onChangeWeight,
  onChangeSide,
}: {
  height: string;
  weight: string;
  side: string | null;
  heightError: string | null;
  weightError: string | null;
  onChangeHeight: (value: string) => void;
  onChangeWeight: (value: string) => void;
  onChangeSide: (value: string) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { spacing } = theme;

  return (
    <View>
      <StepHeading
        title={t('onboarding.physicalTitle')}
        subtitle={t('onboarding.physicalSubtitle')}
      />
      <View style={{ gap: spacing.xl }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Input
            label={t('onboarding.heightLabel')}
            containerStyle={{ flex: 1 }}
            value={height}
            onChangeText={(text) => onChangeHeight(text.replace(/[^\d]/g, '').slice(0, 3))}
            error={heightError}
            placeholder={t('onboarding.heightPlaceholder')}
            hint={t('onboarding.heightHint')}
            keyboardType="number-pad"
            testID="onboarding-height"
          />
          <Input
            label={t('onboarding.weightLabel')}
            containerStyle={{ flex: 1 }}
            value={weight}
            onChangeText={(text) => onChangeWeight(text.replace(/[^\d]/g, '').slice(0, 3))}
            error={weightError}
            placeholder={t('onboarding.weightPlaceholder')}
            hint={t('onboarding.weightHint')}
            keyboardType="number-pad"
            testID="onboarding-weight"
          />
        </View>

        <View style={{ gap: spacing.md }}>
          <Text variant="captionStrong" tone="secondary">
            {t('onboarding.strongSide')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {DOMINANT_SIDE.map((option) => (
              <Chip
                key={option}
                label={sideLabel(t, option)}
                selected={side === option}
                onPress={() => onChangeSide(option)}
                style={{ minHeight: theme.hit.min }}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
