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
import type { Session, User } from '@supabase/supabase-js';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import type { SignupRole, UserRole, AgeBand } from '@/types/models';

export interface AccountProfile {
  id: string;
  role: UserRole;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_minor: boolean;
  age_band: AgeBand | null;
  is_discoverable: boolean;
  onboarding_completed: boolean;
  allow_messages_from: string;
  followers_count: number;
  following_count: number;
}

interface AuthContextValue {
  /** Undefined while we are still restoring the session from storage. */
  session: Session | null;
  user: User | null;
  profile: AccountProfile | null;
  loading: boolean;
  configured: boolean;

  isAthlete: boolean;
  isRecruiter: boolean;   // coach, club or scout
  isGuardian: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: SignupRole;
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<AccountProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILE_COLUMNS =
  'id, role, full_name, first_name, last_name, avatar_url, is_verified, is_minor, age_band, is_discoverable, onboarding_completed, allow_messages_from, followers_count, following_count';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // A missing profile row is recoverable (the signup trigger may still be
      // running); a real failure is not, but it must not wedge the app.
      return null;
    }
    return (data as AccountProfile) ?? null;
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) return null;
    const next = await loadProfile(uid);
    if (mounted.current) setProfile(next);
    return next;
  }, [session?.user?.id, loadProfile]);

  // Restore the session, then keep it in step with Supabase.
  useEffect(() => {
    mounted.current = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted.current) return;
        setSession(data.session ?? null);
        if (data.session?.user) {
          setProfile(await loadProfile(data.session.user.id));
        }
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, next) => {
      if (!mounted.current) return;
      setSession(next ?? null);

      if (next?.user) {
        /* The signup trigger provisions profile rows; on the very first
           SIGNED_IN they may not be visible yet, so retry briefly. */
        let p = await loadProfile(next.user.id);
        if (!p && event === 'SIGNED_IN') {
          await new Promise((r) => setTimeout(r, 600));
          p = await loadProfile(next.user.id);
        }
        if (mounted.current) setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Supabase pauses token refresh in the background; resume on foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    supabase.auth.startAutoRefresh();
    return () => sub.remove();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new AppError(error);
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async (input) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {
          role: input.role,
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          full_name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
        },
      },
    });
    if (error) throw new AppError(error);
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: 'aceaix://reset-password' },
    );
    if (error) throw new AppError(error);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new AppError(error);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = profile?.role;
    return {
      session,
      user: session?.user ?? null,
      profile,
      loading,
      configured: isSupabaseConfigured,
      isAthlete: role === 'athlete',
      isRecruiter: role === 'coach' || role === 'club' || role === 'scout',
      isGuardian: role === 'guardian',
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
    };
  }, [
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    updatePassword,
    refreshProfile,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
