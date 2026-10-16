import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { api, type AdminMe } from './api';

interface AuthState {
  loading: boolean;
  session: Session | null;
  me: AdminMe | null;
  denied: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  async function resolve(s: Session | null) {
    setSession(s);
    setDenied(false);
    if (!s) { setMe(null); setLoading(false); return; }
    try {
      // The server decides who is an admin, not the client.
      setMe(await api.me());
    } catch {
      setMe(null);
      setDenied(true);
      await supabase.auth.signOut();
    }
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') { setSession(null); setMe(null); }
      if (event === 'TOKEN_REFRESHED') setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    loading,
    session,
    me,
    denied,
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      setLoading(true);
      await resolve(data.session);
    },
    signOut: async () => { await supabase.auth.signOut(); setMe(null); setSession(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
