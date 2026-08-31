import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import type { Profile } from '../supabase/types';
import { getProfile, upsertProfile } from '../data/profiles';

const AUTO_EMAIL    = import.meta.env.VITE_AUTO_EMAIL;
const AUTO_PASSWORD = import.meta.env.VITE_AUTO_PASSWORD;

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadProfile = useCallback(async (authUser: User) => {
    let prof = await getProfile(authUser.id);
    if (!prof) {
      prof = await upsertProfile({
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name ?? 'Jason Harris',
        avatar_url: authUser.user_metadata?.avatar_url ?? null,
        level: 1,
        xp: 0,
        streak_days: 0,
      });
    }
    setProfile(prof);
  }, []);

  const doAutoSignIn = useCallback(async () => {
    if (!AUTO_EMAIL || !AUTO_PASSWORD) {
      setAuthError('Auto-login credentials not configured. Add VITE_AUTO_EMAIL and VITE_AUTO_PASSWORD in Vercel environment variables.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: AUTO_EMAIL,
      password: AUTO_PASSWORD,
    });

    if (error || !data.user) {
      setAuthError('Auto-login failed: ' + (error?.message ?? 'Unknown error'));
      setLoading(false);
      return;
    }

    setUser(data.user);
    await loadProfile(data.user);
    setLoading(false);
  }, [loadProfile]);

  useEffect(() => {
    // Check if already have a valid session (e.g. tab refresh within same session)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user).finally(() => setLoading(false));
      } else {
        // No existing session — auto-sign-in silently
        doAutoSignIn();
      }
    });

    // Keep session in sync across tabs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      if (authUser) {
        loadProfile(authUser);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [doAutoSignIn, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, authError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
