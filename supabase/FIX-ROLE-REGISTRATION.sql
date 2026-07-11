-- ============================================================================
-- Fix profiles role: ensure trigger uses metadata role, not hardcoded default
-- ============================================================================
-- Run this in the Supabase SQL Editor.
-- ============================================================================

-- 1. Drop old CHECK constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check1;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check2;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check3;

-- 2. Migrate old roles BEFORE adding new constraint
UPDATE public.profiles SET role = 'dokter' WHERE role IN ('super_admin', 'admin', 'kepala_klinik', 'pj_mutu', 'petugas', 'viewer', 'operator');
UPDATE public.profiles SET role = 'jamaah' WHERE role NOT IN ('dokter', 'jamaah') OR role IS NULL;

-- 3. Change default from 'petugas' to 'jamaah' (safer default)
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'jamaah';

-- 4. Add new CHECK constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('dokter', 'jamaah'));

-- 5. Drop and recreate handle_new_user trigger function
-- CRITICAL: Use COALESCE with 'jamaah' as default (NOT 'dokter')
-- This ensures that if role metadata is missing, user gets 'jamaah' (read-only)
-- instead of 'dokter' (full access) — safer default.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Extract role from user metadata, default to 'jamaah' if not specified
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'jamaah');

  -- Validate: only allow 'dokter' or 'jamaah'
  IF v_role NOT IN ('dokter', 'jamaah') THEN
    v_role := 'jamaah';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  RETURN new;
END;
$$;

-- 6. Re-attach trigger (in case it was dropped)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Verify
SELECT 'profiles role distribution:' as info;
SELECT role, count(*) FROM public.profiles GROUP BY role ORDER BY role;
