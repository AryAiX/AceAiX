import { useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { followedOrganizationIds, followedUserIds, toggleOrganizationFollow } from '@/lib/api.discover';
import { errorMessage } from '@/lib/errors';
import { applyToggleFollow, knownFollowCount } from '@/lib/followCounts';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Who and which clubs the viewer follows, with taps applied straight away and
 * rolled back if the server says no. The same rules as the Clubs and Coaches
 * lists on Discover, so a Follow in search behaves exactly like one there.
 */
export function useFollowState() {
  const toast = useToast();
  const { profile } = useAuth();
  const viewerId = profile?.id ?? null;

  const people = useAsync(() => followedUserIds(), [], { refetchOnFocus: true });
  const orgs = useAsync(() => followedOrganizationIds(), [], { refetchOnFocus: true });
  const personSet = useMemo(() => new Set(people.data ?? []), [people.data]);
  const orgSet = useMemo(() => new Set(orgs.data ?? []), [orgs.data]);

  const [personOverrides, setPersonOverrides] = useState<Record<string, boolean>>({});
  const [orgOverrides, setOrgOverrides] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  // A fresh fetch is the truth again (a follow may have changed elsewhere).
  useEffect(() => setPersonOverrides({}), [people.data]);
  useEffect(() => setOrgOverrides({}), [orgs.data]);

  const isPersonFollowed = useCallback(
    (id: string) => personOverrides[id] ?? personSet.has(id),
    [personOverrides, personSet],
  );
  const isOrgFollowed = useCallback((id: string) => orgOverrides[id] ?? orgSet.has(id), [orgOverrides, orgSet]);
  const orgFetched = useCallback((id: string) => orgSet.has(id), [orgSet]);

  const togglePerson = useCallback(
    async (personId: string, next: boolean, followers: number) => {
      setPendingId(personId);
      setPersonOverrides((o) => ({ ...o, [personId]: next }));
      try {
        const result = await applyToggleFollow({
          targetId: personId,
          myId: viewerId,
          wasFollowing: !next,
          targetFollowers: knownFollowCount(personId, 'followers') ?? followers,
          myFollowing: knownFollowCount(viewerId ?? '', 'following') ?? profile?.following_count ?? 0,
        });
        setPersonOverrides((o) => ({ ...o, [personId]: result.following }));
      } catch (err) {
        setPersonOverrides((o) => ({ ...o, [personId]: !next }));
        toast.error(errorMessage(err));
      } finally {
        setPendingId(null);
      }
    },
    [profile?.following_count, toast, viewerId],
  );

  const toggleOrg = useCallback(
    async (orgId: string, next: boolean) => {
      setPendingId(orgId);
      setOrgOverrides((o) => ({ ...o, [orgId]: next }));
      try {
        const result = await toggleOrganizationFollow(orgId, !next);
        setOrgOverrides((o) => ({ ...o, [orgId]: result }));
      } catch (err) {
        setOrgOverrides((o) => ({ ...o, [orgId]: !next }));
        toast.error(errorMessage(err));
      } finally {
        setPendingId(null);
      }
    },
    [toast],
  );

  return { viewerId, pendingId, isPersonFollowed, isOrgFollowed, orgFetched, togglePerson, toggleOrg };
}
