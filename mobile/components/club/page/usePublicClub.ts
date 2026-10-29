import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { toggleSaveOpportunity } from '@/lib/api';
import { setClubFollow, type ClubOrganization } from '@/lib/api.club';
import { errorMessage } from '@/lib/errors';
import type { Opportunity, Organization } from '@/types/models';

/** The shape `organizationOpenings` still asks for. */
export function toOpportunityOrganization(org: ClubOrganization): Organization {
  return {
    id: org.id,
    name: org.name,
    type: org.type,
    logo_url: org.logo_url,
    cover_url: org.cover_url,
    description: org.description,
    city: org.city,
    country: org.country,
    league: org.league,
    is_verified: org.is_verified,
    followers_count: org.followers_count,
  };
}

/**
 * Optimistic follow on a public club page. Pull-to-refresh calls `resetFollow`
 * so the next read of the page wins.
 */
export function useClubFollow(orgId: string | null, serverFollowing: boolean, followersCount: number) {
  const toast = useToast();
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  const [followerDelta, setFollowerDelta] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    setFollowOverride(null);
    setFollowerDelta(0);
  }, [orgId]);

  const following = followOverride ?? serverFollowing;
  const followers = Math.max(0, followersCount + followerDelta);

  const resetFollow = useCallback(() => {
    setFollowOverride(null);
    setFollowerDelta(0);
  }, []);

  const onToggleFollow = useCallback(async () => {
    if (!orgId || followBusy) return;
    const next = !following;
    setFollowOverride(next);
    setFollowerDelta((d) => d + (next ? 1 : -1));
    setFollowBusy(true);
    try {
      await setClubFollow(orgId, next);
    } catch (err) {
      setFollowOverride(!next);
      setFollowerDelta((d) => d + (next ? -1 : 1));
      toast.error(errorMessage(err));
    } finally {
      setFollowBusy(false);
    }
  }, [orgId, following, followBusy, toast]);

  return { following, followers, followBusy, onToggleFollow, resetFollow };
}

/** Save / unsave on the openings list, shared by the page and its section screen. */
export function useSavedOpenings(orgId: string | null) {
  const t = useT();
  const toast = useToast();
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSaved({});
  }, [orgId]);

  const onToggleSave = useCallback(
    async (opportunity: Opportunity, next: boolean) => {
      setSaved((current) => ({ ...current, [opportunity.id]: next }));
      try {
        // The API takes the CURRENT state and flips it.
        await toggleSaveOpportunity(opportunity.id, !next);
        if (next) toast.success(t('opportunities.savedToast'));
      } catch (err) {
        setSaved((current) => ({ ...current, [opportunity.id]: !next }));
        toast.error(errorMessage(err));
      }
    },
    [t, toast],
  );

  return { saved, onToggleSave };
}
