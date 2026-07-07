-- ============================================================================
-- Fix profiles table: drop old role CHECK constraint, migrate roles, add new constraint
-- Fix jamaah table: add email column for auth linking
-- ============================================================================
-- Run this in the Supabase SQL Editor.
-- IMPORTANT: The order matters — migrate data BEFORE adding the new constraint.
-- ============================================================================

-- ===== Step 1: Drop ALL existing CHECK constraints on profiles.role =====
-- Drop the old constraint first so we can migrate data freely.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check1;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check2;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check3;

-- ===== Step 2: Migrate old roles to new two-role system (BEFORE adding constraint) =====
-- Map all old staff roles to 'dokter'
UPDATE public.profiles SET role = 'dokter' WHERE role IN ('super_admin', 'admin', 'kepala_klinik', 'pj_mutu', 'petugas', 'viewer', 'operator');
-- Map any remaining non-standard roles to 'jamaah'
UPDATE public.profiles SET role = 'jamaah' WHERE role NOT IN ('dokter', 'jamaah') OR role IS NULL;
-- Set default for any NULL roles
UPDATE public.profiles SET role = 'jamaah' WHERE role IS NULL;

-- ===== Step 3: Now add the new CHECK constraint (data is clean) =====
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('dokter', 'jamaah'));

-- ===== Step 4: Ensure profiles has email and full_name columns =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

-- ===== Step 5: Add email column to jamaah table (for auth linking) =====
ALTER TABLE public.jamaah ADD COLUMN IF NOT EXISTS email text;
CREATE INDEX IF NOT EXISTS idx_jamaah_email ON public.jamaah(email);

-- ===== Step 6: Ensure jamaah.user_id index exists =====
CREATE INDEX IF NOT EXISTS idx_jamaah_user_id ON public.jamaah(user_id);

-- ===== Step 7: Update handle_new_user trigger =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'dokter')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- ===== Step 8: Update RLS helper functions =====
CREATE OR REPLACE FUNCTION public.is_dokter()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'dokter'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_jamaah_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id::text FROM public.jamaah WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ===== Step 9: Verify =====
SELECT 'profiles role distribution:' as info;
SELECT role, count(*) FROM public.profiles GROUP BY role;

SELECT 'jamaah email column:' as info;
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'jamaah' AND column_name = 'email';
