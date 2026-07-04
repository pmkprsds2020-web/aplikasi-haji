-- ============================================================================
-- FIX: Drop ALL policies first, then alter jamaah_id from uuid to text
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

-- Step 1: Drop ALL existing policies on ALL child tables (must happen BEFORE ALTER)
DO $$
DECLARE
  t text;
  p text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'screening','vital_sign','pasca_hajj_lab',
    'pre_hajj_vital','pre_hajj_lab','pre_hajj_chronic','pre_hajj_screening',
    'pre_hajj_medication','pre_hajj_immunization','pre_hajj_fitness',
    'pre_hajj_education','pre_hajj_ai_assessment',
    'telemedicine_request','telemedicine_schedule','telemedicine_ai_summary',
    'chat_room','chat_message'
  ]
  LOOP
    FOREACH p IN ARRAY ARRAY['sel','ins','upd','del','select','insert','update','delete',
      'phv_sel','phv_ins','phv_upd','phv_del',
      'phl_sel','phl_ins','phl_upd','phl_del',
      'phc_sel','phc_ins','phc_upd','phc_del',
      'phs_sel','phs_ins','phs_upd','phs_del',
      'phm_sel','phm_ins','phm_upd','phm_del',
      'phi_sel','phi_ins','phi_upd','phi_del',
      'phf_sel','phf_ins','phf_upd','phf_del',
      'phe_sel','phe_ins','phe_upd','phe_del',
      'pha_sel','pha_ins','pha_upd','pha_del',
      'tr_sel','tr_ins','tr_upd','tr_del',
      'ts_sel','ts_ins','ts_upd','ts_del',
      'tas_sel','tas_ins','tas_upd','tas_del',
      'cr_sel','cr_ins','cr_upd','cr_del',
      'cm_sel','cm_ins','cm_upd','cm_del',
      'tt_sel','tt_ins','tt_upd','tt_del',
      'jamaah_sel','jamaah_ins','jamaah_upd','jamaah_del',
      'jamaah_select','jamaah_insert','jamaah_update','jamaah_delete',
      'profiles_sel','profiles_ins','profiles_upd','profiles_del',
      'profiles_select_own_or_staff','profiles_insert_own','profiles_update_own',
      'audit_log_sel','audit_log_ins','audit_log_upd','audit_log_del'
    ]
    LOOP
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %s ON public.%I', p, t);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- Step 2: Also drop any policies on jamaah and profiles
DO $$
DECLARE
  p text;
BEGIN
  FOREACH p IN ARRAY ARRAY[
    'jamaah_sel','jamaah_ins','jamaah_upd','jamaah_del',
    'jamaah_select','jamaah_insert','jamaah_update','jamaah_delete',
    'profiles_sel','profiles_ins','profiles_upd','profiles_del',
    'profiles_select_own_or_staff','profiles_insert_own','profiles_update_own',
    'audit_log_sel','audit_log_ins','audit_log_upd','audit_log_del'
  ]
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %s ON public.jamaah', p);
      EXECUTE format('DROP POLICY IF EXISTS %s ON public.profiles', p);
      EXECUTE format('DROP POLICY IF EXISTS %s ON public.audit_log', p);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END;
$$;

-- Step 3: Drop FK constraints
ALTER TABLE public.screening DROP CONSTRAINT IF EXISTS screening_jamaah_id_fkey;
ALTER TABLE public.vital_sign DROP CONSTRAINT IF EXISTS vital_sign_jamaah_id_fkey;
ALTER TABLE public.pasca_hajj_lab DROP CONSTRAINT IF EXISTS pasca_hajj_lab_jamaah_id_fkey;
ALTER TABLE public.pre_hajj_vital DROP CONSTRAINT IF EXISTS pre_hajj_vital_jamaah_id_fkey;
ALTER TABLE public.pre_hajj_lab DROP CONSTRAINT IF EXISTS pre_hajj_lab_jamaah_id_fkey;
ALTER TABLE public.pre_hajj_chronic DROP CONSTRAINT IF EXISTS pre_hajj_chronic_jamaah_id_fkey;
ALTER TABLE public.pre_hajj_screening DROP CONSTRAINT IF EXISTS pre_hajj_screening_jamaah_id_fkey;
ALTER TABLE public.pre_hajj_medication DROP CONSTRAINT IF EXISTS pre_hajj_medication_jamaah_id_fkey;
ALTER TABLE public.pre_hajj_immunization DROP CONSTRAINT IF EXISTS pre_hajj_immunization_jamaah_id_fkey;
ALTER TABLE public.pre_hajj_fitness DROP CONSTRAINT IF EXISTS pre_hajj_fitness_jamaah_id_fkey;
ALTER TABLE public.pre_hajj_education DROP CONSTRAINT IF EXISTS pre_hajj_education_jamaah_id_fkey;
ALTER TABLE public.pre_hajj_ai_assessment DROP CONSTRAINT IF EXISTS pre_hajj_ai_assessment_jamaah_id_fkey;
ALTER TABLE public.telemedicine_request DROP CONSTRAINT IF EXISTS telemedicine_request_jamaah_id_fkey;
ALTER TABLE public.telemedicine_schedule DROP CONSTRAINT IF EXISTS telemedicine_schedule_jamaah_id_fkey;
ALTER TABLE public.telemedicine_ai_summary DROP CONSTRAINT IF EXISTS telemedicine_ai_summary_jamaah_id_fkey;
ALTER TABLE public.chat_room DROP CONSTRAINT IF EXISTS chat_room_jamaah_id_fkey;

-- Step 4: NOW alter columns from uuid to text (no policies blocking)
ALTER TABLE public.screening ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.vital_sign ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.pre_hajj_vital ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.pre_hajj_lab ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.pre_hajj_chronic ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.pre_hajj_screening ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.pre_hajj_medication ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.pre_hajj_immunization ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.pre_hajj_fitness ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.pre_hajj_education ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.pre_hajj_ai_assessment ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.telemedicine_request ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.telemedicine_schedule ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.telemedicine_ai_summary ALTER COLUMN jamaah_id TYPE text;
ALTER TABLE public.chat_room ALTER COLUMN jamaah_id TYPE text;

-- Step 5: Recreate RLS policies (simple: any authenticated user)
-- Profiles
CREATE POLICY profiles_sel ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_ins ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_upd ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Jamaah
CREATE POLICY jamaah_sel ON public.jamaah FOR SELECT USING (
  user_id = auth.uid() OR doctor_id = auth.uid() OR public.is_staff()
);
CREATE POLICY jamaah_ins ON public.jamaah FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY jamaah_upd ON public.jamaah FOR UPDATE USING (
  user_id = auth.uid() OR doctor_id = auth.uid() OR public.is_staff()
);
CREATE POLICY jamaah_del ON public.jamaah FOR DELETE USING (public.is_staff());

-- All child tables
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
    'chat_room','chat_message','telemedicine_template'
  ]
  LOOP
    EXECUTE format('CREATE POLICY %1$s_sel ON public.%1$s FOR SELECT USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY %1$s_ins ON public.%1$s FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY %1$s_upd ON public.%1$s FOR UPDATE USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY %1$s_del ON public.%1$s FOR DELETE USING (auth.uid() IS NOT NULL)', t);
  END LOOP;
END;
$$;
