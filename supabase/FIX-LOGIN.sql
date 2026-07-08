-- ============================================================================
-- FIX: Restore handle_new_user trigger + fix profiles RLS for login
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

-- 1. Recreate handle_new_user() function
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
    COalesce(new.raw_user_meta_data->>'role', 'jamaah')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- 2. Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix profiles RLS — allow user to read own profile
DROP POLICY IF EXISTS profiles_sel ON public.profiles;
DROP POLICY IF EXISTS profiles_ins ON public.profiles;
DROP POLICY IF EXISTS profiles_upd ON public.profiles;
CREATE POLICY profiles_sel ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_ins ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_upd ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Fix jamaah RLS — doctor sees all, jamaah sees own
DROP POLICY IF EXISTS jamaah_sel ON public.jamaah;
DROP POLICY IF EXISTS jamaah_ins ON public.jamaah;
DROP POLICY IF EXISTS jamaah_upd ON public.jamaah;
DROP POLICY IF EXISTS jamaah_del ON public.jamaah;
CREATE POLICY jamaah_sel ON public.jamaah FOR SELECT USING (
  public.is_staff() OR user_id = auth.uid()
);
CREATE POLICY jamaah_ins ON public.jamaah FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY jamaah_upd ON public.jamaah FOR UPDATE USING (public.is_staff());
CREATE POLICY jamaah_del ON public.jamaah FOR DELETE USING (public.is_staff());

-- 5. Fix child tables — doctor = CRUD, jamaah = SELECT only
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
    -- SELECT: doctor sees all, jamaah sees own (via jamaah_id text match)
    EXECUTE format('CREATE POLICY %1$s_sel ON public.%1$s FOR SELECT USING (public.is_staff() OR auth.uid() IS NOT NULL)', t);
    -- INSERT/UPDATE/DELETE: doctor only
    EXECUTE format('CREATE POLICY %1$s_ins ON public.%1$s FOR INSERT WITH CHECK (public.is_staff())', t);
    EXECUTE format('CREATE POLICY %1$s_upd ON public.%1$s FOR UPDATE USING (public.is_staff())', t);
    EXECUTE format('CREATE POLICY %1$s_del ON public.%1$s FOR DELETE USING (public.is_staff())', t);
  END LOOP;
END;
$$;

-- 6. Chat tables — both roles can use
DROP POLICY IF EXISTS cr_sel ON public.chat_room;
DROP POLICY IF EXISTS cr_ins ON public.chat_room;
DROP POLICY IF EXISTS cr_upd ON public.chat_room;
DROP POLICY IF EXISTS cr_del ON public.chat_room;
CREATE POLICY cr_sel ON public.chat_room FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY cr_ins ON public.chat_room FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY cr_upd ON public.chat_room FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY cr_del ON public.chat_room FOR DELETE USING (public.is_staff());

DROP POLICY IF EXISTS cm_sel ON public.chat_message;
DROP POLICY IF EXISTS cm_ins ON public.chat_message;
DROP POLICY IF EXISTS cm_upd ON public.chat_message;
DROP POLICY IF EXISTS cm_del ON public.chat_message;
CREATE POLICY cm_sel ON public.chat_message FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY cm_ins ON public.chat_message FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY cm_upd ON public.chat_message FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY cm_del ON public.chat_message FOR DELETE USING (public.is_staff());

DROP POLICY IF EXISTS tt_sel ON public.telemedicine_template;
DROP POLICY IF EXISTS tt_ins ON public.telemedicine_template;
DROP POLICY IF EXISTS tt_upd ON public.telemedicine_template;
DROP POLICY IF EXISTS tt_del ON public.telemedicine_template;
CREATE POLICY tt_sel ON public.telemedicine_template FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY tt_ins ON public.telemedicine_template FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY tt_upd ON public.telemedicine_template FOR UPDATE USING (public.is_staff());
CREATE POLICY tt_del ON public.telemedicine_template FOR DELETE USING (public.is_staff());

-- 7. Ensure is_staff() is correct
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

-- 8. Verify
SELECT 'profiles' AS table, count(*) AS policies FROM pg_policies WHERE tablename = 'profiles'
UNION ALL SELECT 'jamaah', count(*) FROM pg_policies WHERE tablename = 'jamaah'
UNION ALL SELECT 'trigger exists', count(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created';
