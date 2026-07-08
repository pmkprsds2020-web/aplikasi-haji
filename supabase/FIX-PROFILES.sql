-- ============================================================================
-- FIX: Profiles table — drop CHECK constraint + fix RLS for INSERT
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

-- 1. Drop the CHECK constraint on profiles.role (it rejects 'doctor')
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE contype = 'c' AND conrelid = 'public.profiles'::regclass LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped %', r.conname;
  END LOOP;
END;
$$;

-- 2. Add new CHECK constraint that allows ALL roles (no restriction)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IS NOT NULL);

-- 3. Drop and recreate profiles RLS policies
DROP POLICY IF EXISTS profiles_sel ON public.profiles;
DROP POLICY IF EXISTS profiles_ins ON public.profiles;
DROP POLICY IF EXISTS profiles_upd ON public.profiles;
DROP POLICY IF EXISTS profiles_del ON public.profiles;

-- SELECT: user can read own profile
CREATE POLICY profiles_sel ON public.profiles FOR SELECT USING (auth.uid() = id);

-- INSERT: user can insert their own profile (auth.uid() = id)
CREATE POLICY profiles_ins ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- UPDATE: user can update their own profile
CREATE POLICY profiles_upd ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Recreate handle_new_user() trigger (in case it was dropped)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'petugas'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verify
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;
