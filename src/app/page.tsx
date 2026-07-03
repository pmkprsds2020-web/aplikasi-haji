"use client";

import { AppShell } from "@/components/haji/app-shell";
import { SupabaseAuthProvider } from "@/contexts/supabase-auth-context";

export default function Home() {
  return (
    <SupabaseAuthProvider>
      <AppShell />
    </SupabaseAuthProvider>
  );
}
