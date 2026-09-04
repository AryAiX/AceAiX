import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import { getUnreadCounts } from '@/lib/api';
import { useAuth } from './AuthProvider';
import type { UnreadCounts } from '@/types/models';

interface UnreadContextValue extends UnreadCounts {
  refresh: () => Promise<void>;
  /** Optimistically clear a badge after the user opens the relevant screen. */
  clear: (which: 'notifications' | 'messages') => void;
}

const UnreadContext = createContext<UnreadContextValue>({
  notifications: 0,
  messages: 0,
  refresh: async () => {},
  clear: () => {},
});

/**
 * Keeps the tab-bar badges honest.
 *
 * Realtime tells us the instant something lands; a foreground refresh covers
 * the case where the socket dropped while the app was backgrounded, which is
 * the usual reason a notification badge goes stale.
 */
export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ notifications: 0, messages: 0 });
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!user || inFlight.current) return;
    inFlight.current = true;
    try {
      setCounts(await getUnreadCounts());
    } catch {
      /* badges are cosmetic — never surface an error for them */
    } finally {
      inFlight.current = false;
    }
  }, [user]);

  const clear = useCallback((which: 'notifications' | 'messages') => {
    setCounts((c) => ({ ...c, [which]: 0 }));
  }, []);

  useEffect(() => {
    if (!user) {
      setCounts({ notifications: 0, messages: 0 });
      return;
    }
    refresh();

    const channel = supabase
      .channel(`unread:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => refresh(),
      )
      .subscribe();

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      supabase.removeChannel(channel);
      appSub.remove();
    };
  }, [user, refresh]);

  const value = useMemo(
    () => ({ ...counts, refresh, clear }),
    [counts, refresh, clear],
  );

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread(): UnreadContextValue {
  return useContext(UnreadContext);
}
