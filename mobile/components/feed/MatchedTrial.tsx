import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { SectionHeader } from '@/components/ui';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { openOpportunities } from '@/lib/api.opportunities';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import { LogoColors } from '@/theme/tokens';

/**
 * One trial matched to you, under Your week.
 *
 * The best open match from `openOpportunities` — the same list the Trials tab
 * loads, which names the person who posted it — skipping anything already
 * applied to. Athletes only, and gone entirely when nothing is open: an empty
 * card is worse than no card.
 *
 * Loaded again on each return to Home so an application made meanwhile drops
 * the card.
 */
export function MatchedTrial() {
  const t = useT();
  const router = useRouter();
  const { isAthlete } = useAuth();

  const matches = useAsync(() => openOpportunities(5), [], {
    enabled: isAthlete,
    refetchOnFocus: true,
  });

  const best = isAthlete ? ((matches.data ?? []).find((o) => !o.has_applied) ?? null) : null;
  if (!best) return null;

  return (
    <View testID="home-matched-trial">
      <SectionHeader
        title={t('discover.matchedForYou')}
        color={LogoColors.flame}
        action={t('common.seeAll')}
        onAction={() => router.push(Routes.opportunities)}
      />
      <OpportunityCard opportunity={best} />
    </View>
  );
}
