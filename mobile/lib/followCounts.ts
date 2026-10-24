import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { toggleFollow } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/**
 * Followers and following totals learned this session.
 *
 * A follow changes two rows: the other person's followers_count and mine
 * following_count. Screens read those numbers here instead of waiting for
 * their own reload. A failed follow writes the previous totals back.
 */

export type FollowKind = 'followers' | 'following';

type Listener = () => void;

const listeners = new Set<Listener>();
const latest = new Map<string, number>();

/** Bumps on every local edit so a read that started earlier cannot overwrite it. */
let epoch = 0;
/** Reads started while this is above zero are dropped when they land. */
let pending = 0;

function slot(userId: string, kind: FollowKind): string {
  return `${kind}:${userId}`;
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function knownFollowCount(userId: string, kind: FollowKind): number | undefined {
  return latest.get(slot(userId, kind));
}

export function subscribeFollowCounts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishFollowCount(userId: string, kind: FollowKind, count: number): void {
  if (!userId || !Number.isFinite(count)) return;
  const next = Math.max(0, Math.round(count));
  const key = slot(userId, kind);
  if (latest.get(key) === next) return;
  latest.set(key, next);
  epoch += 1;
  emit();
}

/** Mark a server read. Pass the epoch back with the result. */
export function beginFollowCountRead(): number {
  return epoch;
}

/**
 * A count just read from the server. Ignored while a follow is in flight,
 * and when a follow has moved the totals since this read started.
 */
export function publishFetchedFollowCount(
  userId: string,
  kind: FollowKind,
  count: number,
  seenEpoch: number,
): void {
  if (pending > 0) return;
  if (seenEpoch !== epoch) return;
  if (!userId || !Number.isFinite(count)) return;
  const next = Math.max(0, Math.round(count));
  const key = slot(userId, kind);
  if (latest.get(key) === next) return;
  latest.set(key, next);
  emit();
}

export function useFollowCount(
  userId: string | null | undefined,
  kind: FollowKind,
  base: number,
): number {
  const [known, setKnown] = useState<number | undefined>(() =>
    userId ? knownFollowCount(userId, kind) : undefined,
  );

  useEffect(() => {
    setKnown(userId ? knownFollowCount(userId, kind) : undefined);
    return subscribeFollowCounts(() => {
      setKnown(userId ? knownFollowCount(userId, kind) : undefined);
    });
  }, [userId, kind]);

  return known ?? base;
}

/** The two counters on one profile, under the policies that already allow the read. */
export async function refreshFollowCounts(userId: string, token = beginFollowCountRead()): Promise<void> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('followers_count, following_count')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return;
  const row = data as { followers_count: number; following_count: number };
  publishFetchedFollowCount(userId, 'followers', row.followers_count, token);
  publishFetchedFollowCount(userId, 'following', row.following_count, token);
}

/** Second visit onward. The first focus is the screen's own load. */
export function useRefreshFollowCountsOnFocus(userId: string | null | undefined): void {
  const seenFor = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      if (seenFor.current !== userId) {
        seenFor.current = userId;
        return;
      }
      void refreshFollowCounts(userId);
    }, [userId]),
  );
}

/**
 * Follow or unfollow, then move both counters.
 * `targetFollowers` may be null when this screen does not know the total;
 * the server's number is still published once the call succeeds.
 */
export async function applyToggleFollow(input: {
  targetId: string;
  myId: string | null;
  wasFollowing: boolean;
  targetFollowers: number | null;
  myFollowing: number;
}): Promise<{ following: boolean; followers_count: number }> {
  const { targetId, myId, wasFollowing } = input;
  const delta = wasFollowing ? -1 : 1;
  const targetBase = knownFollowCount(targetId, 'followers') ?? input.targetFollowers;
  const mineBase =
    myId != null ? (knownFollowCount(myId, 'following') ?? input.myFollowing) : input.myFollowing;
  const trackMine = myId != null && myId !== targetId;

  pending += 1;
  epoch += 1;
  try {
    if (targetBase != null) {
      publishFollowCount(targetId, 'followers', targetBase + delta);
    }
    if (trackMine) publishFollowCount(myId, 'following', mineBase + delta);

    const result = await toggleFollow(targetId);
    if (typeof result.followers_count === 'number') {
      publishFollowCount(targetId, 'followers', result.followers_count);
    }
    if (trackMine) {
      const actualDelta = result.following === wasFollowing ? 0 : result.following ? 1 : -1;
      if (actualDelta !== delta) {
        publishFollowCount(myId, 'following', mineBase + actualDelta);
      }
    }
    return result;
  } catch (err) {
    if (targetBase != null) publishFollowCount(targetId, 'followers', targetBase);
    if (trackMine) publishFollowCount(myId, 'following', mineBase);
    throw err;
  } finally {
    epoch += 1;
    pending = Math.max(0, pending - 1);
  }
}
