import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseAnonKey } from '@/lib/supabase';

export type UserRole = 'athlete' | 'scout' | 'club' | 'coach' | 'medical_partner' | 'admin' | null;

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  sport: string | null;
  position: string | null;
  phone: string | null;
  sport_category: string | null;
  birthdate: string | null;
  hometown: string | null;
  current_location: string | null;
  nationality: string | null;
  league: string | null;
  chesscom_username: string | null;
  lichess_username: string | null;
  external_provider: string | null;
  external_player_id: string | null;
  football_api_player_id: string | null;
  sportify_linked: boolean;
  sportify_athlete_id: string | null;
  sportify_is_minor: boolean;
  athlete_profile_id: string | null;
  profile_completeness: number;
  visibility_score: number;
  performance_score: number;
  fitness_score: number;
  current_club: string | null;
  is_open_to_offers: boolean;
  is_verified: boolean;
  followers_count: number;
  connections_count: number;
  highlighted_stats: Record<string, number>;
  attributes: Record<string, number>;
  languages: { language: string; proficiency: string }[];
}

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  sport_category: string;
  birthdate: string;
  hometown: string;
  current_location: string;
  nationality: string;
  league?: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: SignUpData) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  role: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  deleteAccount: async () => ({ error: null }),
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);

  async function fetchProfile(userId: string): Promise<Profile | null> {
    const [{ data: publicProfile, error: publicError }, { data: privateProfile }, { data: athleteProfile }] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, role, full_name, avatar_url, bio, city, country, locale, is_verified, subscription_tier')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('user_private')
        .select('phone, date_of_birth')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('athlete_profiles')
        .select('id, sport, position, position_primary, position_secondary, nationality, current_club, level, bio, visibility_score, performance_score, fitness_score, profile_completeness, is_open_to_offers, followers_count, connections_count, highlighted_stats, attributes, languages, chesscom_username, lichess_username, external_provider, external_player_id, football_api_player_id, sportify_linked, sportify_athlete_id, sportify_is_minor')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (publicError || !publicProfile) return null;

    return {
      id: publicProfile.id,
      role: publicProfile.role as UserRole,
      full_name: publicProfile.full_name ?? null,
      avatar_url: publicProfile.avatar_url ?? null,
      bio: publicProfile.bio ?? athleteProfile?.bio ?? null,
      sport: athleteProfile?.sport ?? null,
      position: athleteProfile?.position_primary ?? athleteProfile?.position ?? null,
      phone: privateProfile?.phone ?? null,
      sport_category: athleteProfile?.sport ?? null,
      birthdate: privateProfile?.date_of_birth ?? null,
      hometown: publicProfile.city ?? null,
      current_location: [publicProfile.city, publicProfile.country].filter(Boolean).join(', ') || null,
      nationality: athleteProfile?.nationality ?? null,
      league: athleteProfile?.level ?? null,
      chesscom_username: athleteProfile?.chesscom_username ?? null,
      lichess_username: athleteProfile?.lichess_username ?? null,
      external_provider: athleteProfile?.external_provider ?? null,
      external_player_id: athleteProfile?.external_player_id ?? null,
      football_api_player_id: athleteProfile?.football_api_player_id ?? null,
      sportify_linked: athleteProfile?.sportify_linked ?? false,
      sportify_athlete_id: athleteProfile?.sportify_athlete_id ?? null,
      sportify_is_minor: athleteProfile?.sportify_is_minor ?? false,
      athlete_profile_id: athleteProfile?.id ?? null,
      profile_completeness: athleteProfile?.profile_completeness ?? 0,
      visibility_score: athleteProfile?.visibility_score ?? 0,
      performance_score: athleteProfile?.performance_score ?? 0,
      fitness_score: athleteProfile?.fitness_score ?? 0,
      current_club: athleteProfile?.current_club ?? null,
      is_open_to_offers: athleteProfile?.is_open_to_offers ?? true,
      is_verified: publicProfile.is_verified ?? false,
      followers_count: athleteProfile?.followers_count ?? 0,
      connections_count: athleteProfile?.connections_count ?? 0,
      highlighted_stats: (athleteProfile?.highlighted_stats as Record<string, number>) ?? {},
      attributes: (athleteProfile?.attributes as Record<string, number>) ?? {},
      languages: Array.isArray(athleteProfile?.languages)
        ? athleteProfile.languages as { language: string; proficiency: string }[]
        : [],
    };
  }

  async function loadProfile(userId: string) {
    const requestId = ++profileRequest.current;
    const p = await fetchProfile(userId);
    if (requestId !== profileRequest.current) return;
    setProfile(p);
    setRole((p?.role as UserRole) ?? null);
  }

  async function updateSignupProfile(userId: string, data: SignUpData) {
    const [city, country] = data.current_location.split(',').map((part) => part.trim());
    await Promise.all([
      supabase
        .from('user_profiles')
        .update({
          full_name: data.full_name,
          city: data.hometown || city || null,
          country: country || null,
        })
        .eq('id', userId),
      supabase
        .from('user_private')
        .update({
          phone: data.phone || null,
          date_of_birth: data.birthdate || null,
        })
        .eq('user_id', userId),
      supabase
        .from('athlete_profiles')
        .update({
          sport: data.sport_category || null,
          level: data.league || 'amateur',
          nationality: data.nationality || null,
        })
        .eq('user_id', userId),
    ]);
  }

  async function refreshProfile() {
    if (!user) return;
    await loadProfile(user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        profileRequest.current += 1;
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { error: error.message };
    if (data.user) {
      await loadProfile(data.user.id);
    }
    return { error: null };
  }

  async function signUp(data: SignUpData) {
    if (session) {
      profileRequest.current += 1;
      setSession(null);
      setUser(null);
      setProfile(null);
      setRole(null);
      await supabase.auth.signOut();
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    if (!supabaseAnonKey) {
      return { error: 'Signup is not configured for this build. Please install the latest app version.' };
    }

    const { error: signupError } = await supabase.functions.invoke('signup-user', {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: {
        email: normalizedEmail,
        password: data.password,
        role: 'athlete',
        fullName: data.full_name,
      },
    });
    if (signupError) {
      let message = signupError.message;
      const context = (signupError as { context?: Response }).context;
      if (context) {
        const body = (await context.json().catch(() => null)) as { error?: string } | null;
        message = body?.error ?? message;
      }
      return { error: message };
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: data.password });
    if (error) return { error: error.message };
    if (authData.user) {
      await updateSignupProfile(authData.user.id, data);
      await loadProfile(authData.user.id);
    }

    return { error: null };
  }

  async function signOut() {
    profileRequest.current += 1;
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  }

  async function deleteAccount() {
    if (!session?.access_token || !user) {
      return { error: 'You must be signed in to delete your account.' };
    }

    for (const bucket of ['posts', 'stories', 'avatars']) {
      const paths: string[] = [];
      let offset = 0;
      while (true) {
        const { data, error: listError } = await supabase.storage
          .from(bucket)
          .list(user.id, { limit: 100, offset });
        if (listError) {
          if (listError.message.toLowerCase().includes('bucket not found')) break;
          return { error: `Your ${bucket} media could not be deleted: ${listError.message}` };
        }
        const files = (data ?? []).filter((item) => item.id).map((item) => `${user.id}/${item.name}`);
        paths.push(...files);
        if ((data ?? []).length < 100) break;
        offset += 100;
      }
      for (let index = 0; index < paths.length; index += 100) {
        const { error: removeError } = await supabase.storage
          .from(bucket)
          .remove(paths.slice(index, index + 100));
        if (removeError) {
          return { error: `Your ${bucket} media could not be deleted: ${removeError.message}` };
        }
      }
    }

    const { error } = await supabase.rpc('delete_own_account');

    if (error) {
      return { error: error.message };
    }

    profileRequest.current += 1;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    return { error: null };
  }

  return (
    <AuthContext.Provider
      value={{ session, user, profile, role, loading, signIn, signUp, signOut, deleteAccount, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
