import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Refreshes the Supabase auth session on every server-side request.
// Ensures the auth cookies stay valid without the user re-authenticating.
// (Next.js 16 "proxy" convention — formerly "middleware".)
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env vars aren't configured, skip session refresh gracefully
  // (prevents crash on every request during initial setup).
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[proxy] Supabase env vars not set — skipping session refresh");
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh the user's session. Do not run code between createServerClient
  // and getUser — a simple mistake can make it very hard to debug sessions.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files; run on all other paths.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|robots\\.txt|logo\\.svg)$).*)",
  ],
};
