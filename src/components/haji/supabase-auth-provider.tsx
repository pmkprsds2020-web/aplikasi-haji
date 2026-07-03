"use client";

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** role from profiles table: doctor | admin | jamaah */
  role: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [role, setRole] = React.useState<string | null>(null);

  // Load role from profiles table for the current user
  const loadRole = React.useCallback(
    async (userId: string | undefined) => {
      if (!userId) {
        setRole(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        if (error) {
          setRole(null);
          return;
        }
        setRole((data?.role as string) ?? null);
      } catch {
        setRole(null);
      }
    },
    [supabase]
  );

  React.useEffect(() => {
    let mounted = true;

    // Initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadRole(data.session?.user?.id);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      loadRole(newSession?.user?.id);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadRole]);

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [supabase]
  );

  const signUp = React.useCallback(
    async (email: string, password: string, fullName: string, role: string = "doctor") => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      });
      if (error) return { error: error.message };
      // If email confirmation is disabled, a session is returned immediately.
      if (data.session) {
        setSession(data.session);
        loadRole(data.session.user?.id);
      }
      return { error: null };
    },
    [supabase, loadRole]
  );

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
  }, [supabase]);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    role,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSupabaseAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useSupabaseAuth must be used within <SupabaseAuthProvider>");
  return ctx;
}
