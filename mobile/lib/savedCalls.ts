import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CallFeedItem } from '@/lib/api.sponsorship';
import { displayName } from '@/lib/format';

/**
 * Sponsor calls the athlete bookmarked. The server has no "save" for calls,
 * so, like playbooks, these live on this phone only (AsyncStorage, one list
 * per signed-in account). Each keeps a small snapshot taken when it was
 * saved, so the Saved screen shows it without asking the server.
 */

export interface SavedCall {
  id: string;
  sponsorId: string;
  brand: string;
  title: string;
  avatar: string | null;
  sport: string | null;
  deadline: string | null;
  savedAt: string;
}

const MAX_CALLS = 200;
const keyFor = (userId: string) => `aceaix.savedCalls.${userId}`;

const cache = new Map<string, SavedCall[]>();
const listeners = new Set<(userId: string) => void>();

function isSavedCall(value: unknown): value is SavedCall {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<SavedCall>;
  return typeof c.id === 'string' && typeof c.title === 'string' && typeof c.brand === 'string';
}

export async function loadSavedCalls(userId: string): Promise<SavedCall[]> {
  const hit = cache.get(userId);
  if (hit) return hit;
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed.filter(isSavedCall) : [];
    cache.set(userId, list);
    return list;
  } catch {
    cache.set(userId, []);
    return [];
  }
}

async function write(userId: string, next: SavedCall[]): Promise<void> {
  cache.set(userId, next);
  for (const fn of listeners) fn(userId);
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    /* Kept in memory for this run. */
  }
}

/** The snapshot kept for a call. */
export function callSnapshot(call: CallFeedItem): Omit<SavedCall, 'savedAt'> {
  return {
    id: call.call_id,
    sponsorId: call.sponsor_user_id,
    brand: call.company_name || displayName(call.sponsor_name),
    title: call.title,
    avatar: call.sponsor_avatar,
    sport: call.sport,
    deadline: call.deadline,
  };
}

/** Save or unsave a call; resolves to whether it is saved now. */
export async function toggleSavedCall(userId: string, call: CallFeedItem): Promise<boolean> {
  const list = await loadSavedCalls(userId);
  if (list.some((c) => c.id === call.call_id)) {
    await write(
      userId,
      list.filter((c) => c.id !== call.call_id),
    );
    return false;
  }
  await write(userId, [{ ...callSnapshot(call), savedAt: new Date().toISOString() }, ...list].slice(0, MAX_CALLS));
  return true;
}

export async function unsaveCall(userId: string, id: string): Promise<void> {
  const list = await loadSavedCalls(userId);
  await write(
    userId,
    list.filter((c) => c.id !== id),
  );
}

/** The account's saved calls, kept current. */
export function useSavedCalls(userId: string | null | undefined): SavedCall[] {
  const [list, setList] = useState<SavedCall[]>(() => (userId ? (cache.get(userId) ?? []) : []));

  useEffect(() => {
    if (!userId) {
      setList([]);
      return;
    }
    let alive = true;
    loadSavedCalls(userId).then((l) => {
      if (alive) setList(l);
    });
    const listener = (changed: string) => {
      if (changed === userId) setList(cache.get(userId) ?? []);
    };
    listeners.add(listener);
    return () => {
      alive = false;
      listeners.delete(listener);
    };
  }, [userId]);

  return list;
}
