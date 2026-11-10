import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Cake, Handshake, Search } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  ConfirmSheet,
  Divider,
  Dropdown,
  EmptyState,
  ErrorState,
  Header,
  Input,
  Screen,
  Skeleton,
  Switch,
  Text,
  useToast,
} from '@/components/ui';
import { ChipPicker } from '@/components/settings/ChipPicker';
import { OptionList, SelectedPills } from '@/components/onboarding/PickerSheet';
import { Stepper } from '@/components/settings/Stepper';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { getMatchPreferences, saveMatchPreferences } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import {
  LEVELS,
  SPORT_KEYS,
  countryLabel,
  countryOptions,
  levelLabelI18n,
  positionLabel,
  positionsBySport,
  positionsFor,
  prunePositions,
  sportEmoji,
  sportLabel,
} from '@/constants/sports';
import type { MatchPreferences } from '@/types/models';

type Draft = {
  sports: string[];
  positions: string[];
  levels: string[];
  countries: string[];
  age_min: number | null;
  age_max: number | null;
  min_score: number;
  open_to_offers_only: boolean;
  notify_on_match: boolean;
};


const AGE_FLOOR = 13;
const AGE_CEILING = 60;
const DEFAULT_AGE_MIN = 13;
const DEFAULT_AGE_MAX = 25;
/** One step past the oldest age the stepper can name. Stored as null. */
const NO_AGE_MAX = AGE_CEILING + 1;

const EMPTY: Draft = {
  sports: [],
  positions: [],
  levels: [],
  countries: [],
  age_min: null,
  age_max: null,
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
    age_min: prefs.age_min ?? null,
    age_max: prefs.age_max ?? null,
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
  const router = useRouter();
  const { isRecruiter } = useAuth();

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
  const anyAge = draft.age_min == null && draft.age_max == null;
  const [discardOpen, setDiscardOpen] = useState(false);
  /* Countries: what is picked shows as pills; a search box narrows the rest
     to a short list under it. */
  const [countryQuery, setCountryQuery] = useState('');
  const countryMatches = useMemo(
    () =>
      countryOptions(countryQuery, (country) => countryLabel(t, country)).filter(
        (country) => !draft.countries.includes(country),
      ),
    [countryQuery, draft.countries, t],
  );

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, [router]);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (dirty) setDiscardOpen(true);
    else close();
  }, [saving, dirty, close]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (saving) return true;
      if (dirty) {
        setDiscardOpen(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [dirty, saving]);

  const sportOptions = useMemo(() => {
    const known = new Set<string>(SPORT_KEYS);
    return [...SPORT_KEYS, ...draft.sports.filter((sport) => !known.has(sport))];
  }, [draft.sports]);

  /* Saved positions under the sport they belong to. Goalkeeper is one stored
     value and shows up under every sport that has it. */
  const positionsBy = useMemo(
    () => positionsBySport(draft.sports, draft.positions),
    [draft.sports, draft.positions],
  );

  const toggle = useCallback((key: 'sports' | 'positions' | 'levels' | 'countries', value: string) => {
    setDraft((current) => {
      const list = current[key];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

      if (key === 'sports') {
        return {
          ...current,
          sports: next,
          positions: prunePositions(next, current.positions),
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
      if (router.canGoBack()) router.back();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [draft, router, toast, t]);

  if (!isRecruiter) {
    return (
      <Screen header={<Header title={t('settings.scoutingTitle')} back bordered />}>
        <EmptyState
          title={t('settings.scoutingRecruiterOnlyTitle')}
          body={t('settings.scoutingRecruiterOnlyBody')}
        />
      </Screen>
    );
  }

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
    <>
    <Stack.Screen options={{ gestureEnabled: !dirty }} />
    <Screen
      header={<Header title={t('settings.scoutingTitle')} back onBack={requestClose} bordered />}
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
          tone="accent"
          label={t('settings.scoutingSports')}
          hint={t('settings.scoutingSportsHint')}
          options={sportOptions}
          selected={draft.sports}
          onToggle={(v) => toggle('sports', v)}
          labelOf={(key) => sportLabel(t, key)}
          emojiOf={(key) => sportEmoji(key)}
        />

        <View style={{ gap: spacing.sm }}>
          <View style={{ gap: 2 }}>
            <Text variant="captionStrong" tone="secondary">
              {t('settings.scoutingPositions')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('settings.scoutingPositionsHint')}
            </Text>
          </View>
          {draft.sports.length === 0 ? (
            <Text variant="caption" tone="muted">
              {t('settings.scoutingPositionsEmpty')}
            </Text>
          ) : (
            <View style={{ gap: spacing.lg }}>
            {draft.sports.map((sport) => {
              const options = positionsFor(sport);
              const selected = positionsBy[sport] ?? [];
              return (
                <View key={sport} style={{ gap: spacing.sm }}>
                  <Text variant="captionStrong">{sportLabel(t, sport)}</Text>
                  {options.length > 0 ? (
                    <Dropdown
                      multiple
                      options={options.map((position) => ({ key: position, label: positionLabel(t, position) }))}
                      value={selected}
                      onChange={(next) => {
                        const changed =
                          next.find((key) => !selected.includes(key)) ?? selected.find((key) => !next.includes(key));
                        if (changed) toggle('positions', changed);
                      }}
                    />
                  ) : null}
                </View>
              );
            })}
            </View>
          )}
        </View>

        <ChipPicker
          label={t('settings.scoutingLevels')}
          options={LEVEL_KEYS}
          selected={draft.levels}
          onToggle={(v) => toggle('levels', v)}
          labelOf={(key) => levelLabelI18n(t, key)}
        />

        <View style={{ gap: spacing.sm }}>
          <View style={{ gap: 2 }}>
            <Text variant="captionStrong" tone="secondary">
              {t('settings.scoutingCountries')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('settings.scoutingCountriesHint')}
            </Text>
          </View>
          <SelectedPills
            items={draft.countries.map((country) => ({ key: country, label: countryLabel(t, country) }))}
            onRemove={(country) => toggle('countries', country)}
          />
          <Input
            value={countryQuery}
            onChangeText={setCountryQuery}
            placeholder={t('onboarding.countrySearchPlaceholder')}
            autoCorrect={false}
            icon={<Search size={18} color={colors.textMuted} />}
            returnKeyType="search"
          />
          <OptionList
            rows={countryMatches.map((country) => ({ key: country, label: countryLabel(t, country) }))}
            onPick={(country) => {
              toggle('countries', country);
              setCountryQuery('');
            }}
            limit={6}
            emptyText={t('onboarding.countryNoMatch')}
          />
          {countryMatches.length > 6 ? (
            <Text variant="caption" tone="muted">
              {t('discover.filters.moreCountries', { count: countryMatches.length - 6 })}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.md }}>
          <Text variant="captionStrong" tone="secondary">
            {t('settings.ageRange')}
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
              <Cake size={18} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{t('discover.filters.anyAge')}</Text>
              </View>
              <Switch
                value={anyAge}
                onValueChange={(on) =>
                  setDraft((c) => ({
                    ...c,
                    age_min: on ? null : DEFAULT_AGE_MIN,
                    age_max: on ? null : DEFAULT_AGE_MAX,
                  }))
                }
                accessibilityLabel={t('discover.filters.anyAge')}
              />
            </View>
            {!anyAge ? (
              <>
                <Divider style={{ marginVertical: spacing.sm }} />
                <Stepper
                  label={t('settings.youngest')}
                  value={draft.age_min ?? DEFAULT_AGE_MIN}
                  min={AGE_FLOOR}
                  max={draft.age_max ?? AGE_CEILING}
                  suffix={t('settings.yearsSuffix')}
                  onChange={(v) => setDraft((c) => ({ ...c, age_min: v }))}
                />
                <Divider style={{ marginVertical: spacing.sm }} />
                <Stepper
                  label={t('settings.oldest')}
                  value={draft.age_max == null ? NO_AGE_MAX : draft.age_max}
                  display={draft.age_max == null ? t('discover.filters.any') : undefined}
                  min={draft.age_min ?? DEFAULT_AGE_MIN}
                  max={NO_AGE_MAX}
                  suffix={t('settings.yearsSuffix')}
                  onChange={(v) =>
                    setDraft((c) => ({ ...c, age_max: v > AGE_CEILING ? null : v }))
                  }
                />
              </>
            ) : null}
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

            {/* Hidden until new-match notifications exist (QA-144).
                notify_on_match stays on the draft and is saved unchanged. */}
          </Card>
        </View>
      </View>
    </Screen>

    <ConfirmSheet
      visible={discardOpen}
      title={t('settings.discardChangesTitle')}
      message={t('settings.discardChangesBody')}
      confirmLabel={t('feed.discard')}
      cancelLabel={t('settings.keepEditing')}
      destructive
      onConfirm={() => {
        setDiscardOpen(false);
        close();
      }}
      onCancel={() => setDiscardOpen(false)}
    />
    </>
  );
}
