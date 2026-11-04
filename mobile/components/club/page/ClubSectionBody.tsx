import React from 'react';

import type { ClubPage } from '@/lib/api.club';
import { clubPreviewLimit, type ClubSectionName } from '@/lib/clubSection';
import type { Opportunity } from '@/types/models';
import { ClubAboutTab } from './AboutTab';
import { ClubAwardsTab } from './AwardsTab';
import { ClubChallengesTab } from './ChallengesTab';
import { ClubEventsTab } from './EventsTab';
import { ClubMatchesTab } from './MatchesTab';
import { ClubOpeningsTab } from './OpeningsTab';
import { ClubPostsTab } from './PostsTab';
import { ClubSquadsTab } from './SquadsTab';

export interface ClubSectionContext {
  orgId: string;
  canPost: boolean;
  /** On a squad, so youth names stay in full for the page team. */
  onTeam: boolean;
  clubName: string;
  refreshKey: number;
  page: ClubPage;
  mapUrl: string | null;
  openings: {
    loading: boolean;
    error: string | null;
    data: Opportunity[] | null;
    reload: () => void;
  };
  following: boolean;
  /** Omitted for the page team, so an empty openings list never offers Follow. */
  onFollow?: () => void;
  saved: Record<string, boolean>;
  onToggleSave: (opportunity: Opportunity, next: boolean) => void;
}

/** The same section, either as a short preview or exactly as the full screen shows it. */
export function ClubSectionBody({
  name,
  ctx,
  preview = false,
  onHasItems,
}: {
  name: ClubSectionName;
  ctx: ClubSectionContext;
  preview?: boolean;
  onHasItems?: (has: boolean) => void;
}) {
  const limit = preview ? clubPreviewLimit(name) : undefined;
  const common = {
    orgId: ctx.orgId,
    canPost: ctx.canPost,
    refreshKey: ctx.refreshKey,
    limit,
    onHasItems,
  };

  switch (name) {
    case 'about':
      return <ClubAboutTab page={ctx.page} mapUrl={ctx.mapUrl} limit={limit} onHasItems={onHasItems} />;
    case 'matches':
      return <ClubMatchesTab {...common} clubName={ctx.clubName} />;
    case 'squads':
      return <ClubSquadsTab {...common} onTeam={ctx.onTeam} />;
    case 'events':
      return <ClubEventsTab {...common} />;
    case 'challenges':
      return <ClubChallengesTab {...common} />;
    case 'awards':
      return <ClubAwardsTab {...common} />;
    case 'posts':
      return <ClubPostsTab {...common} clubName={ctx.clubName} />;
    case 'openings':
      return (
        <ClubOpeningsTab
          loading={ctx.openings.loading}
          error={ctx.openings.error}
          data={ctx.openings.data}
          onRetry={ctx.openings.reload}
          following={ctx.following}
          onFollow={ctx.onFollow}
          saved={ctx.saved}
          onToggleSave={ctx.onToggleSave}
          limit={limit}
          onHasItems={onHasItems}
        />
      );
  }
}
