-- ============================================================================
-- Fix profiles table: drop old role CHECK constraint, add 'dokter' role
-- Ensure email column exists on profiles.
-- Ensure jamaah table does NOT need an email column (email lives in profiles).
-- ============================================================================

-- 1. Drop the old CHECK constraint on profiles.role
-- The old constraint only allowed: super_admin, admin, kepala_klinik, pj_mutu, petugas, viewer, jamaah
-- We need to allow 'dokter' as well.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check1;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check2;

-- 2. Add new CHECK constraint allowing only 'dokter' and 'jamaah'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('dokter', 'jamaah'));

-- 3. Migrate old roles to new roles
UPDATE public.profiles SET role = 'dokter' WHERE role IN ('super_admin', 'admin', 'kepala_klinik', 'pj_mutu', 'petugas', 'viewer', 'operator');
UPDATE public.profiles SET role = 'jamaah' WHERE role NOT IN ('dokter', 'jamaah');

-- 4. Ensure profiles has email column (it should from the original schema)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 5. Ensure profiles has full_name column (it should from the original schema)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

-- 6. Update the handle_new_user trigger to use new roles
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

-- 7. Add email column to jamaah table (for linking with auth at signup time)
-- This is the cleanest approach: dokter stores email when creating jamaah,
-- and when jamaah registers, we match by email and set user_id.
ALTER TABLE public.jamaah ADD COLUMN IF NOT EXISTS email text;

-- 8. Create index on jamaah.email for fast lookup during signup
CREATE INDEX IF NOT EXISTS idx_jamaah_email ON public.jamaah(email);

-- 9. Ensure jamaah.user_id index exists (for fast lookup by auth.uid())
CREATE INDEX IF NOT EXISTS idx_jamaah_user_id ON public.jamaah(user_id);

-- 9. Update the RLS helper functions for the new two-role system
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

-- 10. Verify
SELECT 'profiles columns:' as info;
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name IN ('id', 'email', 'role', 'full_name')
  ORDER BY column_name;

SELECT 'jamaah columns (should NOT have email):' as info;
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'jamaah' AND column_name = 'email';
