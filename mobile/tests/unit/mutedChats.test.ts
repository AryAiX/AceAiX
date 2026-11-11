import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => new Map<string, string>());

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => {
      const value = store.get(key);
      return value === undefined ? null : value;
    },
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMutedConversations, setConversationMuted } from '@/lib/api.messaging';

const LEGACY_KEY = 'aceaix.muted-conversations';

describe('muted conversations', () => {
  beforeEach(() => {
    store.clear();
  });

  it('does not show a mute from one account in another', async () => {
    await setConversationMuted('account-a', 'chat-1', true);

    expect(await getMutedConversations('account-a')).toEqual(['chat-1']);
    expect(await getMutedConversations('account-b')).toEqual([]);
  });

  it('unmutes a chat', async () => {
    await setConversationMuted('account-a', 'chat-1', true);
    await setConversationMuted('account-a', 'chat-2', true);

    expect(await setConversationMuted('account-a', 'chat-1', false)).toEqual(['chat-2']);
    expect(await getMutedConversations('account-a')).toEqual(['chat-2']);
  });

  it('copies the old shared list into the first account that reads it, then removes it', async () => {
    await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(['chat-1', 'chat-9']));

    expect(await getMutedConversations('account-a')).toEqual(['chat-1', 'chat-9']);
    expect(await AsyncStorage.getItem('aceaix.muted-conversations.account-a')).toBe(
      JSON.stringify(['chat-1', 'chat-9']),
    );
    expect(await AsyncStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(await getMutedConversations('account-b')).toEqual([]);
  });
});
