import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpAthlete: (fullName: string, email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);

  async function fetchProfile(userId: string) {
    const requestId = ++profileRequest.current;
    setProfile(null);
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
    if (requestId !== profileRequest.current) return;
    setProfile(!error && data ? (data as UserProfile) : null);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const activeSession = data.session;
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      if (activeSession?.user) {
        fetchProfile(activeSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        setLoading(true);
        fetchProfile(nextSession.user.id).finally(() => setLoading(false));
      } else {
        profileRequest.current += 1;
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return { error: error as Error | null };
  }

  async function signUpAthlete(fullName: string, email: string, password: string) {
    if (session) {
      profileRequest.current += 1;
      setSession(null);
      setUser(null);
      setProfile(null);
      await supabase.auth.signOut();
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { error: signupError } = await supabase.functions.invoke('signup-user', {
      body: { fullName: fullName.trim(), email: normalizedEmail, password, role: 'athlete' },
    });

    if (signupError) {
      let message = signupError.message;
      const context = (signupError as { context?: Response }).context;
      if (context) {
        const body = (await context.json().catch(() => null)) as { error?: string } | null;
        message = body?.error ?? message;
      }
      return { error: new Error(message) };
    }

    return signIn(normalizedEmail, password);
  }

  async function signOut() {
    profileRequest.current += 1;
    setProfile(null);
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUpAthlete, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
