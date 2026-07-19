import { supabase } from '@/lib/supabase';

export type NotifType =
  | 'scout_interest'
  | 'opportunity'
  | 'endorsement'
  | 'connection'
  | 'message'
  | 'verification'
  | 'performance'
  | 'milestone'
  | 'reminder'
  | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotifType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  action_url: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationGroup {
  label: string;
  items: AppNotification[];
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map((row: any) => ({
    ...row,
    body: row.body ?? '',
    data: row.data ?? {},
    action_url: row.action_url ?? null,
    read: row.read ?? row.is_read ?? false,
  })) as AppNotification[];
}

export async function markRead(notifId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true, is_read: true }).eq('id', notifId);
}

export async function markAllRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true, is_read: true }).eq('user_id', userId);
}

export async function dismissNotif(notifId: string): Promise<void> {
  await supabase.from('notifications').delete().eq('id', notifId);
}

export function groupNotifications(notifs: AppNotification[]): NotificationGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  const today: AppNotification[] = [];
  const week: AppNotification[] = [];
  const older: AppNotification[] = [];

  for (const n of notifs) {
    const ts = new Date(n.created_at).getTime();
    if (ts >= todayStart) today.push(n);
    else if (ts >= weekStart) week.push(n);
    else older.push(n);
  }

  const groups: NotificationGroup[] = [];
  if (today.length > 0) groups.push({ label: 'Today', items: today });
  if (week.length > 0) groups.push({ label: 'Earlier this week', items: week });
  if (older.length > 0) groups.push({ label: 'Older', items: older });
  return groups;
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export async function upsertPushToken(userId: string, token: string, platform: string): Promise<void> {
  const { error } = await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,token' }
  );
  if (error) throw new Error(error.message);
}

export interface NotificationPrefs {
  push_enabled?: boolean;
  scout_interest?: boolean;
  opportunity?: boolean;
  endorsement?: boolean;
  connection?: boolean;
  message?: boolean;
  verification?: boolean;
  performance?: boolean;
  milestone?: boolean;
  reminder?: boolean;
  system?: boolean;
  quiet_start?: string;
  quiet_end?: string;
}

export const DEFAULT_PREFS: Required<NotificationPrefs> = {
  push_enabled: true,
  scout_interest: true,
  opportunity: true,
  endorsement: true,
  connection: true,
  message: true,
  verification: true,
  performance: true,
  milestone: true,
  reminder: true,
  system: true,
  quiet_start: '22:00',
  quiet_end: '07:00',
};

export async function fetchNotifPrefs(userId: string): Promise<NotificationPrefs> {
  const { data } = await supabase
    .from('user_private')
    .select('notification_preferences')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.notification_preferences as NotificationPrefs) ?? {};
}

export async function saveNotifPrefs(userId: string, prefs: NotificationPrefs): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_private')
    .update({ notification_preferences: prefs })
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}
