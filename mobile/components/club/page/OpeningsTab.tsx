import React from 'react';
import { View } from 'react-native';
import { Target } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';
import { useT } from '@/i18n';
import type { Opportunity } from '@/types/models';
import { PreviewRow } from './PreviewRow';
import { PreviewEmpty, previewPending, useReportItems } from './shared';

interface Props {
  loading: boolean;
  error: string | null;
  data: Opportunity[] | null;
  onRetry: () => void;
  following: boolean;
  /** Absent when the viewer runs the page, so the empty state never offers Follow. */
  onFollow?: () => void;
  saved: Record<string, boolean>;
  onToggleSave: (opportunity: Opportunity, next: boolean) => void;
  /** Public-page preview. When set, show at most this many openings and nothing when empty. */
  limit?: number;
  onHasItems?: (has: boolean) => void;
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
  limit,
  onHasItems,
}: Props) {
  const t = useT();
  const { colors, spacing } = useTheme();
  const preview = limit != null;
  const rows = data == null ? [] : preview ? data.slice(0, limit) : data;
  const has = !preview ? null : previewPending(data, error) ? null : error && data == null ? true : rows.length > 0;
  useReportItems(onHasItems, has);
  const offerFollow = !following && !!onFollow;

  if (preview && error && data == null) return <ErrorState message={error} onRetry={onRetry} compact />;
  if (preview && has === false) return <PreviewEmpty title={t('opportunities.org.openingsEmptyTitle')} />;
  if (preview && has !== true) return null;
  if (preview) {
    return (
      <PreviewRow>
        {rows.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            saved={saved[opportunity.id] ?? opportunity.is_saved}
            onToggleSave={onToggleSave}
          />
        ))}
      </PreviewRow>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      {loading || (data == null && !error) ? (
        <SkeletonList count={2} variant="row" />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} compact />
      ) : !preview && rows.length === 0 ? (
        <EmptyState
          compact
          icon={<Target size={26} color={colors.textMuted} />}
          title={t('opportunities.org.openingsEmptyTitle')}
          body={
            following
              ? t('opportunities.org.openingsEmptyFollowing')
              : offerFollow
                ? t('opportunities.org.openingsEmptyBody')
                : undefined
          }
          actionLabel={offerFollow ? t('common.follow') : undefined}
          onAction={offerFollow ? onFollow : undefined}
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
