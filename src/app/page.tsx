"use client";

import { AppShell } from "@/components/haji/app-shell";
import { SupabaseAuthProvider } from "@/components/haji/supabase-auth-provider";

export default function Home() {
  return (
    <SupabaseAuthProvider>
      <AppShell />
    </SupabaseAuthProvider>
  );
}
