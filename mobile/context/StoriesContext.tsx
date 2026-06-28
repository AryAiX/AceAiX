import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  fetchActiveStories,
  markStorySeen,
  StoryAuthorGroup,
} from '@/lib/storiesService';
import { useAuth } from '@/context/AuthContext';

interface StoriesState {
  groups: StoryAuthorGroup[];
  loading: boolean;
  refresh: () => Promise<void>;
  markSeen: (storyId: string) => Promise<void>;
}

const StoriesContext = createContext<StoriesState>({
  groups: [],
  loading: false,
  refresh: async () => {},
  markSeen: async () => {},
});

export function StoriesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryAuthorGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchActiveStories(user.id);
    setGroups(data);
    setLoading(false);
  }, [user]);

  const markSeen = useCallback(
    async (storyId: string) => {
      if (!user) return;
      await markStorySeen(storyId, user.id);
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          stories: g.stories.map((s) =>
            s.id === storyId ? { ...s, seen: true } : s
          ),
          has_unseen: g.stories.some(
            (s) => s.id !== storyId && !s.seen
          ),
        }))
      );
    },
    [user]
  );

  useEffect(() => {
    if (user) refresh();
    else setGroups([]);
  }, [user, refresh]);

  // Realtime: refresh tray when new story inserted
  useEffect(() => {
    if (!user) return;
    channelRef.current = supabase
      .channel('stories_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, () => {
        refresh();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stories' }, (payload) => {
        const deleted = (payload.old as any)?.id;
        if (deleted) {
          setGroups((prev) =>
            prev
              .map((g) => ({
                ...g,
                stories: g.stories.filter((s) => s.id !== deleted),
              }))
              .filter((g) => g.stories.length > 0)
          );
        }
      })
      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [user, refresh]);

  return (
    <StoriesContext.Provider value={{ groups, loading, refresh, markSeen }}>
      {children}
    </StoriesContext.Provider>
  );
}

export const useStoriesContext = () => useContext(StoriesContext);
