import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

// ============================================================================
// Server-side Supabase clients.
// ----------------------------------------------------------------------------
// RESILIENCE: Same hardcoded fallback as client.ts — if env vars are missing
// (git auto-commit keeps wiping .env), the app still works.
// ============================================================================

const FALLBACK_SUPABASE_URL = "https://rkbmbyhofygwaucgqcpb.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_LcTXzU8qf3o3B6vpNZCDmA_bJroz-ir";

function getUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
}
function getAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
}
function getServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SUPABASE_ANON_KEY;
}

// Server-side Supabase client (use in Server Components, Route Handlers, Server Actions)
// Reads/writes auth cookies so the user session is shared with the browser client.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getUrl(),
    getAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware refreshes sessions.
          }
        },
      },
    }
  );
}

// Admin client using the service role key — bypasses RLS.
// ONLY use in trusted server-side code (never expose to the browser).
export function createAdminClient() {
  return createServerClient<Database>(
    getUrl(),
    getServiceKey(),
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}
