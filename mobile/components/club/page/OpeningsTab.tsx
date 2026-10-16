import React from 'react';
import { View } from 'react-native';
import { Target } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';
import { useT } from '@/i18n';
import type { Opportunity } from '@/types/models';

interface Props {
  loading: boolean;
  error: string | null;
  data: Opportunity[] | null;
  onRetry: () => void;
  following: boolean;
  onFollow: () => void;
  saved: Record<string, boolean>;
  onToggleSave: (opportunity: Opportunity, next: boolean) => void;
}

/** Trials, scholarships and contracts the club has open. Same as it always was. */
export function ClubOpeningsTab({
  loading,
  error,
  data,
  onRetry,
  following,
  onFollow,
  saved,
  onToggleSave,
}: Props) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const rows = data ?? [];

  return (
    <View style={{ gap: spacing.md }}>
      {loading ? (
        <SkeletonList count={2} variant="row" />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} compact />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon={<Target size={26} color={colors.textMuted} />}
          title={t('opportunities.org.openingsEmptyTitle')}
          body={
            following ? t('opportunities.org.openingsEmptyFollowing') : t('opportunities.org.openingsEmptyBody')
          }
          actionLabel={following ? undefined : t('common.follow')}
          onAction={following ? undefined : onFollow}
        />
      ) : (
        rows.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            saved={saved[opportunity.id] ?? opportunity.is_saved}
            onToggleSave={onToggleSave}
          />
        ))
      )}
    </View>
  );
}
