-- ============================================================================
-- Pemeriksaan Penunjang — table + storage bucket + RLS
-- ============================================================================
-- Run this in the Supabase SQL Editor.
-- ============================================================================

-- 1. Create medical_examination table
CREATE TABLE IF NOT EXISTS public.medical_examination (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jamaah_id       text NOT NULL,
  jenis_pemeriksaan text NOT NULL,
  nama_pemeriksaan text NOT NULL,
  tanggal         date NOT NULL,
  file_name       text NOT NULL,
  file_url        text NOT NULL,
  mime_type       text,
  file_size       bigint,
  keterangan      text,
  dokter_id       uuid,
  dokter_nama     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_med_exam_jamaah ON public.medical_examination(jamaah_id);
CREATE INDEX IF NOT EXISTS idx_med_exam_tanggal ON public.medical_examination(tanggal DESC);

-- 2. RLS
ALTER TABLE public.medical_examination ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol TEXT;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'medical_examination' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.medical_examination', pol);
  END LOOP;
END $$;

-- dokter: full CRUD
CREATE POLICY med_exam_sel ON public.medical_examination FOR SELECT TO authenticated
  USING (public.is_dokter() OR jamaah_id = public.current_jamaah_id());
CREATE POLICY med_exam_ins ON public.medical_examination FOR INSERT TO authenticated
  WITH CHECK (public.is_dokter());
CREATE POLICY med_exam_upd ON public.medical_examination FOR UPDATE TO authenticated
  USING (public.is_dokter()) WITH CHECK (public.is_dokter());
CREATE POLICY med_exam_del ON public.medical_examination FOR DELETE TO authenticated
  USING (public.is_dokter());

-- 3. Storage bucket (private — requires auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-support-files', 'medical-support-files', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS policies
DROP POLICY IF EXISTS "med_files_upload" ON storage.objects;
DROP POLICY IF EXISTS "med_files_read" ON storage.objects;
DROP POLICY IF EXISTS "med_files_delete" ON storage.objects;

CREATE POLICY "med_files_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medical-support-files');

CREATE POLICY "med_files_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'medical-support-files');

CREATE POLICY "med_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'medical-support-files');

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_examination;
