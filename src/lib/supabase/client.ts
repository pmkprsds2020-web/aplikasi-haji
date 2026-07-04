import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client (use in Client Components)
// Reads NEXT_PUBLIC_* env vars (exposed to the browser).
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      "[Supabase] Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env"
    );
    // Return a dummy client that won't crash the app — operations will fail gracefully
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-anon-key"
    );
  }

  return createBrowserClient(url, key);
}
