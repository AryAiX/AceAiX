import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { Translate } from '@/lib/i18n-bridge';
import type { Opportunity } from '@/types/models';

/**
 * What the opportunity match number is allowed to say.
 *
 * `recommended_opportunities` (20260904000003_matching_and_discovery.sql) calls
 * `private.match_fit` with `age_ok` and `level_ok` hard-coded to true, so
 * "Inside your age range" and "Competing at the level you scout" come back on
 * every single row and mean nothing. `position_ok` is true when the posting
 * simply left the position blank, and `country_ok` is true when the club has no
 * country — or when there is no club at all.
 *
 * Two rules follow, and both live here so the card, the detail screen and the
 * club page cannot drift apart:
 *   1. Keep only the reasons the database actually tested, phrased for the
 *      athlete reading them rather than the recruiter the SQL was written for.
 *   2. Nothing left to say, no percentage. An unexplained number is worse than
 *      no number.
 */

/** Enough of an opportunity to judge which reasons are real. */
export type MatchSubject = Pick<
  Opportunity,
  'match_percent' | 'reasons' | 'position' | 'org_id'
>;

export interface MatchExplanation {
  percent: number;
  reasons: string[];
}

/**
 * Reason strings exactly as `private.match_reasons` emits them.
 *
 * `source` is the database's English and stays English — it is the lookup key,
 * not something anyone reads. `key` is the same reason rewritten in the
 * athlete's voice, which is what actually appears on screen.
 *
 * `keep` decides whether the criterion behind the reason was really tested.
 * A reason missing from this table is dropped: it is either one of the two the
 * SQL always passes, or new wording nobody has translated for athletes yet.
 */
const REASONS: {
  source: string;
  key: string;
  keep: (subject: MatchSubject) => boolean;
}[] = [
  { source: 'Plays your sport', key: 'opportunities.match.reason.sport', keep: () => true },
  {
    source: 'Matches the position you need',
    key: 'opportunities.match.reason.position',
    // Only real when the posting named a position at all.
    keep: (s) => !!s.position?.trim(),
  },
  {
    source: 'Based in your region',
    key: 'opportunities.match.reason.region',
    // Only real when there is a club whose country could be compared.
    keep: (s) => !!s.org_id,
  },
  {
    source: 'Top-tier talent score',
    key: 'opportunities.match.reason.topTier',
    keep: () => true,
  },
  {
    source: 'Strong talent score',
    key: 'opportunities.match.reason.strongScore',
    keep: () => true,
  },
];

/** Null when the match cannot be justified, and so must not be shown. */
export function explainMatch(t: Translate, subject: MatchSubject): MatchExplanation | null {
  const raw = subject.reasons ?? [];
  if (raw.length === 0) return null;

  const reasons = REASONS.filter((r) => raw.includes(r.source) && r.keep(subject)).map((r) =>
    t(r.key),
  );
  if (reasons.length === 0) return null;

  return {
    percent: Math.max(0, Math.min(100, Math.round(subject.match_percent))),
    reasons,
  };
}

type Band = 'strong' | 'good' | 'fair' | 'low';

function band(percent: number): Band {
  if (percent >= 85) return 'strong';
  if (percent >= 70) return 'good';
  if (percent >= 50) return 'fair';
  return 'low';
}

/** The colours a match percentage is drawn in, shared by pill and block. */
function useMatchSkin(percent: number) {
  const { colors } = useTheme();
  const skins: Record<Band, { bg: string; fg: string }> = {
    strong: { bg: colors.primarySoft, fg: colors.primary },
    good: { bg: colors.successSoft, fg: colors.success },
    fair: { bg: colors.infoSoft, fg: colors.info },
    low: { bg: colors.surfaceAlt, fg: colors.textMuted },
  };
  return skins[band(percent)];
}

/** Compact pill: the number, then the word it means. */
export function MatchPill({
  percent,
  size = 'md',
  style,
}: {
  percent: number;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}) {
  const t = useT();
  const { radii, spacing } = useTheme();
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const { bg, fg } = useMatchSkin(value);

  return (
    <View
      accessible
      accessibilityLabel={t('opportunities.match.percentA11y', { percent: value })}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderRadius: radii.md,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
          paddingVertical: size === 'sm' ? spacing.xs : 6,
          minWidth: size === 'sm' ? 50 : 60,
        },
        style,
      ]}
    >
      <Text variant="stat" color={fg} style={{ fontSize: size === 'sm' ? 18 : 22 }} numberOfLines={1}>
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

/** The full explanation: the number, then every reason behind it, ticked off. */
export function MatchBlock({ match, style }: { match: MatchExplanation; style?: ViewStyle }) {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const { fg } = useMatchSkin(match.percent);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: spacing.lg,
          padding: spacing.lg,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        style,
      ]}
    >
      <MatchPill percent={match.percent} />

      <View style={{ flex: 1, gap: spacing.sm }}>
        <Text variant="captionStrong" tone="secondary">
          {t('opportunities.match.why')}
        </Text>
        <View style={{ gap: 6 }}>
          {match.reasons.map((reason) => (
            <View
              key={reason}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Check size={15} color={fg} strokeWidth={2.6} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                {reason}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
