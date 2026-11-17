import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import type { Message, UserRole } from '@/types/models';

/**
 * Messaging-only data access.
 *
 * `lib/api.ts` owns every call the whole app shares. This file owns the two
 * things only the thread screen needs: who the other person in a conversation
 * is (including whether they are a minor, which decides the safety banner),
 * and the purely local "muted" list, which is a per-device preference and
 * deliberately never leaves the phone.
 */

// ── The other person in a thread ─────────────────────────────────────────────

export interface ConversationPeer {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
  /** Drives the under-18 banner above the composer. */
  is_minor: boolean;
}

/**
 * Resolve the other participant of a conversation.
 *
 * `get_conversations` only returns the most recent threads, so a chat opened
 * from a notification (or a deep link) cannot rely on the inbox having loaded
 * it. Row-level security on `conversations` already restricts this to threads
 * the viewer is part of, so a missing row means "not yours, or gone".
 */
export async function getConversationPeer(
  conversationId: string,
): Promise<ConversationPeer> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new AppError('Not signed in');

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('id, participant_1_id, participant_2_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (conversationError) throw new AppError(conversationError);
  if (!conversation) throw new AppError('This conversation is no longer available.');

  const pair = conversation as unknown as {
    participant_1_id: string;
    participant_2_id: string;
  };
  const otherId =
    pair.participant_1_id === auth.user.id ? pair.participant_2_id : pair.participant_1_id;

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, full_name, avatar_url, role, is_verified, is_minor')
    .eq('id', otherId)
    .maybeSingle();

  if (profileError) throw new AppError(profileError);
  if (!profile) throw new AppError('This account is no longer available.');

  const row = profile as unknown as Record<string, unknown>;
  return {
    id: row.id as string,
    full_name: (row.full_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    role: (row.role as UserRole) ?? 'athlete',
    is_verified: (row.is_verified as boolean) ?? false,
    is_minor: (row.is_minor as boolean) ?? false,
  };
}

// ── Optimistic send bookkeeping ──────────────────────────────────────────────

export type MessageStatus = 'sent' | 'sending' | 'failed';

/** A message on screen, which may not exist on the server yet. */
export interface ChatMessage extends Message {
  status?: MessageStatus;
}

/** Ids for optimistic rows. Prefixed so they can never collide with a uuid. */
export function localMessageId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isLocalMessage(id: string): boolean {
  return id.startsWith('local-');
}

// ── Muted conversations (this device only) ───────────────────────────────────

/** Shared list from before mutes were stored per account. */
const LEGACY_MUTED_KEY = 'aceaix.muted-conversations';

const keyFor = (userId: string) => `aceaix.muted-conversations.${userId}`;

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Muting is a local comfort setting, not a safety control: it changes how the
 * inbox looks on this phone and nothing else. Anything that protects a person
 * — blocking, reporting, guardian consent — lives in the database instead.
 * Each signed-in account keeps its own list (QA-164).
 */
export async function getMutedConversations(userId: string): Promise<string[]> {
  try {
    const key = keyFor(userId);
    const own = await AsyncStorage.getItem(key);
    if (own != null) return parseIds(own);

    /* One-time carry-over: the first account to read the old shared list takes it. */
    const legacy = await AsyncStorage.getItem(LEGACY_MUTED_KEY);
    if (legacy == null) return [];

    const ids = parseIds(legacy);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(ids));
      await AsyncStorage.removeItem(LEGACY_MUTED_KEY);
    } catch {
      /* Shown for this read; the next open can finish the move. */
    }
    return ids;
  } catch {
    return [];
  }
}

/** Returns the full list after the change, so callers can set state from it. */
export async function setConversationMuted(
  userId: string,
  conversationId: string,
  muted: boolean,
): Promise<string[]> {
  const current = await getMutedConversations(userId);
  const next = muted
    ? Array.from(new Set([...current, conversationId]))
    : current.filter((id) => id !== conversationId);

  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    /* A device that cannot write preferences still gets the in-memory result. */
  }
  return next;
}

// ── Sent / Seen on the inbox ─────────────────────────────────────────────────

export type Receipt = 'sent' | 'seen';

/**
 * For each conversation whose newest message is yours: whether the other
 * person has opened it. Reads the messages you sent (which you can already
 * read) — nothing on the server changes.
 */
export async function getInboxReceipts(
  conversations: { id: string; last_message_at: string | null }[],
  myId: string,
): Promise<Record<string, Receipt>> {
  const withMessages = conversations.filter((c) => c.last_message_at);
  if (withMessages.length === 0) return {};
  const lastAt = new Map(withMessages.map((c) => [c.id, new Date(c.last_message_at as string).getTime()]));

  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id, is_read, created_at')
    .eq('sender_id', myId)
    .in('conversation_id', withMessages.map((c) => c.id))
    .order('created_at', { ascending: false })
    .limit(Math.min(500, withMessages.length * 10));
  if (error || !data) return {};

  const out: Record<string, Receipt> = {};
  const done = new Set<string>();
  for (const row of data as { conversation_id: string; is_read: boolean; created_at: string }[]) {
    if (done.has(row.conversation_id)) continue;
    done.add(row.conversation_id);
    const last = lastAt.get(row.conversation_id);
    /* Yours is the newest message only if it is the one the inbox shows. */
    if (last != null && Math.abs(new Date(row.created_at).getTime() - last) < 1000) {
      out[row.conversation_id] = row.is_read ? 'seen' : 'sent';
    }
  }
  return out;
}
