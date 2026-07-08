-- ============================================================================
-- DEFINITIVE FIX: jamaah_id uuid → text + RLS policies
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- This is safe to re-run (uses IF EXISTS / exception handling).
-- ============================================================================

-- ========== STEP 1: Drop ALL policies on affected tables ==========
-- Must drop policies BEFORE altering column types (PostgreSQL requirement)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
      'screening','vital_sign','pasca_hajj_lab',
      'pre_hajj_vital','pre_hajj_lab','pre_hajj_chronic','pre_hajj_screening',
      'pre_hajj_medication','pre_hajj_immunization','pre_hajj_fitness',
      'pre_hajj_education','pre_hajj_ai_assessment',
      'telemedicine_request','telemedicine_schedule','telemedicine_ai_summary',
      'chat_room','chat_message','telemedicine_template',
      'jamaah','profiles','audit_log'
    )
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END;
$$;

-- ========== STEP 2: Drop FK constraints referencing jamaah(id) ==========
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'f'
    AND confrelid = 'public.jamaah'::regclass
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END;
$$;

-- ========== STEP 3: Alter jamaah_id columns from uuid → text ==========
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
    'chat_room'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN jamaah_id TYPE text', t);
      RAISE NOTICE '✅ Altered % to text', t;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⏭ Skipping %: %', t, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- ========== STEP 4: Recreate is_staff() (SECURITY DEFINER) ==========
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('super_admin','admin','kepala_klinik','pj_mutu','petugas')
     FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ========== STEP 5: Recreate RLS policies ==========
-- Profiles (user sees own only)
CREATE POLICY profiles_sel ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_ins ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_upd ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Jamaah (doctor sees assigned, jamaah sees own)
CREATE POLICY jamaah_sel ON public.jamaah FOR SELECT USING (
  user_id = auth.uid() OR doctor_id = auth.uid() OR public.is_staff()
);
CREATE POLICY jamaah_ins ON public.jamaah FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY jamaah_upd ON public.jamaah FOR UPDATE USING (
  user_id = auth.uid() OR doctor_id = auth.uid() OR public.is_staff()
);
CREATE POLICY jamaah_del ON public.jamaah FOR DELETE USING (public.is_staff());

-- All child tables: any authenticated user can CRUD
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

-- ========== STEP 6: Verify ==========
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'jamaah_id'
ORDER BY table_name;
-- Expected: all rows should show data_type = 'text'
