# SiHaji Care — Supabase Setup Guide

This guide explains how to connect the SiHaji Care application to your Supabase project for **authentication** and **database**.

## 1. Credentials (already configured)

Your Supabase credentials are stored in `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://rkbmbyhofygwaucgqcpb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_LcTXzU8qf3o3B6vpNZCDmA_bJroz-ir
SUPABASE_SERVICE_ROLE_KEY=sb_publishable_LcTXzU8qf3o3B6vpNZCDmA_bJroz-ir
```

> ⚠️ **Important:** The `SUPABASE_SERVICE_ROLE_KEY` should be your **service role** key (secret), not the publishable/anon key. The publishable key is safe for the browser; the service role key bypasses RLS and must never be exposed to the browser. Replace it in the Supabase dashboard → **Settings → API → `service_role` secret**. For now both point to the publishable key you provided.

## 2. Create the Database Schema

Run the SQL migration in your Supabase project:

1. Go to **Supabase Dashboard → SQL Editor → New query**
2. Open the file [`supabase/schema.sql`](./schema.sql) in this project
3. Copy the **entire** contents and paste into the SQL Editor
4. Click **Run**

This creates:
- **`profiles`** table (linked to `auth.users`) with a `role` column (`doctor` | `admin` | `jamaah`)
- **18 clinical/telemedicine tables** mirroring the Prisma schema (snake_case): `jamaah`, `screening`, `vital_sign`, `pre_hajj_*` (8 tables), `chat_room`, `chat_message`, `telemedicine_*` (4 tables)
- **Indexes** on all foreign keys and common query patterns
- **Foreign keys** with `ON DELETE CASCADE`
- **`updated_at` triggers** for `jamaah`, `pre_hajj_chronic`, `pre_hajj_education`
- **Row Level Security (RLS) policies** on every table:
  - `doctor` & `admin` → full CRUD on all data
  - `jamaah` (patient) → read/insert on their own linked records only
- **Auto-profile trigger**: when a user signs up, a `profiles` row is created automatically with the role from sign-up metadata
- **Seed data**: 4 default telemedicine message templates

The script is **idempotent** — safe to re-run.

### Verify the schema ran

```sql
select tablename from pg_tables where schemaname = 'public' order by tablename;
-- Expect: 19 tables (profiles + 18 clinical)

select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by tablename;
```

## 3. Configure Authentication

In **Supabase Dashboard → Authentication → Providers**:

- **Email provider**: Enabled (default)
- **Email confirmations**: For development, you can **disable** "Confirm email" so signup logs in immediately. For production, keep it enabled.
- **Redirect URLs**: Add `http://localhost:3000` (and your production URL) under **Authentication → URL Configuration → Redirect URLs**.

## 4. How Authentication Works in the App

- **`src/lib/supabase/client.ts`** — browser Supabase client (uses `@supabase/ssr` `createBrowserClient`)
- **`src/lib/supabase/server.ts`** — server Supabase client (reads/writes auth cookies) + `createAdminClient()` (service role, bypasses RLS)
- **`src/lib/supabase/types.ts`** — TypeScript `Database` type for all tables (use with `supabase.from('jamaah').select()`)
- **`src/components/haji/supabase-auth-provider.tsx`** — React context that tracks the session, loads the user's role from `profiles`, and exposes `signIn`, `signUp`, `signOut`
- **`src/components/haji/login-screen.tsx`** — login/signup screen with role picker (Dokter / Jamaah)
- **`src/components/haji/app-shell.tsx`** — gates the app: shows `LoginScreen` if unauthenticated, the app + user menu (with logout) if authenticated
- **`src/proxy.ts`** — Next.js 16 proxy (formerly middleware) that refreshes the auth session cookie on every request

### Usage in components

```tsx
"use client";
import { useSupabaseAuth } from "@/components/haji/supabase-auth-provider";

function MyComponent() {
  const { user, role, signOut } = useSupabaseAuth();
  // user.email, user.id, role === 'doctor' | 'jamaah' | ...
}
```

### Usage in API routes / server components

```ts
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabase.from("jamaah").select("*");
  return Response.json({ jamaah: data });
}
```

## 5. Creating Your First Doctor Account

1. Open the app → you'll see the login screen
2. Click **Daftar** (Sign up)
3. Enter: Nama Lengkap, Email, Password, pick **Dokter**
4. Click **Daftar**
5. If email confirmation is disabled → you're logged in immediately
6. If email confirmation is enabled → check your email, click the link, then **Masuk** (Sign in)

After login, the `profiles` row is created automatically with `role = 'doctor'`, giving you full CRUD access via RLS.

## 6. Note on the Existing Data Layer

The application currently uses **Prisma + SQLite** for its data layer (all `/api/*` routes read/write via Prisma). The Supabase integration adds:

- ✅ **Authentication** (email/password, session management, role-based access)
- ✅ **Database schema** ready in Supabase (tables, RLS, indexes)
- ✅ **Type-safe Supabase clients** (browser + server) ready to use

To **fully migrate the data layer from Prisma/SQLite to Supabase**, the existing API routes (`/api/jamaah/*`, `/api/telemedicine/*`, etc.) would need to be rewritten to query Supabase instead of Prisma. This is a significant but straightforward migration — each route swaps `db.jamaah.findMany()` → `supabase.from('jamaah').select()`. The SQL schema above is designed to match the Prisma schema exactly (snake_case mapping) to make this migration 1:1.

The Supabase auth gate is **live now** — users must authenticate before accessing the app, and their role (`doctor`/`jamaah`) is enforced by RLS policies on the Supabase tables once the data layer is migrated.

## 7. Files Added/Modified

| File | Purpose |
|------|---------|
| `.env` | Added `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `supabase/schema.sql` | **Complete SQL migration** — 19 tables, indexes, RLS policies, triggers, seed |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client + admin client |
| `src/lib/supabase/types.ts` | TypeScript `Database` type for all tables |
| `src/proxy.ts` | Next.js 16 proxy — refreshes auth session cookie |
| `src/components/haji/supabase-auth-provider.tsx` | Auth context (session, role, signIn/signUp/signOut) |
| `src/components/haji/login-screen.tsx` | Login/signup screen |
| `src/components/haji/app-shell.tsx` | Auth gate + user menu with logout |
| `src/app/page.tsx` | Wraps app in `SupabaseAuthProvider` |
| `package.json` | Added `@supabase/supabase-js`, `@supabase/ssr` |
