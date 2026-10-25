import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import type { Href } from 'expo-router';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { emailConfirmationRedirect, passwordResetRedirect } from '@/lib/authRedirect';
import { clearPendingInvite } from '@/lib/api.invites';
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
  is_suspended: boolean;
  suspended_reason: string | null;
  onboarding_completed: boolean;
  /** When the server first recorded onboarding as finished. Absent until then. */
  onboarding_completed_at?: string | null;
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
  isSponsor: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    /** Sponsor accounts. Stored as full_name; split name columns stay unset. */
    brandName?: string;
    role: SignupRole;
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<AccountProfile | null>;
  /**
   * One screen to open after the gate moves a freshly finished account into
   * the app. The gate reads it once; Later and every other role leave it unset.
   */
  setPostOnboardingHref: (href: Href | null) => void;
  /** Returns the pending screen and clears it. Null when nothing was set. */
  takePostOnboardingHref: () => Href | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILE_COLUMNS =
  'id, role, full_name, first_name, last_name, avatar_url, is_verified, is_minor, age_band, is_discoverable, is_suspended, suspended_reason, onboarding_completed, allow_messages_from, followers_count, following_count';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const activeUserId = useRef<string | null>(null);
  /** Not state: clearing it must not schedule a second pass of the route gate. */
  const postOnboardingHref = useRef<Href | null>(null);

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
        activeUserId.current = data.session?.user?.id ?? null;
        setSession(data.session ?? null);
        if (data.session?.user) {
          const userId = data.session.user.id;
          const restoredProfile = await loadProfile(userId);
          if (mounted.current && activeUserId.current === userId) {
            setProfile(restoredProfile);
          }
        }
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted.current) return;
      const userId = next?.user?.id ?? null;
      activeUserId.current = userId;
      setSession(next ?? null);

      if (userId) {
        /*
         * Supabase holds its auth lock while this callback runs. Defer all
         * database work so sign-out and token refresh cannot deadlock behind
         * an awaited query in the listener.
         */
        setTimeout(() => {
          void (async () => {
            let p = await loadProfile(userId);
            if (!p && event === 'SIGNED_IN') {
              await new Promise((r) => setTimeout(r, 600));
              p = await loadProfile(userId);
            }
            if (mounted.current && activeUserId.current === userId) setProfile(p);
          })();
        }, 0);
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
    const brand = input.brandName?.trim().slice(0, 80);
    const first = input.firstName?.trim() ?? '';
    const last = input.lastName?.trim() ?? '';
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        emailRedirectTo: emailConfirmationRedirect(Platform.OS),
        data: brand
          ? { role: input.role, full_name: brand }
          : {
              role: input.role,
              first_name: first,
              last_name: last,
              full_name: `${first} ${last}`.trim(),
            },
      },
    });
    if (error) throw new AppError(error);
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    postOnboardingHref.current = null;
    await supabase.auth.signOut();
    await clearPendingInvite();
    setProfile(null);
    setSession(null);
  }, []);

  const setPostOnboardingHref = useCallback((href: Href | null) => {
    postOnboardingHref.current = href;
  }, []);

  const takePostOnboardingHref = useCallback((): Href | null => {
    const href = postOnboardingHref.current;
    postOnboardingHref.current = null;
    return href;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: passwordResetRedirect(Platform.OS) },
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
      isSponsor: role === 'sponsor',
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
      setPostOnboardingHref,
      takePostOnboardingHref,
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
    setPostOnboardingHref,
    takePostOnboardingHref,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
