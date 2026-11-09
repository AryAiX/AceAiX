import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Playbooks: the athlete's own named folders of saved posts, trials and sponsor calls, like
 * collections elsewhere. They live on this phone only (AsyncStorage, one list
 * per signed-in account); nothing goes to the server. Saving itself still
 * goes through the server as before; a playbook only groups what is saved.
 *
 * Each item keeps a small snapshot (title, line, picture) taken when it was
 * added, so a playbook opens without asking the server for anything.
 */

export type PlaybookItemKind = 'post' | 'trial' | 'call';

export interface PlaybookItem {
  kind: PlaybookItemKind;
  id: string;
  title: string;
  subtitle?: string | null;
  thumb?: string | null;
  addedAt: string;
}

export interface Playbook {
  id: string;
  name: string;
  emoji: string;
  items: PlaybookItem[];
  createdAt: string;
}

export const PLAYBOOK_EMOJIS = ['⚽', '🏀', '🎾', '🏐', '🏊', '🏃', '🥋', '🎯', '🔥', '🧠', '⭐', '🏆'] as const;

const MAX_PLAYBOOKS = 50;
const MAX_ITEMS = 300;

const keyFor = (userId: string) => `aceaix.playbooks.${userId}`;

/* One copy in memory per account, and everyone showing it is told when it
   changes, so the Saved screen and an open sheet never disagree. */
const cache = new Map<string, Playbook[]>();
const listeners = new Set<(userId: string) => void>();

function notify(userId: string) {
  for (const fn of listeners) fn(userId);
}

function isPlaybook(value: unknown): value is Playbook {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<Playbook>;
  return typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.items);
}

export async function loadPlaybooks(userId: string): Promise<Playbook[]> {
  const hit = cache.get(userId);
  if (hit) return hit;
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed.filter(isPlaybook) : [];
    cache.set(userId, list);
    return list;
  } catch {
    /* Storage can fail in a few real contexts; playbooks are a convenience. */
    cache.set(userId, []);
    return [];
  }
}

async function write(userId: string, next: Playbook[]): Promise<void> {
  cache.set(userId, next);
  notify(userId);
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    /* Kept in memory for this run; it just will not survive a restart. */
  }
}

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function createPlaybook(userId: string, name: string, emoji: string): Promise<Playbook> {
  const list = await loadPlaybooks(userId);
  const playbook: Playbook = {
    id: newId(),
    name: name.trim().slice(0, 40),
    emoji,
    items: [],
    createdAt: new Date().toISOString(),
  };
  await write(userId, [playbook, ...list].slice(0, MAX_PLAYBOOKS));
  return playbook;
}

export async function updatePlaybook(
  userId: string,
  id: string,
  changes: Partial<Pick<Playbook, 'name' | 'emoji'>>,
): Promise<void> {
  const list = await loadPlaybooks(userId);
  await write(
    userId,
    list.map((p) =>
      p.id === id ? { ...p, ...changes, name: (changes.name ?? p.name).trim().slice(0, 40) } : p,
    ),
  );
}

export async function deletePlaybook(userId: string, id: string): Promise<void> {
  const list = await loadPlaybooks(userId);
  await write(
    userId,
    list.filter((p) => p.id !== id),
  );
}

export function hasItem(playbook: Playbook, kind: PlaybookItemKind, id: string): boolean {
  return playbook.items.some((i) => i.kind === kind && i.id === id);
}

/** Put the item in or take it out of one playbook. */
export async function togglePlaybookItem(
  userId: string,
  playbookId: string,
  item: Omit<PlaybookItem, 'addedAt'>,
): Promise<void> {
  const list = await loadPlaybooks(userId);
  await write(
    userId,
    list.map((p) => {
      if (p.id !== playbookId) return p;
      const inside = hasItem(p, item.kind, item.id);
      const items = inside
        ? p.items.filter((i) => !(i.kind === item.kind && i.id === item.id))
        : [{ ...item, addedAt: new Date().toISOString() }, ...p.items].slice(0, MAX_ITEMS);
      return { ...p, items };
    }),
  );
}

/** When something is unsaved, it leaves every playbook too. */
export async function removeFromAllPlaybooks(
  userId: string,
  kind: PlaybookItemKind,
  id: string,
): Promise<void> {
  const list = await loadPlaybooks(userId);
  if (!list.some((p) => hasItem(p, kind, id))) return;
  await write(
    userId,
    list.map((p) => ({ ...p, items: p.items.filter((i) => !(i.kind === kind && i.id === id)) })),
  );
}

/** The account's playbooks, kept current. */
export function usePlaybooks(userId: string | null | undefined): Playbook[] {
  const [list, setList] = useState<Playbook[]>(() => (userId ? (cache.get(userId) ?? []) : []));

  useEffect(() => {
    if (!userId) {
      setList([]);
      return;
    }
    let alive = true;
    loadPlaybooks(userId).then((l) => {
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

// ── The "Saved · Add to playbook" offer ───────────────────────────────────────
type OfferListener = (item: Omit<PlaybookItem, 'addedAt'>) => void;
const offerListeners = new Set<OfferListener>();

/** Called right after something is saved: the host shows a small bar. */
export function offerPlaybooks(item: Omit<PlaybookItem, 'addedAt'>): void {
  for (const fn of offerListeners) fn(item);
}

export function useOfferedPlaybookItem(): [
  Omit<PlaybookItem, 'addedAt'> | null,
  () => void,
] {
  const [item, setItem] = useState<Omit<PlaybookItem, 'addedAt'> | null>(null);
  useEffect(() => {
    const fn: OfferListener = (next) => setItem(next);
    offerListeners.add(fn);
    return () => {
      offerListeners.delete(fn);
    };
  }, []);
  const clear = useCallback(() => setItem(null), []);
  return [item, clear];
}
