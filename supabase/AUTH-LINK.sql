-- ============================================================================
-- Add email column to jamaah + update RLS for user_id-based access
-- ============================================================================
-- Run this in the Supabase SQL Editor.
-- ============================================================================

-- 1. Add email column to jamaah table (if not exists)
ALTER TABLE public.jamaah ADD COLUMN IF NOT EXISTS email text;

-- 2. Create index on email for fast lookup during signup
CREATE INDEX IF NOT EXISTS idx_jamaah_email ON public.jamaah(email);

-- 3. Helper function: is_dokter() — checks if current user has role 'dokter'
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

-- 4. Helper function: current_jamaah_id() — returns jamaah.id for current user
CREATE OR REPLACE FUNCTION public.current_jamaah_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id::text FROM public.jamaah WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 5. Drop all existing policies on jamaah (clean slate)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'jamaah'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.jamaah', r.policyname);
  END LOOP;
END $$;

-- 6. RLS for jamaah table:
--    - dokter: full CRUD (SELECT, INSERT, UPDATE, DELETE)
--    - jamaah: SELECT only own data (user_id = auth.uid())
CREATE POLICY jamaah_sel ON public.jamaah FOR SELECT TO authenticated
  USING (public.is_dokter() OR user_id = auth.uid());

CREATE POLICY jamaah_ins ON public.jamaah FOR INSERT TO authenticated
  WITH CHECK (public.is_dokter());

CREATE POLICY jamaah_upd ON public.jamaah FOR UPDATE TO authenticated
  USING (public.is_dokter() OR user_id = auth.uid())
  WITH CHECK (public.is_dokter() OR user_id = auth.uid());

CREATE POLICY jamaah_del ON public.jamaah FOR DELETE TO authenticated
  USING (public.is_dokter());

-- 7. RLS for clinical tables (screening, vital_sign, pasca_hajj_lab, pre_hajj_*):
--    - dokter: full CRUD
--    - jamaah: SELECT only where jamaah_id = current_jamaah_id()
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'screening','vital_sign','pasca_hajj_lab',
    'pre_hajj_vital','pre_hajj_lab','pre_hajj_chronic','pre_hajj_screening',
    'pre_hajj_medication','pre_hajj_immunization','pre_hajj_fitness',
    'pre_hajj_education','pre_hajj_ai_assessment'
  ];
  pol TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Drop existing policies
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
    END LOOP;
    -- Create new policies
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_dokter() OR jamaah_id = public.current_jamaah_id())', tbl || '_sel', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_dokter())', tbl || '_ins', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_dokter()) WITH CHECK (public.is_dokter())', tbl || '_upd', tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_dokter())', tbl || '_del', tbl);
  END LOOP;
END $$;

-- 8. RLS for chat_room:
--    - dokter: full CRUD
--    - jamaah: SELECT/INSERT own room (jamaah_id = current_jamaah_id())
DO $$
DECLARE pol TEXT;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_room' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_room', pol);
  END LOOP;
END $$;

CREATE POLICY chat_room_sel ON public.chat_room FOR SELECT TO authenticated
  USING (public.is_dokter() OR jamaah_id = public.current_jamaah_id());
CREATE POLICY chat_room_ins ON public.chat_room FOR INSERT TO authenticated
  WITH CHECK (public.is_dokter() OR jamaah_id = public.current_jamaah_id());
CREATE POLICY chat_room_upd ON public.chat_room FOR UPDATE TO authenticated
  USING (public.is_dokter() OR jamaah_id = public.current_jamaah_id()) WITH CHECK (true);
CREATE POLICY chat_room_del ON public.chat_room FOR DELETE TO authenticated
  USING (public.is_dokter());

-- 9. RLS for chat_message:
--    - dokter: full CRUD
--    - jamaah: SELECT/INSERT messages in own room
DO $$
DECLARE pol TEXT;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_message' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_message', pol);
  END LOOP;
END $$;

CREATE POLICY chat_message_sel ON public.chat_message FOR SELECT TO authenticated
  USING (
    public.is_dokter() OR
    room_id IN (SELECT id FROM public.chat_room WHERE jamaah_id = public.current_jamaah_id())
  );
CREATE POLICY chat_message_ins ON public.chat_message FOR INSERT TO authenticated
  WITH CHECK (
    public.is_dokter() OR
    room_id IN (SELECT id FROM public.chat_room WHERE jamaah_id = public.current_jamaah_id())
  );
CREATE POLICY chat_message_upd ON public.chat_message FOR UPDATE TO authenticated
  USING (public.is_dokter()) WITH CHECK (public.is_dokter());
CREATE POLICY chat_message_del ON public.chat_message FOR DELETE TO authenticated
  USING (public.is_dokter());

-- 10. RLS for telemedicine_request
DO $$
DECLARE pol TEXT;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemedicine_request' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.telemedicine_request', pol);
  END LOOP;
END $$;

CREATE POLICY telemedicine_request_sel ON public.telemedicine_request FOR SELECT TO authenticated
  USING (
    public.is_dokter() OR
    room_id IN (SELECT id FROM public.chat_room WHERE jamaah_id = public.current_jamaah_id())
  );
CREATE POLICY telemedicine_request_ins ON public.telemedicine_request FOR INSERT TO authenticated
  WITH CHECK (public.is_dokter());
CREATE POLICY telemedicine_request_upd ON public.telemedicine_request FOR UPDATE TO authenticated
  USING (public.is_dokter()) WITH CHECK (public.is_dokter());
CREATE POLICY telemedicine_request_del ON public.telemedicine_request FOR DELETE TO authenticated
  USING (public.is_dokter());

-- 11. Enable Realtime for jamaah table (for auto-refresh)
ALTER PUBLICATION supabase_realtime ADD TABLE public.jamaah;
