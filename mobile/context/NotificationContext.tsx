import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  AppNotification,
  fetchNotifications,
  markAllRead as svcMarkAllRead,
  markRead as svcMarkRead,
  dismissNotif as svcDismissNotif,
  clearAllNotifs as svcClearAllNotifs,
  normalizeNotifRow,
} from '@/lib/notificationService';
import { useAuth } from '@/context/AuthContext';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<{ error: string | null }>;
  markAllRead: () => Promise<{ error: string | null }>;
  dismissNotification: (id: string) => Promise<{ error: string | null }>;
  clearAll: () => Promise<{ error: string | null }>;
}

const NotificationContext = createContext<NotificationState>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  refresh: async () => {},
  markRead: async () => ({ error: null }),
  markAllRead: async () => ({ error: null }),
  dismissNotification: async () => ({ error: null }),
  clearAll: async () => ({ error: null }),
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error: fetchError } = await fetchNotifications(user.id);
    setNotifications(data);
    setError(fetchError);
    setLoading(false);
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    const prev = notifications;
    setNotifications((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const { error: reqError } = await svcMarkRead(id);
    if (reqError) setNotifications(prev);
    return { error: reqError };
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    if (!user) return { error: null };
    const prev = notifications;
    setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
    const { error: reqError } = await svcMarkAllRead(user.id);
    if (reqError) setNotifications(prev);
    return { error: reqError };
  }, [notifications, user]);

  const dismissNotification = useCallback(async (id: string) => {
    const prev = notifications;
    setNotifications((cur) => cur.filter((n) => n.id !== id));
    const { error: reqError } = await svcDismissNotif(id);
    if (reqError) setNotifications(prev);
    return { error: reqError };
  }, [notifications]);

  const clearAll = useCallback(async () => {
    if (!user) return { error: null };
    const prev = notifications;
    setNotifications([]);
    const { error: reqError } = await svcClearAllNotifs(user.id);
    if (reqError) setNotifications(prev);
    return { error: reqError };
  }, [notifications, user]);

  useEffect(() => {
    if (user) refresh();
    else setNotifications([]);
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;

    channelRef.current = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = normalizeNotifRow(payload.new);
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = normalizeNotifRow(payload.new);
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const deleted = payload.old as { id: string };
          setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, error, refresh, markRead, markAllRead, dismissNotification, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationContext = () => useContext(NotificationContext);
