import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getProgress, markAchievementsSeen, recordActivity } from '@/lib/api';
import { tierForScore, type Tier } from '@/theme/tokens';
import {
  CelebrationOverlay,
  type CelebrationItem,
} from '@/components/celebrate/CelebrationOverlay';
import { achievementFor } from '@/components/celebrate/achievements';
import { useAuth } from './AuthProvider';
import type { AchievementKey, Progress, Streak } from '@/types/models';

interface ProgressContextValue {
  progress: Progress | null;
  streak: Streak | null;
  /** Re-read progress from the server. Never throws. */
  refresh: () => Promise<void>;
  /** Queue something for celebration by hand (a screen that just did the thing). */
  celebrate: (items: CelebrationItem[]) => void;
}

/**
 * A default that works outside the provider.
 *
 * StreakChip and the achievements screen read this context, and neither should
 * explode in a preview, a test renderer or a screen mounted before the provider
 * exists. A quiet zero is the right failure for a delight layer.
 */
const ProgressContext = createContext<ProgressContextValue>({
  progress: null,
  streak: null,
  refresh: async () => {},
  celebrate: () => {},
});

/** Milestones that get their own card rather than a generic achievement one. */
const STREAK_MILESTONES: Partial<Record<AchievementKey, number>> = {
  streak_3: 3,
  streak_7: 7,
  streak_30: 30,
};

/** The achievement the database awards for each tier, so we never show both. */
const TIER_ACHIEVEMENT: Record<Tier, AchievementKey | null> = {
  rising: null,
  bronze: 'tier_bronze',
  silver: 'tier_silver',
  gold: 'tier_gold',
  elite: 'tier_elite',
};

/**
 * The last tier promotion this device has celebrated.
 *
 * `previous_overall` sits in the database until the score is recomputed, which
 * can be days. Without a durable note of what has already been shown, the same
 * promotion would be celebrated on every single launch in between — which is
 * exactly the nagging this layer is not allowed to do.
 */
const TIER_CELEBRATED_KEY = 'aceaix.celebrated-tier';

/**
 * The celebration layer's engine.
 *
 * Three jobs, in order of how invisible they have to be:
 *
 *   1. Tell the server the person turned up today — once per foreground, never
 *      on every screen. `record_activity` extends the streak and re-checks
 *      every achievement, so this single call is what makes the rest true.
 *   2. Hold the progress everything else reads.
 *   3. Decide what deserves a moment, show it, and mark it seen.
 *
 * Nothing in here is allowed to surface an error, block a render or delay a
 * screen. If the network is down, the app is exactly as it was before this
 * provider existed — which is the whole contract for a layer whose only job is
 * to make someone smile.
 */
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [progress, setProgress] = useState<Progress | null>(null);
  const [queue, setQueue] = useState<CelebrationItem[]>([]);

  /* True from the moment a foreground activity call goes out until the app is
     backgrounded again — one call per visit, not one per screen. */
  const recordedThisForeground = useRef(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  /* Keys already queued this session, so a refresh mid-celebration cannot show
     the same unlock twice. */
  const celebrated = useRef(new Set<string>());
  /* The stored tier token, read once per signed-in session. */
  const lastTierToken = useRef<string | null>(null);
  const tierTokenLoaded = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (): Promise<Progress | null> => {
    try {
      const next = await getProgress();
      if (!mounted.current) return null;
      setProgress(next);
      return next;
    } catch {
      /* Silent by design. */
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await load();
  }, [userId, load]);

  const celebrate = useCallback((items: CelebrationItem[]) => {
    if (items.length === 0) return;
    setQueue((existing) => [...existing, ...items]);
  }, []);

  /**
   * What in this snapshot deserves a moment.
   *
   * Unseen achievements come from the server, which is the only thing that can
   * award them. A tier promotion is derived: `previous_overall` and `overall`
   * sitting either side of a boundary is the same test the database uses, and
   * it is the one thing worth celebrating that has no achievement row of its
   * own until the score lands.
   */
  const buildQueue = useCallback(
    (snapshot: Progress): { items: CelebrationItem[]; tierToken: string | null } => {
      const items: CelebrationItem[] = [];
      let tierToken: string | null = null;
      let promotedTo: Tier | null = null;

      const score = snapshot.score;
      if (score && score.previous_overall != null && score.overall > score.previous_overall) {
        const before = tierForScore(score.previous_overall);
        const after = tierForScore(score.overall);
        const token = `${after}:${score.previous_overall}:${score.overall}`;
        const alreadyShown =
          lastTierToken.current === token || celebrated.current.has(token);

        if (before !== after && !alreadyShown) {
          celebrated.current.add(token);
          tierToken = token;
          promotedTo = after;
          items.push({
            kind: 'tier',
            from: score.previous_overall,
            to: score.overall,
            tier: after,
          });
        }
      }

      /* The tier the promotion card just showed also has an achievement row.
         Showing both would be the same news twice; the achievement is still
         marked seen, it simply does not get its own card. */
      const covered = promotedTo ? TIER_ACHIEVEMENT[promotedTo] : null;

      for (const key of snapshot.unseen ?? []) {
        if (key === covered) continue;
        if (celebrated.current.has(key)) continue;
        // A key from a newer migration than this build knows about is skipped.
        if (!achievementFor(key)) continue;
        celebrated.current.add(key);

        const days = STREAK_MILESTONES[key];
        if (days != null) items.push({ kind: 'streak', days });
        else items.push({ kind: 'achievement', key });
      }

      return { items, tierToken };
    },
    [],
  );

  const sync = useCallback(
    async (withActivity: boolean) => {
      if (!userId || inFlight.current) return;
      inFlight.current = true;

      try {
        if (withActivity) {
          /* Failing here is fine: `my_progress` still returns yesterday's
             truth, and today's visit is recorded on the next foreground. */
          await recordActivity().catch(() => {});
        }

        if (!tierTokenLoaded.current) {
          lastTierToken.current = await AsyncStorage.getItem(
            `${TIER_CELEBRATED_KEY}:${userId}`,
          ).catch(() => null);
          tierTokenLoaded.current = true;
        }

        const snapshot = await load();
        if (!snapshot || !mounted.current) return;

        const { items, tierToken } = buildQueue(snapshot);

        if (tierToken) {
          /* Written when the card is queued rather than when it is dismissed:
             an app killed mid-celebration should lose the moment, not repeat
             it on every launch until the score moves again. */
          lastTierToken.current = tierToken;
          AsyncStorage.setItem(`${TIER_CELEBRATED_KEY}:${userId}`, tierToken).catch(() => {});
        }

        if (items.length > 0) setQueue((existing) => [...existing, ...items]);
      } catch {
        /* Silent by design. */
      } finally {
        inFlight.current = false;
      }
    },
    [userId, load, buildQueue],
  );

  // ── First mount, and every return to the foreground ────────────────────────
  useEffect(() => {
    if (!userId) {
      setProgress(null);
      setQueue([]);
      celebrated.current.clear();
      recordedThisForeground.current = false;
      lastTierToken.current = null;
      tierTokenLoaded.current = false;
      return;
    }

    recordedThisForeground.current = true;
    sync(true);

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        if (recordedThisForeground.current) return;
        recordedThisForeground.current = true;
        sync(true);
        return;
      }
      // Backgrounded — the next return to the foreground counts as a new visit.
      if (state === 'background') recordedThisForeground.current = false;
    });

    return () => subscription.remove();
  }, [userId, sync]);

  /**
   * The queue has been shown.
   *
   * Everything unseen is marked, including anything rolled into the "and 2
   * more" line — those are on the wall now, and a person who came back after a
   * fortnight should not meet the same backlog again tomorrow.
   */
  const onCelebrationDone = useCallback(() => {
    const keys = progress?.unseen ?? [];
    setQueue([]);

    if (keys.length > 0) {
      markAchievementsSeen(keys).catch(() => {
        /* It will be marked on the next successful pass. */
      });
      setProgress((current) =>
        current
          ? {
              ...current,
              unseen: [],
              achievements: current.achievements.map((a) =>
                keys.includes(a.key) ? { ...a, seen: true } : a,
              ),
            }
          : current,
      );
    }
  }, [progress]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      streak: progress?.streak ?? null,
      refresh,
      celebrate,
    }),
    [progress, refresh, celebrate],
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
      <CelebrationOverlay items={queue} onDone={onCelebrationDone} />
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  return useContext(ProgressContext);
}
