import React from 'react';
import { View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Tier } from '@/theme/tokens';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { DiscoveryFilters, MatchPreferences } from '@/types/models';

/**
 * The match percentage, and the rules that keep it honest.
 *
 * `private.match_fit` in the discovery migration scores an athlete as
 * `talent * 0.45` plus a bonus for every criterion the athlete satisfies — and
 * a criterion the recruiter never set counts as satisfied. So a search with no
 * criteria gives everybody 55–100% and `private.match_reasons` returns all five
 * reason strings, every one of them meaningless.
 *
 * Two rules follow, and both live here so every surface obeys them:
 *   1. No criteria, no match badge. The talent score stands on its own.
 *   2. A reason is shown only when the criterion behind it was actually set.
 */

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export interface MatchCriteria {
  sport: boolean;
  position: boolean;
  age: boolean;
  level: boolean;
  country: boolean;
}

export const NO_CRITERIA: MatchCriteria = {
  sport: false,
  position: false,
  age: false,
  level: false,
  country: false,
};

/** Reason strings exactly as `private.match_reasons` emits them. */
const REASON_CRITERION: Record<string, keyof MatchCriteria> = {
  'Plays your sport': 'sport',
  'Matches the position you need': 'position',
  'Inside your age range': 'age',
  'Competing at the level you scout': 'level',
  'Based in your region': 'country',
};

export function criteriaFromFilters(filters: DiscoveryFilters): MatchCriteria {
  return {
    sport: !!filters.sport,
    position: (filters.positions?.length ?? 0) > 0,
    age: filters.ageMin != null || filters.ageMax != null,
    level: (filters.levels?.length ?? 0) > 0,
    country: (filters.countries?.length ?? 0) > 0,
  };
}

export function criteriaFromPreferences(prefs: MatchPreferences | null): MatchCriteria {
  if (!prefs) return NO_CRITERIA;
  return {
    // recommended_athletes only forwards the first saved sport.
    sport: (prefs.sports?.length ?? 0) > 0,
    position: (prefs.positions?.length ?? 0) > 0,
    age: prefs.age_min != null || prefs.age_max != null,
    level: (prefs.levels?.length ?? 0) > 0,
    country: (prefs.countries?.length ?? 0) > 0,
  };
}

export function hasAnyCriteria(criteria: MatchCriteria): boolean {
  return Object.values(criteria).some(Boolean);
}

/**
 * Drop the reasons whose criterion was never set. Talent-score reasons
 * ("Strong talent score") depend on nothing and always survive.
 */
export function relevantReasons(
  reasons: string[] | null | undefined,
  criteria: MatchCriteria,
): string[] {
  if (!reasons?.length) return [];
  return reasons.filter((reason) => {
    const key = REASON_CRITERION[reason];
    return key ? criteria[key] : true;
  });
}

/**
 * The reasons arrive from the database in English, so the translation happens
 * on the way to the screen rather than in the row.
 *
 * An unmapped reason falls back to the string the database sent. A reason added
 * to `private.match_reasons` before it is added here then reads in English —
 * which is a translation gap, where dropping it would be a missing explanation
 * beside a number the recruiter is about to act on.
 */
const REASON_KEY: Record<string, string> = {
  'Plays your sport': 'discover.reason.sport',
  'Matches the position you need': 'discover.reason.position',
  'Inside your age range': 'discover.reason.age',
  'Competing at the level you scout': 'discover.reason.level',
  'Based in your region': 'discover.reason.country',
  'Top-tier talent score': 'discover.reason.topTier',
  'Strong talent score': 'discover.reason.strongScore',
};

export function reasonLabel(t: Translate, reason: string): string {
  const key = REASON_KEY[reason];
  return key ? t(key) : reason;
}

/** Tier names are shared vocabulary; the ramp itself stays in theme/tokens. */
const TIER_KEY: Record<Tier, string> = {
  rising: 'common.tierRising',
  bronze: 'common.tierBronze',
  silver: 'common.tierSilver',
  gold: 'common.tierGold',
  elite: 'common.tierElite',
};

export function tierLabel(t: Translate, tier: Tier): string {
  return t(TIER_KEY[tier]);
}

type Band = 'strong' | 'good' | 'fair' | 'low';

export function matchBand(percent: number): Band {
  if (percent >= 85) return 'strong';
  if (percent >= 70) return 'good';
  if (percent >= 50) return 'fair';
  return 'low';
}

interface Props {
  percent: number;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

/** Compact pill: the number, then the word it means. */
export function MatchBadge({ percent, size = 'md', style }: Props) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;

  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const skin: Record<Band, { bg: string; fg: string }> = {
    strong: { bg: colors.primarySoft, fg: colors.primary },
    good: { bg: colors.successSoft, fg: colors.success },
    fair: { bg: colors.infoSoft, fg: colors.info },
    low: { bg: colors.surfaceAlt, fg: colors.textMuted },
  };
  const { bg, fg } = skin[matchBand(value)];

  return (
    <View
      accessible
      accessibilityLabel={t('discover.matchPercentA11y', { percent: value })}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderRadius: radii.md,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
          paddingVertical: size === 'sm' ? spacing.xs : 6,
          minWidth: size === 'sm' ? 48 : 58,
        },
        style,
      ]}
    >
      <Text
        variant="stat"
        color={fg}
        style={{ fontSize: size === 'sm' ? 18 : 22 }}
        numberOfLines={1}
      >
        {value}
        <Text variant="captionStrong" color={fg} style={{ fontSize: size === 'sm' ? 10 : 12 }}>
          %
        </Text>
      </Text>
      <Text variant="overline" color={fg} style={{ fontSize: 9, letterSpacing: 0.6 }}>
        {t('common.match')}
      </Text>
    </View>
  );
}
