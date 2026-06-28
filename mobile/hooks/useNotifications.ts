import { useMemo } from 'react';
import { useNotificationContext } from '@/context/NotificationContext';
import { groupNotifications, NotificationGroup } from '@/lib/notificationService';

export function useNotifications(): {
  groups: NotificationGroup[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeNotif: (id: string) => void;
} {
  const { notifications, unreadCount, loading, refresh, markRead, markAllRead, removeNotif } =
    useNotificationContext();

  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  return { groups, unreadCount, loading, refresh, markRead, markAllRead, removeNotif };
}
