import React from 'react';
import { View } from 'react-native';
import { BadgeCheck, Clock3, MapPin, PartyPopper } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Pulse, Reveal, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { Confetti } from '@/components/celebrate/Confetti';
import { ClubLogo } from '@/components/opportunities/ClubLogo';
import { sportEmoji, sportLabel } from '@/constants/sports';
import { clubLabel } from '@/lib/clubLabels';
import type { ClubDraft } from '@/lib/clubSetup';

/** Step 7: the payoff — the page, summed up, with a burst of confetti. */
export function ClubSetupDone({
  draft,
  papersSent,
}: {
  draft: ClubDraft;
  /** They sent the verification papers in this run (or earlier). */
  papersSent: boolean;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, radii, spacing } = theme;
  const place = [draft.city.trim(), draft.country].filter(Boolean).join(', ');

  return (
    <View style={{ paddingTop: spacing.xl, gap: spacing.xl }}>
      <Reveal from="scale" style={{ alignItems: 'center', gap: spacing.lg }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Pulse color={colors.primarySoft} size={72} radius={radii.xl} />
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radii.xl,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primarySoft,
            }}
          >
            <PartyPopper size={32} color={colors.primary} />
          </View>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text variant="title" align="center" accessibilityRole="header">
            {t('clubSetup.done.title', { name: draft.name.trim() })}
          </Text>
          <Text variant="body" tone="secondary" align="center">
            {t('clubSetup.done.body')}
          </Text>
        </View>
      </Reveal>

      <Reveal index={1}>
        <Card level={1} style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <ClubLogo uri={draft.logo_url} name={draft.name} size="md" />
            <View style={{ flex: 1, gap: theme.spacing.xxs }}>
              <Text variant="subheading" numberOfLines={2}>
                {draft.name.trim()}
              </Text>
              <Badge label={clubLabel(t, 'type', draft.type)} tone="primary" />
            </View>
          </View>

          {place ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <MapPin size={14} color={colors.textMuted} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                {draft.branches.length > 0
                  ? t('clubSetup.done.placeWithBranches', { place, count: draft.branches.length })
                  : place}
              </Text>
            </View>
          ) : null}

          {draft.sports.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {draft.sports.map((s) => (
                <Badge
                  key={s.sport}
                  label={t('clubSetup.done.sportLine', {
                    emoji: sportEmoji(s.sport),
                    sport: sportLabel(t, s.sport),
                    count: s.categories.length,
                  })}
                  tone="neutral"
                  size="md"
                />
              ))}
            </View>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radii.md,
              backgroundColor: papersSent ? colors.infoSoft : colors.warningSoft,
            }}
          >
            {papersSent ? (
              <Clock3 size={18} color={colors.info} />
            ) : (
              <BadgeCheck size={18} color={colors.warning} />
            )}
            <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
              {papersSent ? t('clubSetup.done.papersSent') : t('clubSetup.done.papersLater')}
            </Text>
          </View>
        </Card>
      </Reveal>

      <Confetti />
    </View>
  );
}
