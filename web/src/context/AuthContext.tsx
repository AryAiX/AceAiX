import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  profileError: string | null;
  role: UserRole | null;
  loading: boolean;
  onlineUserIds: Set<string>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  async function fetchProfile(userId: string) {
    const requestId = ++profileRequest.current;
    setProfile(null);
    setProfileError(null);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (requestId !== profileRequest.current) return;
    if (error) {
      console.error('Failed to fetch profile:', error);
      setProfile(null);
      setProfileError('We couldn\'t load your profile. Please try again.');
      return;
    }
    setProfile(data ? (data as UserProfile) : null);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      let identityChanged = false;
      setSession(session);
      setUser((prev) => {
        identityChanged = prev?.id !== session?.user?.id;
        return session?.user ?? null;
      });
      if (session?.user) {
        if (identityChanged) {
          setLoading(true);
          fetchProfile(session.user.id).finally(() => setLoading(false));
        } else {
          fetchProfile(session.user.id);
        }
      } else {
        profileRequest.current += 1;
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setOnlineUserIds(new Set());
      return;
    }
    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineUserIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [user]);

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

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user?.email) return { error: new Error('No authenticated user.') };
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (verifyError) return { error: new Error('Current password is incorrect.') };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error as Error | null };
  }

  const role = profile?.role ?? null;

  return (
    <AuthContext.Provider value={{ user, session, profile, profileError, role, loading, onlineUserIds, signIn, signUp, signOut, changePassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
