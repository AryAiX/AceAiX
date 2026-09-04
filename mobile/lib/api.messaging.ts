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

const MUTED_KEY = 'aceaix.muted-conversations';

/**
 * Muting is a local comfort setting, not a safety control: it changes how the
 * inbox looks on this phone and nothing else. Anything that protects a person
 * — blocking, reporting, guardian consent — lives in the database instead.
 */
export async function getMutedConversations(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(MUTED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Returns the full list after the change, so callers can set state from it. */
export async function setConversationMuted(
  conversationId: string,
  muted: boolean,
): Promise<string[]> {
  const current = await getMutedConversations();
  const next = muted
    ? Array.from(new Set([...current, conversationId]))
    : current.filter((id) => id !== conversationId);

  try {
    await AsyncStorage.setItem(MUTED_KEY, JSON.stringify(next));
  } catch {
    /* A device that cannot write preferences still gets the in-memory result. */
  }
  return next;
}
