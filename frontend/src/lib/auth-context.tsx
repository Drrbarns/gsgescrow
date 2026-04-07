'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from './supabase/browser';
import { api } from './api';
import type { User, Session } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Profile {
  user_id: string;
  phone: string;
  full_name: string;
  role: 'buyer' | 'seller' | 'admin' | 'superadmin';
  ghana_card_name?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  baseProfile: Profile | null;
  impersonation: any | null;
  loading: boolean;
  profileLoaded: boolean;
  signInWithOtp: (phone: string) => Promise<{ error: any }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: any }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string, full_name: string, role: 'buyer' | 'seller') => Promise<{ error: any; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  startImpersonation: (targetUserId: string, reason: string, expiresMinutes?: number) => Promise<{ error: any }>;
  stopImpersonation: (reason?: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [baseProfile, setBaseProfile] = useState<Profile | null>(null);
  const [impersonation, setImpersonation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const supabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(); // sets loading=false itself immediately
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile();
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile() {
    // Unblock auth loading immediately
    setLoading(false);
    try {
      // Load profile directly from Supabase so this works without the backend
      const supabase = createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { setProfile(null); setProfileLoaded(true); return; }
      const { data, error } = await (supabase as SupabaseClient)
        .from('profiles')
        .select('user_id, phone, full_name, role, ghana_card_name')
        .eq('user_id', currentUser.id)
        .single();
      if (error || !data) {
        // Fall back to backend if Supabase query fails
        try {
          const res = await api.getMe();
          setProfile(res.data);
          setBaseProfile(res.data);
        } catch {
          setProfile(null);
          setBaseProfile(null);
        }
        setProfileLoaded(true);
        return;
      }
      setProfile(data);
      setBaseProfile(data);

      if (data.role === 'superadmin') {
        try {
          const current = await api.getCurrentImpersonation();
          if (current.data?.target_profile) {
            setImpersonation(current.data);
            setProfile(current.data.target_profile);
          } else {
            setImpersonation(null);
          }
        } catch {
          setImpersonation(null);
        }
      } else {
        setImpersonation(null);
      }
      setProfileLoaded(true);
    } catch {
      setProfile(null);
      setBaseProfile(null);
      setProfileLoaded(true);
    }
  }

  async function signInWithOtp(phone: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error };
  }

  async function verifyOtp(phone: string, token: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    return { error };
  }

  async function signInWithEmail(email: string, password: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUpWithEmail(email: string, password: string, full_name: string, role: 'buyer' | 'seller') {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, role } },
    });
    if (error) return { error };
    if (data?.user) {
      if (data.session) {
        // Auto-confirmed: update profile role if trigger set it to 'buyer'
        try {
          await api.createProfile({ full_name, role });
        } catch {
          // Profile created by trigger; role update may fail — that's ok
        }
        await loadProfile();
      }
      // If no session, email confirmation is required — user will get an email
    }
    return { error: null, needsConfirmation: !data?.session };
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setBaseProfile(null);
    setImpersonation(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sbs_impersonation_token');
    }
  }

  async function refreshProfile() {
    await loadProfile();
  }

  async function startImpersonation(targetUserId: string, reason: string, expiresMinutes = 30) {
    try {
      const res = await api.startImpersonation(targetUserId, reason, expiresMinutes);
      if (typeof window !== 'undefined' && res.data?.session_token) {
        localStorage.setItem('sbs_impersonation_token', res.data.session_token);
      }
      setImpersonation(res.data);
      if (res.data?.target_profile) {
        setProfile(res.data.target_profile);
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async function stopImpersonation(reason?: string) {
    try {
      await api.stopImpersonation(undefined, reason);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sbs_impersonation_token');
      }
      setImpersonation(null);
      setProfile(baseProfile);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      baseProfile,
      impersonation,
      loading,
      profileLoaded,
      signInWithOtp,
      verifyOtp,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      refreshProfile,
      startImpersonation,
      stopImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
