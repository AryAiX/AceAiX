import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';
import { Crown } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TierColors, tierForScore, type Tier } from '@/theme/tokens';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { ScoreProgress } from '@/types/models';

interface Props {
  score: ScoreProgress | null;
  style?: ViewStyle;
  testID?: string;
}

/** Where each tier begins. Mirrors `tierForScore` and `my_progress`. */
const TIER_FLOOR: Record<Tier, number> = {
  rising: 0,
  bronze: 40,
  silver: 55,
  gold: 70,
  elite: 85,
};

const TIER_NAME_KEYS: Record<Tier, string> = {
  rising: 'common.tierRising',
  bronze: 'common.tierBronze',
  silver: 'common.tierSilver',
  gold: 'common.tierGold',
  elite: 'common.tierElite',
};

const BAR_HEIGHT = 10;

/**
 * How far it is to the next tier.
 *
 * The score itself moves slowly and has no visible finish line, which is what
 * makes it hard to care about at fourteen. This bar gives it one: a start, an
 * end, and a number of points between them. It is painted in the colour of the
 * tier being aimed at, so the goal is legible before the words are read.
 */
export function TierProgress({ score, style, testID }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const t = useT();
  const reduceMotion = useReducedMotion();

  const grow = useRef(new Animated.Value(0)).current;

  const nextTier = score?.next_tier ?? null;
  const target = score?.next_tier_at ?? null;
  const overall = score?.overall ?? 0;

  const current = tierForScore(overall);
  const floor = TIER_FLOOR[current];
  const fraction =
    target != null && target > floor
      ? Math.max(0, Math.min(1, (overall - floor) / (target - floor)))
      : 1;

  useEffect(() => {
    if (!score) return;

    const animation = reduceMotion
      ? /* Reduce Motion still gets the arrival — the bar fades up at its final
           length rather than sweeping across. */
        Animated.timing(grow, {
          toValue: fraction,
          duration: 0,
          useNativeDriver: false,
        })
      : Animated.timing(grow, {
          toValue: fraction,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        });

    animation.start();
    return () => animation.stop();
  }, [fraction, reduceMotion, grow, score]);

  if (!score) {
    return (
      <View style={style} testID={testID}>
        <Text variant="captionStrong" tone="secondary">
          {t('progress.scoreNotReadyTitle')}
        </Text>
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
          {t('progress.scoreNotReadyBody')}
        </Text>
      </View>
    );
  }

  // ── Elite: a finished state, not an empty bar ──────────────────────────────
  if (nextTier == null || target == null) {
    const elite = TierColors.elite;
    return (
      <View
        testID={testID}
        accessible
        accessibilityLabel={t('progress.tierTopA11y', { score: overall })}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: theme.alpha(elite, 0.35),
            backgroundColor: theme.alpha(elite, colors.scheme === 'dark' ? 0.16 : 0.1),
            padding: spacing.md,
          },
          style,
        ]}
      >
        <Crown size={22} color={elite} />
        <View style={{ flex: 1 }}>
          <Text variant="subheading" color={elite}>
            {t('progress.tierTopTitle')}
          </Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
            {t('progress.tierTopBody')}
          </Text>
        </View>
      </View>
    );
  }

  const nextColor = TierColors[nextTier];
  const nextName = t(TIER_NAME_KEYS[nextTier]);
  const remaining = score.points_to_next ?? Math.max(0, target - overall);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('progress.pointsToNext', { count: remaining, tier: nextName })}
      accessibilityValue={{ min: floor, max: target, now: overall }}
      style={style}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
        }}
      >
        <Text variant="captionStrong" color={nextColor}>
          {t('progress.pointsToNext', { count: remaining, tier: nextName })}
        </Text>
        <Text variant="caption" tone="muted">
          {t('progress.tierStartsAt', { tier: nextName, score: target })}
        </Text>
      </View>

      <View
        style={{
          height: BAR_HEIGHT,
          borderRadius: radii.pill,
          backgroundColor: colors.surfaceSunken,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            borderRadius: radii.pill,
            backgroundColor: nextColor,
            width: grow.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: spacing.xs,
        }}
      >
        <Text variant="overline" tone="muted">
          {t(TIER_NAME_KEYS[current])}
        </Text>
        <Text variant="overline" color={nextColor}>
          {nextName}
        </Text>
      </View>
    </View>
  );
}
