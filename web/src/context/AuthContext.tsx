import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { authIdentityTransition } from '../lib/authState';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<{ error: Error | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);
  const currentUserId = useRef<string | null>(null);

  async function fetchProfile(userId: string, controlsLoading = false) {
    const requestId = ++profileRequest.current;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (requestId !== profileRequest.current) return;
      if (error) {
        if (!data) return;
      } else {
        setProfile(data ? (data as UserProfile) : null);
      }
    } catch {
      // Keep the last known profile rather than treating the user as logged out.
    } finally {
      if (controlsLoading && requestId === profileRequest.current) setLoading(false);
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const transition = authIdentityTransition(currentUserId.current, session?.user.id ?? null);
      currentUserId.current = session?.user.id ?? null;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (transition !== 'same-user') {
          setLoading(true);
          setProfile(null);
          void fetchProfile(session.user.id, true);
        }
      } else {
        profileRequest.current += 1;
        setProfile(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const transition = authIdentityTransition(currentUserId.current, session?.user.id ?? null);
      currentUserId.current = session?.user.id ?? null;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        if (transition !== 'same-user') {
          setLoading(true);
          setProfile(null);
          void fetchProfile(session.user.id, true);
        }
      } else {
        profileRequest.current += 1;
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signUp(email: string, password: string, role: UserRole, fullName: string) {
    if (session) {
      profileRequest.current += 1;
      setSession(null);
      setUser(null);
      setProfile(null);
      await supabase.auth.signOut();
    }
    // The Edge Function creates a confirmed user server-side; then the browser
    // signs in normally so signup lands inside the app with a real session.
    const { error: signupError } = await supabase.functions.invoke('signup-user', {
      body: { email, password, role, fullName },
    });
    if (signupError) {
      let message = signupError.message;
      const context = (signupError as { context?: Response }).context;
      if (context) {
        const body = await context.json().catch(() => null) as { error?: string } | null;
        message = body?.error ?? message;
      }
      return { error: new Error(message) };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error: error as Error | null };
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  }

  const role = profile?.role ?? null;

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signIn, signUp, requestPasswordReset, updatePassword, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
