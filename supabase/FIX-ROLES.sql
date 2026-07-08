-- ============================================================================
-- FIX: Simplify roles to only Doctor + Jamaah
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

-- 1. Update is_staff() to only check for "doctor" role
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'doctor'
     FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 2. Migrate existing profiles: any non-jamaah role → doctor
UPDATE public.profiles SET role = 'doctor' WHERE role NOT IN ('doctor', 'jamaah');

-- 3. Add CHECK constraint to only allow doctor | jamaah
-- (Drop old constraint first if exists)
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('doctor', 'jamaah'));

-- 4. Drop and recreate RLS policies
-- (Drop ALL policies first)
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

-- Profiles: user sees own only
CREATE POLICY profiles_sel ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_ins ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_upd ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Jamaah: doctor sees all, jamaah sees own record
CREATE POLICY jamaah_sel ON public.jamaah FOR SELECT USING (
  public.is_staff() OR user_id = auth.uid()
);
CREATE POLICY jamaah_ins ON public.jamaah FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY jamaah_upd ON public.jamaah FOR UPDATE USING (public.is_staff());
CREATE POLICY jamaah_del ON public.jamaah FOR DELETE USING (public.is_staff());

-- Child tables: doctor = full CRUD, jamaah = SELECT only (own data)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'screening','vital_sign','pasca_hajj_lab',
    'pre_hajj_vital','pre_hajj_lab','pre_hajj_chronic','pre_hajj_screening',
    'pre_hajj_medication','pre_hajj_immunization','pre_hajj_fitness',
    'pre_hajj_education','pre_hajj_ai_assessment',
    'telemedicine_request','telemedicine_schedule','telemedicine_ai_summary'
  ]
  LOOP
    -- SELECT: doctor sees all, jamaah sees own
    EXECUTE format('CREATE POLICY %1$s_sel ON public.%1$s FOR SELECT USING (public.is_staff() OR jamaah_id IN (SELECT id::text FROM public.jamaah WHERE user_id = auth.uid()))', t);
    -- INSERT/UPDATE/DELETE: doctor only
    EXECUTE format('CREATE POLICY %1$s_ins ON public.%1$s FOR INSERT WITH CHECK (public.is_staff())', t);
    EXECUTE format('CREATE POLICY %1$s_upd ON public.%1$s FOR UPDATE USING (public.is_staff())', t);
    EXECUTE format('CREATE POLICY %1$s_del ON public.%1$s FOR DELETE USING (public.is_staff())', t);
  END LOOP;
END;
$$;

-- Chat tables: both doctor and jamaah can use
CREATE POLICY cr_sel ON public.chat_room FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY cr_ins ON public.chat_room FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY cr_upd ON public.chat_room FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY cr_del ON public.chat_room FOR DELETE USING (public.is_staff());

CREATE POLICY cm_sel ON public.chat_message FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY cm_ins ON public.chat_message FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY cm_upd ON public.chat_message FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY cm_del ON public.chat_message FOR DELETE USING (public.is_staff());

CREATE POLICY tt_sel ON public.telemedicine_template FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY tt_ins ON public.telemedicine_template FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY tt_upd ON public.telemedicine_template FOR UPDATE USING (public.is_staff());
CREATE POLICY tt_del ON public.telemedicine_template FOR DELETE USING (public.is_staff());

-- 5. Verify
SELECT role, count(*) FROM public.profiles GROUP BY role;
