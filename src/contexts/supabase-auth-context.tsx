"use client";

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { logAuditClient } from "@/lib/audit-client";

// ============================================================================
// Supabase Auth Context
// Only TWO roles: dokter | jamaah
// - dokter: full CRUD access (SELECT, INSERT, UPDATE, DELETE) — can delete jamaah
// - jamaah: read-only access to own data — cannot delete anything
// ============================================================================

export type UserRole = "dokter" | "jamaah";

export const STAFF_ROLES: UserRole[] = ["dokter"];

export const ROLE_LABELS: Record<UserRole, string> = {
  dokter: "Dokter",
  jamaah: "Jamaah",
};

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  isStaff: boolean;    // alias for isDoctor (backward compat)
  isDoctor: boolean;   // true if role === "dokter"
  isJamaah: boolean;   // true if role === "jamaah"
  canDelete: boolean;  // true if isDoctor (only doctors can delete)
  canEdit: boolean;    // true if isDoctor (only doctors can edit)
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
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        if (error) {
          console.error("[Auth] Failed to load role:", error.message);
          setRole(null);
          return;
        }
        // Normalize old roles to the new two-role system.
        // Any staff role (super_admin, admin, kepala_klinik, pj_mutu, petugas, viewer) → "dokter"
        const rawRole = data?.role as string | undefined;
        let normalizedRole: UserRole | null = null;
        if (rawRole === "jamaah") {
          normalizedRole = "jamaah";
        } else if (rawRole === "dokter") {
          normalizedRole = "dokter";
        } else if (
          rawRole === "super_admin" ||
          rawRole === "admin" ||
          rawRole === "kepala_klinik" ||
          rawRole === "pj_mutu" ||
          rawRole === "petugas" ||
          rawRole === "viewer" ||
          rawRole === "operator"
        ) {
          // Old staff roles → map to "dokter"
          normalizedRole = "dokter";
          console.warn(`[Auth] Old role "${rawRole}" mapped to "dokter". Please update the profile in Supabase.`);
        } else if (rawRole) {
          // Unknown role — default to jamaah for safety
          normalizedRole = "jamaah";
          console.warn(`[Auth] Unknown role "${rawRole}" — defaulting to "jamaah".`);
        }
        setRole(normalizedRole);

        // Debug logging
        console.log("[Auth] profile.role:", rawRole, "→ normalized:", normalizedRole);
      } catch (e) {
        console.error("[Auth] loadRole exception:", e);
        setRole(null);
      }
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
    async (email: string, password: string, fullName: string, role: UserRole = "dokter") => {
      // Step 1: Create auth account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      });
      if (error) return { error: error.message };

      // Step 2: If role is jamaah, link auth.uid() to existing jamaah record by email
      if (role === "jamaah" && data.user) {
        try {
          console.log("[Auth] Linking jamaah account: searching for email =", email);
          // Try querying with email column first
          const { data: existingJamaah, error: linkErr } = await supabase
            .from("jamaah")
            .select("id, nama, user_id")
            .eq("email", email)
            .maybeSingle();

          if (linkErr) {
            // PGRST204 = column 'email' doesn't exist in jamaah table yet
            // The user needs to run supabase/ADD-EMAIL-COLUMN.sql
            if ((linkErr as { code?: string }).code === "PGRST204") {
              console.warn("[Auth] 'email' column not found in jamaah table. Run supabase/ADD-EMAIL-COLUMN.sql to enable jamaah account linking.");
            } else {
              console.warn("[Auth] Error finding jamaah by email:", linkErr.message);
            }
            // Non-fatal — account is still created, just not linked yet
          } else if (existingJamaah) {
            // Found existing jamaah record — link auth.uid() to user_id
            console.log("[Auth] Found existing jamaah:", (existingJamaah as Record<string, unknown>).nama, "— linking user_id");
            const jamaahId = String((existingJamaah as Record<string, unknown>).id);
            const { error: updateErr } = await supabase
              .from("jamaah")
              .update({ user_id: data.user.id })
              .eq("id", jamaahId);
            if (updateErr) {
              console.warn("[Auth] Failed to link user_id:", updateErr.message);
            } else {
              console.log("[Auth] Jamaah account linked successfully! user_id =", data.user.id);
            }
          } else {
            console.log("[Auth] No existing jamaah found with email =", email, "— account not linked yet. Ask a dokter to create your jamaah record first.");
          }
        } catch (e) {
          console.warn("[Auth] Jamaah linking exception:", e);
        }
      }

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

  const isDoctor = role === "dokter";
  const isJamaah = role === "jamaah";
  const isStaff = isDoctor; // backward compat alias
  const canDelete = isDoctor; // only doctors can delete
  const canEdit = isDoctor; // only doctors can edit

  // Debug logging
  console.log("[Auth] role:", role, "isDoctor:", isDoctor, "canDelete:", canDelete, "canEdit:", canEdit);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    role,
    isStaff,
    isDoctor,
    isJamaah,
    canDelete,
    canEdit,
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
