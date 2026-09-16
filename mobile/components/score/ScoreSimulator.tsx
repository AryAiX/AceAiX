import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { AnimatedNumber, Button, Card, Switch, Text } from '@/components/ui';
import { Stepper } from '@/components/score/Stepper';
import { simulateScore } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useT } from '@/i18n';
import type { SimulatableInput, Simulation } from '@/types/models';

/** The inputs worth offering. Anything else is noise on a phone screen. */
const DIALS: { key: SimulatableInput; labelKey: string; max: number; step: number }[] = [
  { key: 'video_items', labelKey: 'score.simVideos', max: 12, step: 1 },
  { key: 'matches_last_year', labelKey: 'score.simMatches', max: 40, step: 1 },
  { key: 'matches_verified', labelKey: 'score.simVerified', max: 40, step: 1 },
  { key: 'endorsements_expert', labelKey: 'score.simExpert', max: 10, step: 1 },
  { key: 'posts_last_30_days', labelKey: 'score.simPosts', max: 20, step: 1 },
];

const TOGGLES: { key: SimulatableInput; labelKey: string }[] = [
  { key: 'account_verified', labelKey: 'score.simAccountVerified' },
  { key: 'club_linked', labelKey: 'score.simClubLinked' },
];

/**
 * "What would it take?"
 *
 * Every projection is computed by `simulate_talent_score` on the server, using
 * the same weights as the real score. The client deliberately does no
 * arithmetic: a second copy of the model here would drift within a release, and
 * the first time it disagreed with the number above it the whole screen would
 * stop being believable.
 *
 * The dials start at what is already true, so the first thing the athlete sees
 * is their own position, not a blank slate.
 */
export function ScoreSimulator() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();

  const [changes, setChanges] = useState<Partial<Record<SimulatableInput, number | boolean>>>({});
  const [result, setResult] = useState<Simulation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* One request in flight, debounced, and a late reply never overwrites a
     newer one — the dials move faster than a round trip. */
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setBusy(true);
      try {
        const next = await simulateScore(changes);
        if (!cancelled) {
          setResult(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, Object.keys(changes).length === 0 ? 0 : 260);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [changes]);

  const current = result?.current;
  const projected = result?.projected;
  const gain = (projected?.overall ?? 0) - (current?.overall ?? 0);
  const tierChanged = projected && current && projected.tier !== current.tier;

  const valueOf = useCallback(
    (key: SimulatableInput): number => {
      const override = changes[key];
      if (typeof override === 'number') return override;
      const live = current?.inputs?.[key];
      return typeof live === 'number' ? live : 0;
    },
    [changes, current],
  );

  const boolOf = useCallback(
    (key: SimulatableInput): boolean => {
      const override = changes[key];
      if (typeof override === 'boolean') return override;
      return current?.inputs?.[key] === true;
    },
    [changes, current],
  );

  const dials = useMemo(
    () =>
      DIALS.map((dial) => ({
        ...dial,
        value: valueOf(dial.key),
        floor: typeof current?.inputs?.[dial.key] === 'number'
          ? (current!.inputs[dial.key] as number)
          : 0,
      })),
    [current, valueOf],
  );

  if (error && !result) {
    return (
      <Card padded tone="alt">
        <Text variant="caption" tone="muted">
          {error}
        </Text>
      </Card>
    );
  }

  return (
    <Card padded style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="subheading">{t('score.simTitle')}</Text>
        <Text variant="caption" tone="secondary">
          {t('score.simBody')}
        </Text>
      </View>

      {/* ── Now vs projected ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.lg,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          borderRadius: theme.radii.lg,
          backgroundColor: colors.surfaceAlt,
        }}
      >
        <View style={{ alignItems: 'center', minWidth: 68 }}>
          <Text variant="overline" tone="muted">
            {t('score.simNow')}
          </Text>
          <Text variant="display" tone="secondary">
            {current?.overall ?? '—'}
          </Text>
        </View>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="overline" tone="muted">
            {t('score.simProjected')}
          </Text>
          <AnimatedNumber
            value={projected?.overall ?? 0}
            variant="display"
            color={TierColors[tierForScore(projected?.overall ?? 0)]}
          />
          {gain > 0 ? (
            <Text variant="captionStrong" tone="success">
              {t('score.simGain', { count: gain })}
            </Text>
          ) : (
            <Text variant="caption" tone="muted">
              {t('score.simNoChange')}
            </Text>
          )}
        </View>
      </View>

      {tierChanged ? (
        <Text variant="captionStrong" tone="primary">
          {t('score.simUnlocksTier', {
            tier: t(
              `common.tier${projected!.tier.charAt(0).toUpperCase()}${projected!.tier.slice(1)}` as never,
            ),
          })}
        </Text>
      ) : null}

      {/* ── The dials ── */}
      <View style={{ gap: spacing.md }}>
        {dials.map((dial) => (
          <Stepper
            key={dial.key}
            label={t(dial.labelKey as never)}
            value={dial.value}
            min={dial.floor}
            max={dial.max}
            step={dial.step}
            onChange={(next) => setChanges((c) => ({ ...c, [dial.key]: next }))}
          />
        ))}

        {TOGGLES.map((toggle) => (
          <View
            key={toggle.key}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
          >
            <Text variant="body" style={{ flex: 1 }}>
              {t(toggle.labelKey as never)}
            </Text>
            <Switch
              value={boolOf(toggle.key)}
              onValueChange={(next) => setChanges((c) => ({ ...c, [toggle.key]: next }))}
            />
          </View>
        ))}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" tone="muted">
          {t('score.simHonest')}
        </Text>
        {Object.keys(changes).length > 0 ? (
          <Button
            label={t('score.simReset')}
            variant="ghost"
            size="sm"
            loading={busy}
            onPress={() => setChanges({})}
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}
      </View>
    </Card>
  );
}
