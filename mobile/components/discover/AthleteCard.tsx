import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark, BookmarkCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TierColors, tierForScore } from '@/theme/tokens';
import { Badge, Card, Avatar, IconButton, Text } from '@/components/ui';
import { levelLabelI18n, positionLabel, sportLabel } from '@/constants/sports';
import { useT } from '@/i18n';
import { ageBandLabel, displayName, metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import type { DiscoveredAthlete } from '@/types/models';
import {
  MatchBadge,
  MatchCriteria,
  hasAnyCriteria,
  reasonLabel,
  relevantReasons,
  tierLabel,
} from './MatchBadge';

/** Width of a carousel card — wide enough for a name and one reason. */
export const COMPACT_CARD_WIDTH = 244;

const MAX_REASONS = 3;

interface Props {
  athlete: DiscoveredAthlete;
  /** Which criteria actually produced `match_percent`. See MatchBadge. */
  criteria: MatchCriteria;
  saved?: boolean;
  /** Omit to render the card without the shortlist action (search results). */
  onToggleSave?: (athlete: DiscoveredAthlete, nextSaved: boolean) => void;
  /** Carousel variant: narrower, fewer lines. */
  compact?: boolean;
}

/** Talent score as a tier-coloured pill — the card's one score treatment. */
function ScorePill({ score }: { score: number }) {
  const theme = useTheme();
  const t = useT();
  const { radii, spacing } = theme;
  const tier = tierForScore(score);
  const color = TierColors[tier];
  const tierName = tierLabel(t, tier);

  return (
    <View
      accessible
      accessibilityLabel={t('discover.card.scorePillA11y', { score, tier: tierName })}
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
        {tierName}
      </Text>
    </View>
  );
}

function ReasonChips({ reasons }: { reasons: string[] }) {
  const theme = useTheme();
  if (reasons.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
      {reasons.map((reason) => (
        <Badge key={reason} label={reason} tone="neutral" />
      ))}
    </View>
  );
}

/**
 * The recruiter's unit of decision.
 *
 * The match percentage never appears without the reasons behind it, and it does
 * not appear at all when no criteria were set — with an empty brief the
 * database's fit score is only the talent score in disguise.
 */
export function AthleteCard({ athlete, criteria, saved, onToggleSave, compact }: Props) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const router = useRouter();

  const name = displayName(athlete.full_name);
  const showMatch = hasAnyCriteria(criteria);
  const reasons = relevantReasons(athlete.reasons, criteria)
    .slice(0, compact ? 1 : MAX_REASONS)
    .map((reason) => reasonLabel(t, reason));
  /* Sport, position and level are stored in English; only the label reads in
     the viewer's language. */
  const role = metaLine(
    positionLabel(t, athlete.position),
    sportLabel(t, athlete.sport),
    athlete.level ? levelLabelI18n(t, athlete.level) : null,
  );
  const place = metaLine(athlete.club, athlete.country);

  const open = () => router.push(Routes.profile(athlete.user_id));

  const summary = [
    name,
    role,
    place,
    showMatch
      ? t('discover.matchPercentA11y', { percent: Math.round(athlete.match_percent) })
      : null,
    reasons.join(', ') || null,
    t('discover.card.talentScoreA11y', { score: Math.round(athlete.talent_score) }),
    athlete.is_minor ? t('common.under18') : null,
  ]
    .filter(Boolean)
    .join(', ');

  const saveButton = onToggleSave ? (
    <IconButton
      size={theme.hit.min}
      tone="transparent"
      onPress={() => onToggleSave(athlete, !saved)}
      label={
        saved
          ? t('discover.card.unsave', { name })
          : t('discover.card.save', { name })
      }
      icon={
        saved ? (
          <BookmarkCheck size={20} color={colors.primary} strokeWidth={2.2} />
        ) : (
          <Bookmark size={20} color={colors.textMuted} strokeWidth={2} />
        )
      }
    />
  ) : null;

  if (compact) {
    return (
      <Card
        onPress={open}
        padded="sm"
        accessibilityLabel={summary}
        accessibilityHint={t('discover.card.openProfile')}
        style={{ width: COMPACT_CARD_WIDTH, gap: spacing.sm }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Avatar
            uri={athlete.avatar_url}
            name={name}
            size="md"
            score={athlete.talent_score}
            verified={athlete.is_verified}
          />
          <View style={{ flex: 1 }} />
          {showMatch ? <MatchBadge percent={athlete.match_percent} size="sm" /> : null}
        </View>

        <View>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          {role ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {role}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <ScorePill score={athlete.talent_score} />
          {athlete.is_minor ? <Badge label={t('common.under18')} tone="info" /> : null}
          <View style={{ flex: 1 }} />
          {saveButton}
        </View>

        <ReasonChips reasons={reasons} />
      </Card>
    );
  }

  return (
    <Card
      onPress={open}
      accessibilityLabel={summary}
      accessibilityHint={t('discover.card.openProfile')}
      style={{ gap: spacing.md }}
    >
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Avatar
          uri={athlete.avatar_url}
          name={name}
          size="lg"
          score={athlete.talent_score}
          verified={athlete.is_verified}
        />

        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          {role ? (
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {role}
            </Text>
          ) : null}
          {place ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {place}
            </Text>
          ) : null}
        </View>

        {showMatch ? <MatchBadge percent={athlete.match_percent} /> : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          // The 44pt save target is taller than the pills beside it; pulling the
          // row in keeps the card from growing a band of dead space.
          marginVertical: saveButton ? -spacing.xs : 0,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: spacing.xs,
          }}
        >
          <ScorePill score={athlete.talent_score} />
          {/* The server withholds a minor's exact age and returns only the
              band, so this shows whichever one it actually got. */}
          {athlete.age != null ? (
            <Badge label={t('common.ageYears', { age: athlete.age })} tone="neutral" />
          ) : ageBandLabel(athlete.age_band) ? (
            <Badge label={ageBandLabel(athlete.age_band) as string} tone="neutral" />
          ) : null}
          {/* Contact rules change for a minor — this badge is the recruiter's cue. */}
          {athlete.is_minor ? <Badge label={t('common.under18')} tone="info" /> : null}
          {athlete.open_to_offers === true ? (
            <Badge label={t('discover.card.openToOffers')} tone="success" />
          ) : null}
        </View>
        {saveButton}
      </View>

      <ReasonChips reasons={reasons} />
    </Card>
  );
}
