"use client";

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { logAuditClient } from "@/lib/audit-client";

// ============================================================================
// Supabase Auth Context (Chapter 6 & 26)
// Multi-role: super_admin | admin | kepala_klinik | pj_mutu | petugas | viewer | jamaah
// ============================================================================

export type UserRole =
  | "super_admin"
  | "admin"
  | "kepala_klinik"
  | "pj_mutu"
  | "petugas"
  | "viewer"
  | "jamaah";

export const STAFF_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "kepala_klinik",
  "pj_mutu",
  "petugas",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  kepala_klinik: "Kepala Klinik",
  pj_mutu: "Penanggung Jawab Mutu",
  petugas: "Petugas",
  viewer: "Viewer",
  jamaah: "Jamaah",
};

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  isStaff: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: UserRole
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [role, setRole] = React.useState<UserRole | null>(null);

  const loadRole = React.useCallback(
    async (userId: string | undefined) => {
      if (!userId) {
        setRole(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        setRole(null);
        return;
      }
      setRole((data?.role as UserRole) ?? null);
    },
    [supabase]
  );

  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadRole(data.session?.user?.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      loadRole(newSession?.user?.id);
      setLoading(false);
      if (event === "SIGNED_IN" && newSession?.user) {
        void logAuditClient("LOGIN", "auth", newSession.user.id);
      } else if (event === "SIGNED_OUT") {
        void logAuditClient("LOGOUT", "auth", session?.user?.id ?? "");
      }
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
    async (email: string, password: string, fullName: string, role: UserRole = "petugas") => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      });
      if (error) return { error: error.message };
      if (data.session) {
        setSession(data.session);
        loadRole(data.session.user?.id);
      }
      return { error: null };
    },
    [supabase, loadRole]
  );

  const signOut = React.useCallback(async () => {
    if (session?.user) {
      await logAuditClient("LOGOUT", "auth", session.user.id);
    }
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
  }, [supabase, session]);

  const isStaff = role ? STAFF_ROLES.includes(role) : false;
  const isSuperAdmin = role === "super_admin";

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    role,
    isStaff,
    isSuperAdmin,
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
