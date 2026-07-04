-- ============================================================================
-- FIX: Change jamaah_id columns from uuid to text in ALL child tables
-- The app passes Prisma cuid IDs (e.g. "cmqoxifta0006ns7uff7njm0y") which
-- are NOT valid UUIDs, causing: "invalid input syntax for type uuid"
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

-- First drop any FK constraints that reference jamaah(id)
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

-- Now alter each column from uuid to text
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

-- Drop and recreate RLS policies (since column type changed)
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
    EXECUTE format('DROP POLICY IF EXISTS %1$s_sel ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_ins ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_upd ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_del ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_sel ON public.%1$s FOR SELECT USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY %1$s_ins ON public.%1$s FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY %1$s_upd ON public.%1$s FOR UPDATE USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY %1$s_del ON public.%1$s FOR DELETE USING (auth.uid() IS NOT NULL)', t);
  END LOOP;
END;
$$;

-- Also fix chat_room (jamaah_id already text from previous fix, but ensure policies are correct)
DROP POLICY IF EXISTS cr_sel ON public.chat_room;
DROP POLICY IF EXISTS cr_ins ON public.chat_room;
DROP POLICY IF EXISTS cr_upd ON public.chat_room;
DROP POLICY IF EXISTS cr_del ON public.chat_room;
CREATE POLICY cr_sel ON public.chat_room FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY cr_ins ON public.chat_room FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY cr_upd ON public.chat_room FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY cr_del ON public.chat_room FOR DELETE USING (auth.uid() IS NOT NULL);
