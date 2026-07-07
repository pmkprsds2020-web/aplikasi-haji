import { createBrowserClient } from "@supabase/ssr";

// ============================================================================
// Singleton browser-side Supabase client.
// ----------------------------------------------------------------------------
// CRITICAL: createBrowserClient() creates a NEW connection pool each time.
// Calling it on every render causes ERR_INSUFFICIENT_RESOURCES. This singleton
// ensures only ONE client exists per browser tab.
//
// RESILIENCE: The .env and .env.local files keep getting wiped by the git
// auto-commit system. To prevent the app from crashing, we embed the known
// Supabase credentials as a HARDCODED FALLBACK. If env vars are present, they
// take priority; if not, the fallback is used so the app keeps working.
// ============================================================================

// Hardcoded fallback — used ONLY when env vars are missing.
// These are the anon (publishable) key, safe for browser use.
const FALLBACK_SUPABASE_URL = "https://rkbmbyhofygwaucgqcpb.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_LcTXzU8qf3o3B6vpNZCDmA_bJroz-ir";

let _client: ReturnType<typeof createBrowserClient> | null = null;
let _warnedAboutMissingEnv = false;

export function createClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Log only once per page load to avoid console spam.
    if (!_warnedAboutMissingEnv) {
      _warnedAboutMissingEnv = true;
      console.warn(
        "[Supabase] Env vars missing — using hardcoded fallback. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env for production."
      );
    }
  }

  _client = createBrowserClient(url, key);
  return _client;
}
