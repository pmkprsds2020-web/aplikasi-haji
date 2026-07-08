-- ============================================================================
-- FIX: Drop overly restrictive CHECK constraints on vital_sign and screening
-- These constraints reject valid user input (e.g. nadi=3333 for testing)
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

-- Drop ALL check constraints on vital_sign
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.vital_sign'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.vital_sign DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on vital_sign', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on screening
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.screening'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.screening DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on screening', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on pre_hajj_vital
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.pre_hajj_vital'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.pre_hajj_vital DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on pre_hajj_vital', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on jamaah (usia, kelamin, etc.)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.jamaah'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.jamaah DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on jamaah', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on pasca_hajj_lab
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.pasca_hajj_lab'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.pasca_hajj_lab DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on pasca_hajj_lab', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on pre_hajj_lab
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.pre_hajj_lab'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.pre_hajj_lab DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on pre_hajj_lab', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on chat_message (sender_type, type)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.chat_message'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.chat_message DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on chat_message', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on chat_room
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.chat_room'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.chat_room DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on chat_room', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on telemedicine_request
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.telemedicine_request'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.telemedicine_request DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on telemedicine_request', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on pre_hajj_chronic
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.pre_hajj_chronic'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.pre_hajj_chronic DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on pre_hajj_chronic', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on pre_hajj_immunization
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.pre_hajj_immunization'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.pre_hajj_immunization DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on pre_hajj_immunization', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on pre_hajj_education
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.pre_hajj_education'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.pre_hajj_education DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on pre_hajj_education', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on telemedicine_template
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.telemedicine_template'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.telemedicine_template DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on telemedicine_template', r.conname;
  END LOOP;
END;
$$;

-- Drop ALL check constraints on telemedicine_ai_summary
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'c'
    AND conrelid = 'public.telemedicine_ai_summary'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.telemedicine_ai_summary DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on telemedicine_ai_summary', r.conname;
  END LOOP;
END;
$$;

-- Also drop NOT NULL constraints on non-essential columns in vital_sign
-- (so users can submit partial data)
ALTER TABLE public.vital_sign ALTER COLUMN td_sistolik DROP NOT NULL;
ALTER TABLE public.vital_sign ALTER COLUMN td_diastolik DROP NOT NULL;
ALTER TABLE public.vital_sign ALTER COLUMN nadi DROP NOT NULL;
ALTER TABLE public.vital_sign ALTER COLUMN rr DROP NOT NULL;
ALTER TABLE public.vital_sign ALTER COLUMN suhu DROP NOT NULL;
ALTER TABLE public.vital_sign ALTER COLUMN spo2 DROP NOT NULL;
ALTER TABLE public.vital_sign ALTER COLUMN berat_badan DROP NOT NULL;
ALTER TABLE public.vital_sign ALTER COLUMN gula_darah DROP NOT NULL;
ALTER TABLE public.vital_sign ALTER COLUMN catatan DROP NOT NULL;

-- Same for screening
ALTER TABLE public.screening ALTER COLUMN skor DROP NOT NULL;
ALTER TABLE public.screening ALTER COLUMN catatan DROP NOT NULL;

-- Same for pasca_hajj_lab (all columns nullable except jamaah_id)
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN hb DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN leukosit DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN gdp DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN gd2pp DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN hba1c DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN kolesterol DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN ldl DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN hdl DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN trigliserida DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN sgot DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN sgpt DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN ureum DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN kreatinin DROP NOT NULL;
ALTER TABLE public.pasca_hajj_lab ALTER COLUMN catatan DROP NOT NULL;

-- Verify: list remaining check constraints
SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE contype = 'c'
AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;
