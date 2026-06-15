import { supabase, unwrap } from './_helpers';
import type { Notification } from '../types';

export async function listNotifications(userId: string, limit = 20): Promise<Notification[]> {
  return unwrap(
    await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit),
  ) as Notification[];
}

export async function unreadCount(userId: string): Promise<number> {
  const res = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
  return res.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
}
