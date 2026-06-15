import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { Conversation, Message, UserProfile } from '../types';

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

export async function getOrCreateConversation(userId: string, otherUserId: string): Promise<Conversation> {
  const existing = unwrap(
    await supabase
      .from('conversations')
      .select('*')
      .or(
        `and(participant_1_id.eq.${userId},participant_2_id.eq.${otherUserId}),and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${userId})`,
      )
      .maybeSingle(),
  ) as Conversation | null;
  if (existing) return existing;
  return unwrap(
    await supabase.from('conversations').insert({ participant_1_id: userId, participant_2_id: otherUserId }).select('*').single(),
  ) as Conversation;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  return unwrap(
    await supabase.from('messages').select(`*, sender:user_profiles(${USER_FIELDS})`).eq('conversation_id', conversationId).order('created_at', { ascending: true }),
  ) as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
  const msg = unwrap(
    await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, content }).select('*').single(),
  ) as Message;
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString(), last_message_preview: content.slice(0, 120) })
    .eq('id', conversationId);
  return msg;
}

export async function markMessagesRead(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId);
}
