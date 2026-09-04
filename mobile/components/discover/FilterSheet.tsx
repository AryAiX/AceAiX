import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Minus, Plus, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { Button, Chip, Divider, Input, Sheet, Switch, Text } from '@/components/ui';
import {
  LEVELS,
  PRIORITY_COUNTRIES,
  SPORTS,
  levelLabelI18n,
  positionLabel,
  positionsFor,
  sportLabel,
} from '@/constants/sports';
import { useT } from '@/i18n';
import { saveMatchPreferences } from '@/lib/api';
import { countDiscoverAthletes } from '@/lib/api.discover';
import { errorMessage } from '@/lib/errors';
import type { DiscoveryFilters, MatchPreferences } from '@/types/models';
import { tierLabel } from './MatchBadge';

export type FilterSheetMode = 'filter' | 'preferences';

/** Matches the age check constraint on `match_preferences`. */
const AGE_FLOOR = 8;
const AGE_CEILING = 60;
const DEFAULT_AGE_MIN = 12;
const DEFAULT_AGE_MAX = 25;
const SCORE_STEP = 5;
const SCORE_CEILING = 90;
const COUNTRY_PAGE = 10;
const COUNT_DEBOUNCE_MS = 350;

interface Draft {
  sport?: string;
  positions: string[];
  levels: string[];
  countries: string[];
  ageMin?: number;
  ageMax?: number;
  minScore: number;
  openOnly: boolean;
}

const EMPTY_DRAFT: Draft = {
  sport: undefined,
  positions: [],
  levels: [],
  countries: [],
  ageMin: undefined,
  ageMax: undefined,
  minScore: 0,
  openOnly: false,
};

/** Does this filter set narrow anything? Search text and sort do not count. */
export function isFilterActive(filters: DiscoveryFilters): boolean {
  return (
    !!filters.sport ||
    (filters.positions?.length ?? 0) > 0 ||
    (filters.levels?.length ?? 0) > 0 ||
    (filters.countries?.length ?? 0) > 0 ||
    filters.ageMin != null ||
    filters.ageMax != null ||
    (filters.minScore ?? 0) > 0 ||
    !!filters.openOnly
  );
}

function draftFromFilters(filters: DiscoveryFilters): Draft {
  return {
    sport: filters.sport,
    positions: filters.positions ?? [],
    levels: filters.levels ?? [],
    countries: filters.countries ?? [],
    ageMin: filters.ageMin ?? undefined,
    ageMax: filters.ageMax ?? undefined,
    minScore: filters.minScore ?? 0,
    openOnly: !!filters.openOnly,
  };
}

function draftFromPreferences(prefs: MatchPreferences | null): Draft {
  if (!prefs) return EMPTY_DRAFT;
  return {
    sport: prefs.sports?.[0],
    positions: prefs.positions ?? [],
    levels: prefs.levels ?? [],
    countries: prefs.countries ?? [],
    ageMin: prefs.age_min ?? undefined,
    ageMax: prefs.age_max ?? undefined,
    minScore: prefs.min_score ?? 0,
    openOnly: !!prefs.open_to_offers_only,
  };
}

function toFilters(draft: Draft, base: DiscoveryFilters): DiscoveryFilters {
  return {
    query: base.query,
    sort: base.sort,
    sport: draft.sport,
    positions: draft.positions,
    levels: draft.levels,
    countries: draft.countries,
    ageMin: draft.ageMin,
    ageMax: draft.ageMax,
    minScore: draft.minScore > 0 ? draft.minScore : undefined,
    openOnly: draft.openOnly,
  };
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// ── Small parts ───────────────────────────────────────────────────────────────
function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 2, marginBottom: theme.spacing.sm }}>
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function StepButton({
  direction,
  onPress,
  disabled,
  label,
}: {
  direction: 'down' | 'up';
  onPress: () => void;
  disabled: boolean;
  label: string;
}) {
  const theme = useTheme();
  const Icon = direction === 'down' ? Minus : Plus;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        width: theme.hit.min,
        height: theme.hit.min,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : pressed ? 0.55 : 1,
      })}
    >
      <Icon size={18} color={theme.colors.text} strokeWidth={2.4} />
    </Pressable>
  );
}

function Stepper({
  value,
  display,
  onChange,
  min,
  max,
  step = 1,
  name,
}: {
  value: number;
  display: string;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Translated noun for the screen-reader labels: "Increase youngest age". */
  name: string;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii } = theme;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <StepButton
        direction="down"
        label={t('discover.filters.decrease', { name })}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
      />
      <View style={{ minWidth: 56, alignItems: 'center' }}>
        <Text variant="captionStrong">{display}</Text>
      </View>
      <StepButton
        direction="up"
        label={t('discover.filters.increase', { name })}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
      />
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        minHeight: theme.hit.min,
      }}
    >
      <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

// ── Sheet ─────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  mode: FilterSheetMode;
  /** Seed for filter mode, and the source of the query/sort the count must respect. */
  filters: DiscoveryFilters;
  /** Seed for preferences mode. */
  preferences: MatchPreferences | null;
  onClose: () => void;
  onApply: (filters: DiscoveryFilters) => void;
  onSavedPreferences: () => void;
}

export function FilterSheet({
  visible,
  mode,
  filters,
  preferences,
  onClose,
  onApply,
  onSavedPreferences,
}: Props) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [countryQuery, setCountryQuery] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed every time the sheet opens so a cancelled edit is really cancelled.
  useEffect(() => {
    if (!visible) return;
    setDraft(mode === 'preferences' ? draftFromPreferences(preferences) : draftFromFilters(filters));
    setCountryQuery('');
    setError(null);
    setCount(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode]);

  const patch = useCallback((next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next })), []);

  const draftKey = JSON.stringify(draft);

  /* The button promises a number, so it has to be a real number: every change
     re-runs the same query the list will run, debounced. */
  useEffect(() => {
    if (!visible || mode !== 'filter') return;
    let cancelled = false;

    const timer = setTimeout(() => {
      countDiscoverAthletes(toFilters(draft, filters))
        .then((n) => {
          if (!cancelled) setCount(n);
        })
        .catch(() => {
          if (!cancelled) setCount(null);
        });
    }, COUNT_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode, draftKey, filters.query, filters.sort]);

  const positions = useMemo(() => positionsFor(draft.sport), [draft.sport]);

  const countryMatches = useMemo(() => {
    const term = countryQuery.trim().toLowerCase();
    return PRIORITY_COUNTRIES.filter(
      (c) => !draft.countries.includes(c) && (!term || c.toLowerCase().includes(term)),
    );
  }, [countryQuery, draft.countries]);

  const visibleCountries = countryMatches.slice(0, COUNTRY_PAGE);
  const hiddenCountries = countryMatches.length - visibleCountries.length;

  const anyAge = draft.ageMin == null && draft.ageMax == null;
  const effectiveAgeMin = draft.ageMin ?? DEFAULT_AGE_MIN;
  const effectiveAgeMax = draft.ageMax ?? DEFAULT_AGE_MAX;

  const setAgeMin = (next: number) =>
    patch({ ageMin: next, ageMax: Math.max(next, effectiveAgeMax) });
  const setAgeMax = (next: number) =>
    patch({ ageMax: next, ageMin: Math.min(next, effectiveAgeMin) });

  const scoreTier = tierForScore(draft.minScore);

  const clearAll = () => {
    setDraft(EMPTY_DRAFT);
    setCountryQuery('');
  };

  const apply = () => {
    onApply(toFilters(draft, filters));
    onClose();
  };

  const savePreferences = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveMatchPreferences({
        sports: draft.sport ? [draft.sport] : [],
        positions: draft.positions,
        levels: draft.levels,
        countries: draft.countries,
        age_min: draft.ageMin ?? null,
        age_max: draft.ageMax ?? null,
        min_score: draft.minScore,
        open_to_offers_only: draft.openOnly,
      });
      onSavedPreferences();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const showLabel =
    count == null
      ? t('discover.filters.showResults')
      : count === 0
        ? t('discover.filters.noMatchesYet')
        : t('discover.filters.showCount', { count });

  const footer = (
    <View style={{ gap: spacing.sm }}>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Button label={t('common.clearAll')} variant="ghost" onPress={clearAll} />
        <Button
          label={mode === 'preferences' ? t('common.save') : showLabel}
          onPress={mode === 'preferences' ? savePreferences : apply}
          loading={saving}
          style={{ flex: 1 }}
          fullWidth
        />
      </View>
    </View>
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={
        mode === 'preferences'
          ? t('discover.filters.preferencesTitle')
          : t('discover.filters.title')
      }
      subtitle={
        mode === 'preferences'
          ? t('discover.filters.preferencesSubtitle')
          : t('discover.filters.subtitle')
      }
      footer={footer}
      testID="discover-filter-sheet"
    >
      <View style={{ gap: spacing.xl, paddingBottom: spacing.sm }}>
        {/* Sport */}
        <View>
          <SectionLabel title={t('discover.filters.sport')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {SPORTS.map((sport) => (
              <Chip
                key={sport.key}
                label={sportLabel(t, sport.key)}
                icon={<Text variant="caption">{sport.emoji}</Text>}
                selected={draft.sport === sport.key}
                onPress={() =>
                  // Positions belong to a sport; keeping them across a change
                  // would filter for a position the new sport does not have.
                  patch(
                    draft.sport === sport.key
                      ? { sport: undefined, positions: [] }
                      : { sport: sport.key, positions: [] },
                  )
                }
              />
            ))}
          </View>
        </View>

        <Divider />

        {/* Positions */}
        <View>
          <SectionLabel
            title={t('discover.filters.position')}
            hint={draft.sport ? undefined : t('discover.filters.positionHint')}
          />
          {positions.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {positions.map((position) => (
                <Chip
                  key={position}
                  label={positionLabel(t, position)}
                  selected={draft.positions.includes(position)}
                  onPress={() => patch({ positions: toggle(draft.positions, position) })}
                />
              ))}
            </View>
          ) : null}
        </View>

        <Divider />

        {/* Level */}
        <View>
          <SectionLabel title={t('discover.filters.level')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {LEVELS.map((level) => (
              <Chip
                key={level.key}
                label={levelLabelI18n(t, level.key)}
                selected={draft.levels.includes(level.key)}
                onPress={() => patch({ levels: toggle(draft.levels, level.key) })}
              />
            ))}
          </View>
        </View>

        <Divider />

        {/* Country */}
        <View>
          <SectionLabel title={t('discover.filters.country')} />
          <Input
            value={countryQuery}
            onChangeText={setCountryQuery}
            placeholder={t('discover.filters.findCountry')}
            autoCorrect={false}
            accessibilityLabel={t('discover.filters.findCountry')}
            icon={<Search size={18} color={colors.textMuted} />}
            containerStyle={{ marginBottom: spacing.md }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {draft.countries.map((country) => (
              <Chip
                key={country}
                label={country}
                selected
                onPress={() => patch({ countries: toggle(draft.countries, country) })}
              />
            ))}
            {visibleCountries.map((country) => (
              <Chip
                key={country}
                label={country}
                onPress={() => patch({ countries: toggle(draft.countries, country) })}
              />
            ))}
          </View>
          {hiddenCountries > 0 ? (
            <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
              {t('discover.filters.moreCountries', { count: hiddenCountries })}
            </Text>
          ) : null}
          {countryMatches.length === 0 && countryQuery.trim().length > 0 ? (
            <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
              {t('discover.filters.noCountryMatch')}
            </Text>
          ) : null}
        </View>

        <Divider />

        {/* Age */}
        <View style={{ gap: spacing.sm }}>
          <SectionLabel title={t('discover.filters.age')} />
          <View style={{ flexDirection: 'row' }}>
            <Chip
              label={t('discover.filters.anyAge')}
              selected={anyAge}
              onPress={() =>
                patch(
                  anyAge
                    ? { ageMin: DEFAULT_AGE_MIN, ageMax: DEFAULT_AGE_MAX }
                    : { ageMin: undefined, ageMax: undefined },
                )
              }
            />
          </View>
          <Row label={t('discover.filters.youngest')}>
            <Stepper
              name={t('discover.filters.youngestAgeName')}
              value={effectiveAgeMin}
              display={anyAge ? t('discover.filters.any') : String(effectiveAgeMin)}
              onChange={setAgeMin}
              min={AGE_FLOOR}
              max={AGE_CEILING}
            />
          </Row>
          <Row label={t('discover.filters.oldest')}>
            <Stepper
              name={t('discover.filters.oldestAgeName')}
              value={effectiveAgeMax}
              display={anyAge ? t('discover.filters.any') : String(effectiveAgeMax)}
              onChange={setAgeMax}
              min={AGE_FLOOR}
              max={AGE_CEILING}
            />
          </Row>
        </View>

        <Divider />

        {/* Minimum talent score */}
        <View style={{ gap: spacing.sm }}>
          <SectionLabel title={t('discover.filters.minScore')} />
          <Row
            label={
              draft.minScore === 0
                ? t('discover.filters.anyScore')
                : t('discover.filters.tierAndAbove', { tier: tierLabel(t, scoreTier) })
            }
          >
            <Stepper
              name={t('discover.filters.minScoreName')}
              value={draft.minScore}
              display={draft.minScore === 0 ? t('discover.filters.any') : String(draft.minScore)}
              onChange={(next) => patch({ minScore: next })}
              min={0}
              max={SCORE_CEILING}
              step={SCORE_STEP}
            />
          </Row>
          {draft.minScore > 0 ? (
            <Text variant="caption" color={TierColors[scoreTier]}>
              {t('discover.filters.scoreFloor', { score: draft.minScore })}
            </Text>
          ) : null}
        </View>

        <Divider />

        {/* Open to offers */}
        <Row label={t('discover.filters.openOnly')}>
          <Switch
            value={draft.openOnly}
            onValueChange={(next) => patch({ openOnly: next })}
            accessibilityLabel={t('discover.filters.openOnlyA11y')}
          />
        </Row>
      </View>
    </Sheet>
  );
}
