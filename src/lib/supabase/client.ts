import { createBrowserClient } from "@supabase/ssr";

// ============================================================================
// Singleton browser-side Supabase client.
// ----------------------------------------------------------------------------
// CRITICAL: createBrowserClient() creates a NEW connection pool each time.
// Calling it on every render causes ERR_INSUFFICIENT_RESOURCES (thousands of
// connections). This singleton ensures only ONE client exists per browser tab.
//
// If env vars are missing, we log a ONE-TIME warning (not on every call) and
// return a dummy client so the app doesn't crash — operations will fail
// gracefully with PostgREST errors instead of a white screen.
// ============================================================================

let _client: ReturnType<typeof createBrowserClient> | null = null;
let _warnedAboutMissingEnv = false;

export function createClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Log only once per page load to avoid console spam on every render.
    if (!_warnedAboutMissingEnv) {
      _warnedAboutMissingEnv = true;
      console.error(
        "[Supabase] Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env or .env.local"
      );
    }
    _client = createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-anon-key"
    );
    return _client;
  }

  _client = createBrowserClient(url, key);
  return _client;
}
