import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { BadgeCheck, Bookmark, BookmarkCheck, MapPin } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, IconButton, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { opportunityTypeLabel, positionLabel, sportLabel } from '@/constants/sports';
import type { Opportunity } from '@/types/models';
import { ClubLogo } from './ClubLogo';
import { DeadlineChip, isClosed } from './DeadlineChip';
import { MatchPill, explainMatch } from './MatchExplain';

interface Props {
  opportunity: Opportunity;
  /** Omit to render without the bookmark action (a preview, or a club page). */
  onToggleSave?: (opportunity: Opportunity, nextSaved: boolean) => void;
  /** Overrides `opportunity.is_saved` while an optimistic toggle is in flight. */
  saved?: boolean;
  /** A status row, an applied date — whatever the list this card sits in needs. */
  footer?: React.ReactNode;
  /** Renders the card inert: the live preview on the posting form. */
  preview?: boolean;
}

/**
 * One opportunity, as an athlete sees it.
 *
 * The match percentage never appears without the reasons behind it — see
 * MatchExplain for why the database's number cannot be trusted on its own.
 */
export function OpportunityCard({ opportunity, onToggleSave, saved, footer, preview }: Props) {
  const t = useT();
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();

  const isSaved = saved ?? opportunity.is_saved;
  const closed = isClosed(opportunity.deadline);
  const match = explainMatch(t, opportunity);
  const typeLabel = opportunityTypeLabel(t, opportunity.type);
  const sport = sportLabel(t, opportunity.sport);
  const position = positionLabel(t, opportunity.position);
  const club = opportunity.org_name?.trim() || t('opportunities.card.independent');

  const summary = metaLine(
    opportunity.title,
    club,
    typeLabel,
    sport,
    position,
    opportunity.location,
    match ? t('opportunities.match.percentA11y', { percent: match.percent }) : null,
    match ? match.reasons.join(', ') : null,
    closed ? t('opportunities.card.closedA11y') : null,
  );

  return (
    <Card
      onPress={preview ? undefined : () => router.push(Routes.opportunity(opportunity.id))}
      accessibilityLabel={preview ? undefined : summary}
      accessibilityHint={preview ? undefined : t('opportunities.card.open')}
      style={{ gap: spacing.md, opacity: closed ? 0.72 : 1 }}
    >
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <ClubLogo uri={opportunity.org_logo} name={club} />

        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {opportunity.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
              {club}
            </Text>
            {opportunity.org_verified ? (
              <BadgeCheck size={14} color={colors.info} fill={colors.infoSoft} strokeWidth={2.2} />
            ) : null}
          </View>
        </View>

        {onToggleSave ? (
          <IconButton
            size={theme.hit.min}
            tone="transparent"
            style={{ marginTop: -spacing.sm, marginRight: -spacing.sm }}
            onPress={() => onToggleSave(opportunity, !isSaved)}
            label={
              isSaved
                ? t('opportunities.card.unsave', { title: opportunity.title })
                : t('opportunities.card.save', { title: opportunity.title })
            }
            icon={
              isSaved ? (
                <BookmarkCheck size={20} color={colors.primary} strokeWidth={2.2} />
              ) : (
                <Bookmark size={20} color={colors.textMuted} strokeWidth={2} />
              )
            }
          />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {typeLabel ? <Badge label={typeLabel} tone="primary" /> : null}
        {sport ? <Badge label={sport} tone="neutral" /> : null}
        {position ? <Badge label={position} tone="neutral" /> : null}
        {opportunity.location ? (
          <Badge
            label={opportunity.location}
            tone="neutral"
            icon={<MapPin size={11} color={colors.textSecondary} strokeWidth={2.4} />}
          />
        ) : null}
        <DeadlineChip deadline={opportunity.deadline} />
      </View>

      {match ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <MatchPill percent={match.percent} size="sm" />
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {match.reasons.slice(0, 2).map((reason) => (
              <Badge key={reason} label={reason} tone="neutral" />
            ))}
          </View>
        </View>
      ) : null}

      {footer}
    </Card>
  );
}
