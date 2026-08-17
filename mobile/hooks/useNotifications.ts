import { useMemo } from 'react';
import { useNotificationContext } from '@/context/NotificationContext';
import { groupNotifications, NotificationGroup } from '@/lib/notificationService';

export function useNotifications(): {
  groups: NotificationGroup[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<{ error: string | null }>;
  markAllRead: () => Promise<{ error: string | null }>;
  dismissNotification: (id: string) => Promise<{ error: string | null }>;
  clearAll: () => Promise<{ error: string | null }>;
} {
  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead, dismissNotification, clearAll } =
    useNotificationContext();

  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  return { groups, unreadCount, loading, error, refresh, markRead, markAllRead, dismissNotification, clearAll };
}
