import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { BellRing, Handshake } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  Divider,
  ErrorState,
  Header,
  Screen,
  Skeleton,
  Switch,
  Text,
  useToast,
} from '@/components/ui';
import { ChipPicker } from '@/components/settings/ChipPicker';
import { Stepper } from '@/components/settings/Stepper';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getMatchPreferences, saveMatchPreferences } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import {
  LEVELS,
  PRIORITY_COUNTRIES,
  SPORT_KEYS,
  countryLabel,
  levelLabelI18n,
  positionLabel,
  positionsFor,
  sportLabel,
} from '@/constants/sports';
import type { MatchPreferences } from '@/types/models';

type Draft = {
  sports: string[];
  positions: string[];
  levels: string[];
  countries: string[];
  age_min: number;
  age_max: number;
  min_score: number;
  open_to_offers_only: boolean;
  notify_on_match: boolean;
};

const AGE_FLOOR = 13;
const AGE_CEILING = 40;

const EMPTY: Draft = {
  sports: [],
  positions: [],
  levels: [],
  countries: [],
  age_min: AGE_FLOOR,
  age_max: 23,
  min_score: 0,
  open_to_offers_only: false,
  notify_on_match: true,
};

const LEVEL_KEYS = LEVELS.map((l) => l.key as string);

function toDraft(prefs: MatchPreferences | null): Draft {
  if (!prefs) return EMPTY;
  return {
    sports: prefs.sports ?? [],
    positions: prefs.positions ?? [],
    levels: prefs.levels ?? [],
    countries: prefs.countries ?? [],
    age_min: prefs.age_min ?? EMPTY.age_min,
    age_max: prefs.age_max ?? EMPTY.age_max,
    min_score: prefs.min_score ?? 0,
    open_to_offers_only: prefs.open_to_offers_only ?? false,
    notify_on_match: prefs.notify_on_match ?? true,
  };
}

export default function ScoutingPreferencesScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const toast = useToast();
  const t = useT();

  const loaded = useAsync(getMatchPreferences, []);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [baseline, setBaseline] = useState<string>(JSON.stringify(EMPTY));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded.loading) return;
    const next = toDraft(loaded.data);
    setDraft(next);
    setBaseline(JSON.stringify(next));
  }, [loaded.data, loaded.loading]);

  const dirty = JSON.stringify(draft) !== baseline;

  /* Only offer the positions that belong to the sports actually chosen —
     "Wicket-keeper" under Football is noise a scout has to scroll past. */
  const positionOptions = useMemo(() => {
    const set = new Set<string>();
    draft.sports.forEach((sport) => positionsFor(sport).forEach((p) => set.add(p)));
    return Array.from(set);
  }, [draft.sports]);

  const toggle = useCallback((key: 'sports' | 'positions' | 'levels' | 'countries', value: string) => {
    setDraft((current) => {
      const list = current[key];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

      if (key === 'sports') {
        // Drop positions that no longer belong to any selected sport.
        const allowed = new Set<string>();
        next.forEach((sport) => positionsFor(sport).forEach((p) => allowed.add(p)));
        return {
          ...current,
          sports: next,
          positions: current.positions.filter((p) => allowed.has(p)),
        };
      }
      return { ...current, [key]: next };
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await saveMatchPreferences(draft);
      setBaseline(JSON.stringify(draft));
      toast.success(t('settings.preferencesSaved'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [draft, toast, t]);

  if (loaded.loading) {
    return (
      <Screen header={<Header title={t('settings.scoutingTitle')} back bordered />}>
        <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
          <Skeleton height={140} radius={theme.radii.lg} />
          <Skeleton height={140} radius={theme.radii.lg} />
          <Skeleton height={160} radius={theme.radii.lg} />
        </View>
      </Screen>
    );
  }

  if (loaded.error) {
    return (
      <Screen header={<Header title={t('settings.scoutingTitle')} back bordered />}>
        <ErrorState message={loaded.error} onRetry={loaded.reload} />
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title={t('settings.scoutingTitle')} back bordered />}
      testID="settings-scouting"
      footer={
        <Button
          label={dirty ? t('settings.savePreferences') : t('common.saved')}
          fullWidth
          disabled={!dirty}
          loading={saving}
          onPress={save}
          testID="save-match-preferences"
        />
      }
    >
      <View style={{ paddingTop: spacing.lg, gap: spacing.xxl }}>
        <Text variant="caption" tone="muted">
          {t('settings.scoutingIntro')}
        </Text>

        <ChipPicker
          label={t('settings.scoutingSports')}
          hint={t('settings.scoutingSportsHint')}
          options={SPORT_KEYS}
          selected={draft.sports}
          onToggle={(v) => toggle('sports', v)}
          labelOf={(key) => sportLabel(t, key)}
        />

        <ChipPicker
          label={t('settings.scoutingPositions')}
          hint={t('settings.scoutingPositionsHint')}
          options={positionOptions}
          selected={draft.positions}
          onToggle={(v) => toggle('positions', v)}
          labelOf={(key) => positionLabel(t, key)}
          emptyHint={t('settings.scoutingPositionsEmpty')}
        />

        <ChipPicker
          label={t('settings.scoutingLevels')}
          options={LEVEL_KEYS}
          selected={draft.levels}
          onToggle={(v) => toggle('levels', v)}
          labelOf={(key) => levelLabelI18n(t, key)}
        />

        <ChipPicker
          label={t('settings.scoutingCountries')}
          hint={t('settings.scoutingCountriesHint')}
          options={PRIORITY_COUNTRIES}
          selected={draft.countries}
          onToggle={(v) => toggle('countries', v)}
          labelOf={(key) => countryLabel(t, key)}
        />

        <View style={{ gap: spacing.md }}>
          <Text variant="captionStrong" tone="secondary">
            {t('settings.ageRange')}
          </Text>
          <Card padded="sm">
            <Stepper
              label={t('settings.youngest')}
              value={draft.age_min}
              min={AGE_FLOOR}
              max={draft.age_max}
              suffix={t('settings.yearsSuffix')}
              onChange={(v) => setDraft((c) => ({ ...c, age_min: v }))}
            />
            <Divider style={{ marginVertical: spacing.sm }} />
            <Stepper
              label={t('settings.oldest')}
              value={draft.age_max}
              min={draft.age_min}
              max={AGE_CEILING}
              suffix={t('settings.yearsSuffix')}
              onChange={(v) => setDraft((c) => ({ ...c, age_max: v }))}
            />
          </Card>
          <InfoNote tone="neutral" icon="shield">
            {t('safety.scoutingMinorNote')}
          </InfoNote>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text variant="captionStrong" tone="secondary">
            {t('settings.minimumTalentScore')}
          </Text>
          <Card padded="sm">
            <Stepper
              label={t('settings.atLeast')}
              hint={
                draft.min_score === 0
                  ? t('settings.anyScoreHint')
                  : t('settings.minScoreHint', { score: draft.min_score })
              }
              value={draft.min_score}
              min={0}
              max={100}
              step={5}
              onChange={(v) => setDraft((c) => ({ ...c, min_score: v }))}
            />
          </Card>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text variant="captionStrong" tone="secondary">
            {t('settings.filters')}
          </Text>
          <Card padded="sm">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: theme.hit.min,
              }}
            >
              <Handshake size={18} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{t('settings.openToOffersOnly')}</Text>
                <Text variant="caption" tone="muted">
                  {t('settings.openToOffersHint')}
                </Text>
              </View>
              <Switch
                value={draft.open_to_offers_only}
                onValueChange={(v) => setDraft((c) => ({ ...c, open_to_offers_only: v }))}
                accessibilityLabel={t('settings.openToOffersOnly')}
              />
            </View>

            <Divider style={{ marginVertical: spacing.sm }} />

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                minHeight: theme.hit.min,
              }}
            >
              <BellRing size={18} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{t('settings.notifyNewMatches')}</Text>
                <Text variant="caption" tone="muted">
                  {t('settings.notifyNewMatchesHint')}
                </Text>
              </View>
              <Switch
                value={draft.notify_on_match}
                onValueChange={(v) => setDraft((c) => ({ ...c, notify_on_match: v }))}
                accessibilityLabel={t('settings.notifyNewMatches')}
              />
            </View>
          </Card>
        </View>
      </View>
    </Screen>
  );
}
