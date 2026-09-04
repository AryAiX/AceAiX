import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * A single Supabase client for the whole app.
 *
 * Configuration comes from EXPO_PUBLIC_* env vars at build time and is mirrored
 * into `expo.extra` by app.config.js so it survives an EAS build. If it is
 * missing we fail loudly at startup rather than letting every screen fail one
 * by one with an unhelpful network error.
 */

function readConfig(key: 'supabaseUrl' | 'supabaseAnonKey', envKey: string): string {
  const fromExtra = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.[key];
  const fromEnv = process.env[envKey];
  const value = (typeof fromExtra === 'string' && fromExtra) || fromEnv || '';
  return value.trim();
}

export const SUPABASE_URL = readConfig('supabaseUrl', 'EXPO_PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY = readConfig('supabaseAnonKey', 'EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;

/**
 * On web, AsyncStorage is backed by localStorage, which throws in private
 * browsing. Wrapping keeps auth from taking the whole app down with it.
 */
const storage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      /* session will simply not persist */
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* nothing to clean up */
    }
  },
};

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      // Native apps have no URL to parse a session out of.
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-application-name': 'aceaix-mobile' },
    },
    realtime: {
      params: { eventsPerSecond: 5 },
    },
  },
);

/** Storage buckets used by the app. */
export const Buckets = {
  avatars: 'avatars',
  posts: 'posts',
  stories: 'stories',
} as const;

export function publicUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl ?? null;
}
