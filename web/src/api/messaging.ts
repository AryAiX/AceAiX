import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { Conversation, Message, UserProfile } from '../types';
import {
  canonicalConversationParticipants,
  conversationPairFilter,
  isUniqueViolation,
} from '../lib/conversationState';

export type MessagePermissionReason =
  | 'minor_requires_verified_sender'
  | 'minor_requires_guardian_consent'
  | 'recipient_messages_off'
  | 'recipient_only_accepts_followed'
  | 'recipient_only_accepts_verified'
  | 'not_found'
  | 'not_permitted';

export type MessagePermission =
  | { allowed: true; reason: null }
  | { allowed: false; reason: MessagePermissionReason };

const MESSAGE_PERMISSION_REASONS = new Set<MessagePermissionReason>([
  'minor_requires_verified_sender',
  'minor_requires_guardian_consent',
  'recipient_messages_off',
  'recipient_only_accepts_followed',
  'recipient_only_accepts_verified',
  'not_found',
  'not_permitted',
]);

export function messagePermissionReason(reason: MessagePermissionReason): string {
  switch (reason) {
    case 'minor_requires_verified_sender':
      return 'Only verified adults can message this young person.';
    case 'minor_requires_guardian_consent':
      return 'Messaging is unavailable until this young person has guardian approval.';
    case 'recipient_messages_off':
      return 'This person has turned off new messages.';
    case 'recipient_only_accepts_followed':
      return 'This person only accepts messages from people they follow.';
    case 'recipient_only_accepts_verified':
      return 'This person only accepts messages from verified members.';
    case 'not_found':
      return 'This person is no longer available.';
    default:
      return 'You do not have permission to message this person.';
  }
}

export async function canMessageUser(recipientId: string): Promise<MessagePermission> {
  const result = unwrap(
    await supabase.rpc('can_message_user', { p_recipient: recipientId }),
  ) as { allowed?: unknown; reason?: unknown } | null;

  if (result?.allowed === true) return { allowed: true, reason: null };
  const reason = typeof result?.reason === 'string' && MESSAGE_PERMISSION_REASONS.has(result.reason as MessagePermissionReason)
    ? result.reason as MessagePermissionReason
    : 'not_permitted';
  return { allowed: false, reason };
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const rows = unwrap(
    await supabase
      .from('conversations')
      .select(
        `*, p1:user_profiles!conversations_participant_1_id_fkey(${USER_FIELDS}), p2:user_profiles!conversations_participant_2_id_fkey(${USER_FIELDS})`,
      )
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false }),
  ) as Array<Conversation & { p1: UserProfile; p2: UserProfile }>;
  return rows.map((c) => ({ ...c, other_user: c.participant_1_id === userId ? c.p2 : c.p1 }));
}

export async function getOrCreateConversation(
  userId: string,
  otherUserId: string,
): Promise<Conversation> {
  const participants = canonicalConversationParticipants(userId, otherUserId);
  const selectCanonical = () =>
    supabase
      .from('conversations')
      .select('*')
      .or(conversationPairFilter(userId, otherUserId))
      .maybeSingle();

  const existing = unwrap(await selectCanonical()) as Conversation | null;
  if (existing) return existing;

  const permission = await canMessageUser(otherUserId);
  if (!permission.allowed) {
    throw new Error(messagePermissionReason(permission.reason));
  }

  const created = await supabase
    .from('conversations')
    .insert(participants)
    .select('*')
    .single();
  if (!created.error) return created.data as Conversation;
  if (!isUniqueViolation(created.error)) throw new Error(created.error.message);

  const canonical = unwrap(await selectCanonical()) as Conversation | null;
  if (!canonical) {
    throw new Error('Conversation was created concurrently but could not be loaded.');
  }
  return canonical;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  return unwrap(
    await supabase.from('messages').select(`*, sender:user_profiles(${USER_FIELDS})`).eq('conversation_id', conversationId).order('created_at', { ascending: true }),
  ) as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
  const conversation = unwrap(
    await supabase
      .from('conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .maybeSingle(),
  ) as Pick<Conversation, 'participant_1_id' | 'participant_2_id'> | null;
  if (!conversation) throw new Error('Conversation is no longer available.');

  const recipientId =
    conversation.participant_1_id === senderId
      ? conversation.participant_2_id
      : conversation.participant_2_id === senderId
        ? conversation.participant_1_id
        : null;
  if (!recipientId) throw new Error('You are not a participant in this conversation.');

  const permission = await canMessageUser(recipientId);
  if (!permission.allowed) {
    throw new Error(messagePermissionReason(permission.reason));
  }

  const msg = unwrap(
    await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, content }).select('*').single(),
  ) as Message;
  const updated = unwrap(
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString(), last_message_preview: content.slice(0, 120) })
      .eq('id', conversationId)
      .select('id'),
  ) as Array<{ id: string }>;
  if (updated.length === 0) {
    throw new Error('Message was sent, but the conversation could not be updated.');
  }
  return msg;
}

export async function markMessagesRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  unwrap(
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .select('id'),
  );
}
