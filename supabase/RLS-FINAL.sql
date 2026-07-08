-- ============================================================================
-- RLS Policies for SiHaji Care — Supabase as single source of truth
-- ============================================================================
-- Run this in the Supabase SQL Editor.
--
-- Roles:
--   - Doctor (staff): SELECT, INSERT, UPDATE, DELETE on ALL clinical tables
--   - Jamaah: SELECT only on their own data (jamaah_id matches their user_id)
--
-- Strategy: Use a helper function is_staff() that checks the profiles table
-- for a staff role. This avoids infinite recursion (SECURITY DEFINER).
-- ============================================================================

-- ===== 1. Helper function: is_staff() =====
-- Returns true if the current user has a staff role in profiles.
-- SECURITY DEFINER so it can read profiles without triggering RLS recursion.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin','admin','kepala_klinik','pj_mutu','petugas')
  );
$$;

-- ===== 2. Helper function: current_jamaah_id() =====
-- Returns the jamaah.id for the current authenticated user (by user_id).
CREATE OR REPLACE FUNCTION public.current_jamaah_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.jamaah WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ===== 3. Enable RLS on all tables =====
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jamaah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_sign ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pasca_hajj_lab ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_hajj_vital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_hajj_lab ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_hajj_chronic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_hajj_screening ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_hajj_medication ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_hajj_immunization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_hajj_fitness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_hajj_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_hajj_ai_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemedicine_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemedicine_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemedicine_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemedicine_ai_summary ENABLE ROW LEVEL SECURITY;

-- ===== 4. Drop all existing policies (clean slate) =====
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ===== 5. profiles: users can read their own profile; staff can read all =====
CREATE POLICY profiles_sel ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_ins ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY profiles_upd ON public.profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ===== 6. jamaah: staff can CRUD all; jamaah can SELECT own =====
CREATE POLICY jamaah_sel ON public.jamaah FOR SELECT TO authenticated USING (public.is_staff() OR user_id = auth.uid());
CREATE POLICY jamaah_ins ON public.jamaah FOR INSERT TO authenticated WITH CHECK (public.is_staff() OR user_id = auth.uid());
CREATE POLICY jamaah_upd ON public.jamaah FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY jamaah_del ON public.jamaah FOR DELETE TO authenticated USING (public.is_staff());

-- ===== 7. Clinical tables (screening, vital_sign, pasca_hajj_lab, pre_hajj_*): =====
-- Staff: full CRUD. Jamaah: SELECT only where jamaah_id = current_jamaah_id().
-- This macro applies the same 4 policies to each table.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'screening','vital_sign','pasca_hajj_lab',
    'pre_hajj_vital','pre_hajj_lab','pre_hajj_chronic','pre_hajj_screening',
    'pre_hajj_medication','pre_hajj_immunization','pre_hajj_fitness',
    'pre_hajj_education','pre_hajj_ai_assessment'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_staff() OR jamaah_id = public.current_jamaah_id())', tbl || '_sel', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_staff())', tbl || '_ins', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())', tbl || '_upd', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_staff())', tbl || '_del', tbl);
  END LOOP;
END $$;

-- ===== 8. chat_room: staff can CRUD; jamaah can SELECT/INSERT own =====
CREATE POLICY chat_room_sel ON public.chat_room FOR SELECT TO authenticated USING (public.is_staff() OR jamaah_id = public.current_jamaah_id());
CREATE POLICY chat_room_ins ON public.chat_room FOR INSERT TO authenticated WITH CHECK (public.is_staff() OR jamaah_id = public.current_jamaah_id());
CREATE POLICY chat_room_upd ON public.chat_room FOR UPDATE TO authenticated USING (public.is_staff() OR jamaah_id = public.current_jamaah_id()) WITH CHECK (true);
CREATE POLICY chat_room_del ON public.chat_room FOR DELETE TO authenticated USING (public.is_staff());

-- ===== 9. chat_message: staff can CRUD; jamaah can SELECT own room + INSERT =====
-- chat_message uses room_id (not jamaah_id), so we check via a subquery to chat_room.
CREATE POLICY chat_message_sel ON public.chat_message FOR SELECT TO authenticated
  USING (
    public.is_staff() OR
    room_id IN (SELECT id FROM public.chat_room WHERE jamaah_id = public.current_jamaah_id())
  );
CREATE POLICY chat_message_ins ON public.chat_message FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff() OR
    room_id IN (SELECT id FROM public.chat_room WHERE jamaah_id = public.current_jamaah_id())
  );
CREATE POLICY chat_message_upd ON public.chat_message FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
CREATE POLICY chat_message_del ON public.chat_message FOR DELETE TO authenticated
  USING (public.is_staff());

-- ===== 10. telemedicine_request: same pattern as chat_message =====
CREATE POLICY telemedicine_request_sel ON public.telemedicine_request FOR SELECT TO authenticated
  USING (
    public.is_staff() OR
    room_id IN (SELECT id FROM public.chat_room WHERE jamaah_id = public.current_jamaah_id())
  );
CREATE POLICY telemedicine_request_ins ON public.telemedicine_request FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());
CREATE POLICY telemedicine_request_upd ON public.telemedicine_request FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY telemedicine_request_del ON public.telemedicine_request FOR DELETE TO authenticated
  USING (public.is_staff());

-- ===== 11. telemedicine_template, schedule, ai_summary: staff only =====
CREATE POLICY telemedicine_template_sel ON public.telemedicine_template FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY telemedicine_template_ins ON public.telemedicine_template FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY telemedicine_template_upd ON public.telemedicine_template FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY telemedicine_template_del ON public.telemedicine_template FOR DELETE TO authenticated USING (public.is_staff());

CREATE POLICY telemedicine_schedule_sel ON public.telemedicine_schedule FOR SELECT TO authenticated USING (public.is_staff() OR jamaah_id = public.current_jamaah_id());
CREATE POLICY telemedicine_schedule_ins ON public.telemedicine_schedule FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY telemedicine_schedule_upd ON public.telemedicine_schedule FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY telemedicine_schedule_del ON public.telemedicine_schedule FOR DELETE TO authenticated USING (public.is_staff());

CREATE POLICY telemedicine_ai_summary_sel ON public.telemedicine_ai_summary FOR SELECT TO authenticated
  USING (
    public.is_staff() OR
    room_id IN (SELECT id FROM public.chat_room WHERE jamaah_id = public.current_jamaah_id())
  );
CREATE POLICY telemedicine_ai_summary_ins ON public.telemedicine_ai_summary FOR INSERT TO authenticated WITH CHECK (public.is_staff());
CREATE POLICY telemedicine_ai_summary_upd ON public.telemedicine_ai_summary FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY telemedicine_ai_summary_del ON public.telemedicine_ai_summary FOR DELETE TO authenticated USING (public.is_staff());

-- ===== 12. Enable Realtime for all tables =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.jamaah;
ALTER PUBLICATION supabase_realtime ADD TABLE public.screening;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vital_sign;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pasca_hajj_lab;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_hajj_vital;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_hajj_lab;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_hajj_chronic;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_hajj_screening;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_hajj_medication;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_hajj_immunization;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_hajj_fitness;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_hajj_education;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_hajj_ai_assessment;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemedicine_request;
