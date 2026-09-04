import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import type { Tier } from '@/theme/tokens';
import { Avatar, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { countryLabel, positionLabel } from '@/constants/sports';
import { ageBandLabel, displayName, metaLine, relativeTime } from '@/lib/format';
import type { Applicant } from '@/types/models';
import { ApplicationStatusBadge, statusLabel } from './ApplicationStatusBadge';
import { MatchPill } from './MatchExplain';

/** Tier names are shared vocabulary; the colour ramp stays in theme/tokens. */
const TIER_KEY: Record<Tier, string> = {
  rising: 'common.tierRising',
  bronze: 'common.tierBronze',
  silver: 'common.tierSilver',
  gold: 'common.tierGold',
  elite: 'common.tierElite',
};

/** Talent score as a tier-coloured pill — the same treatment discovery uses. */
function ScorePill({ score }: { score: number }) {
  const t = useT();
  const theme = useTheme();
  const { radii, spacing } = theme;
  const tier = tierForScore(score);
  const color = TierColors[tier];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        backgroundColor: theme.alpha(color, 0.14),
        borderRadius: radii.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
      }}
    >
      <Text variant="captionStrong" color={color}>
        {Math.round(score)}
      </Text>
      <Text variant="overline" color={color} style={{ fontSize: 9 }}>
        {t(TIER_KEY[tier])}
      </Text>
    </View>
  );
}

interface Props {
  applicant: Applicant;
  /** Shown when the list spans more than one posting. */
  postingTitle?: string;
  onPress: () => void;
}

/**
 * One applicant in a ranked review list.
 *
 * `opportunity_applicants` scores fit against the posting's own sport and
 * position, so here the percentage is earned by the posting itself and needs no
 * reasons the way the athlete's feed does — it is a ranking device for someone
 * about to read the whole application anyway.
 */
export function ApplicantRow({ applicant, postingTitle, onPress }: Props) {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  const name = displayName(applicant.full_name);
  const meta = metaLine(
    positionLabel(t, applicant.position),
    // A minor's exact age is withheld by the server; the band stands in for it.
    applicant.age != null
      ? t('common.ageYears', { age: applicant.age })
      : ageBandLabel(applicant.age_band),
    countryLabel(t, applicant.country),
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={metaLine(
        name,
        meta,
        t('opportunities.applicant.talentScoreA11y', {
          score: Math.round(applicant.talent_score),
        }),
        t('opportunities.match.fitPercentA11y', {
          percent: Math.round(applicant.match_percent),
        }),
        statusLabel(t, applicant.status, 'recruiter'),
        postingTitle,
      )}
      accessibilityHint={t('opportunities.applicant.open')}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: theme.hit.comfortable,
        padding: spacing.md,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
      })}
    >
      <Avatar
        uri={applicant.avatar_url}
        name={name}
        size="md"
        score={applicant.talent_score}
      />

      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        {meta ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {postingTitle ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {postingTitle}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: spacing.xs,
            marginTop: 2,
          }}
        >
          <ScorePill score={applicant.talent_score} />
          <ApplicationStatusBadge status={applicant.status} voice="recruiter" />
          <Text variant="caption" tone="muted">
            {relativeTime(applicant.applied_at)}
          </Text>
        </View>
      </View>

      <MatchPill percent={applicant.match_percent} size="sm" />
    </Pressable>
  );
}
