-- ============================================================================
-- RESTORE: RLS policies — allow all authenticated users to CRUD
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

-- 1. Recreate handle_new_user() trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'petugas')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Recreate is_staff() — checks for any staff role
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('super_admin','admin','kepala_klinik','pj_mutu','petugas','doctor')
     FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 3. Drop ALL existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END;
$$;

-- 4. Profiles: user sees own, can insert own
CREATE POLICY profiles_sel ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_ins ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_upd ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5. Jamaah: any authenticated user can CRUD
CREATE POLICY jamaah_sel ON public.jamaah FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY jamaah_ins ON public.jamaah FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY jamaah_upd ON public.jamaah FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY jamaah_del ON public.jamaah FOR DELETE USING (auth.uid() IS NOT NULL);

-- 6. All child tables: any authenticated user can CRUD
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'screening','vital_sign','pasca_hajj_lab',
    'pre_hajj_vital','pre_hajj_lab','pre_hajj_chronic','pre_hajj_screening',
    'pre_hajj_medication','pre_hajj_immunization','pre_hajj_fitness',
    'pre_hajj_education','pre_hajj_ai_assessment',
    'telemedicine_request','telemedicine_schedule','telemedicine_ai_summary',
    'chat_room','chat_message','telemedicine_template','audit_log'
  ]
  LOOP
    BEGIN
      EXECUTE format('CREATE POLICY %1$s_sel ON public.%1$s FOR SELECT USING (auth.uid() IS NOT NULL)', t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE format('CREATE POLICY %1$s_ins ON public.%1$s FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)', t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE format('CREATE POLICY %1$s_upd ON public.%1$s FOR UPDATE USING (auth.uid() IS NOT NULL)', t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      EXECUTE format('CREATE POLICY %1$s_del ON public.%1$s FOR DELETE USING (auth.uid() IS NOT NULL)', t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END;
$$;
