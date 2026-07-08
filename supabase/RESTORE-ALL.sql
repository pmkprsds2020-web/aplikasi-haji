-- ============================================================================
-- DEFINITIVE RESTORE: Trigger + RLS + 10 Jamaah + All Clinical Data
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- This is the ONLY SQL file you need to run.
-- ============================================================================

-- 1. Recreate handle_new_user() trigger (fixes login)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'petugas'))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Recreate is_staff()
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role IN ('super_admin','admin','kepala_klinik','pj_mutu','petugas','doctor')
     FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- 3. Drop ALL policies on ALL tables
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
    BEGIN EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END; $$;

-- 4. Recreate simple RLS: authenticated = CRUD
CREATE POLICY profiles_sel ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_ins ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_upd ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY jamaah_sel ON public.jamaah FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY jamaah_ins ON public.jamaah FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY jamaah_upd ON public.jamaah FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY jamaah_del ON public.jamaah FOR DELETE USING (auth.uid() IS NOT NULL);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'screening','vital_sign','pasca_hajj_lab','pre_hajj_vital','pre_hajj_lab',
    'pre_hajj_chronic','pre_hajj_screening','pre_hajj_medication','pre_hajj_immunization',
    'pre_hajj_fitness','pre_hajj_education','pre_hajj_ai_assessment',
    'telemedicine_request','telemedicine_schedule','telemedicine_ai_summary',
    'chat_room','chat_message','telemedicine_template','audit_log'
  ] LOOP
    BEGIN EXECUTE format('CREATE POLICY %1$s_sel ON public.%1$s FOR SELECT USING (auth.uid() IS NOT NULL)', t); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN EXECUTE format('CREATE POLICY %1$s_ins ON public.%1$s FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)', t); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN EXECUTE format('CREATE POLICY %1$s_upd ON public.%1$s FOR UPDATE USING (auth.uid() IS NOT NULL)', t); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN EXECUTE format('CREATE POLICY %1$s_del ON public.%1$s FOR DELETE USING (auth.uid() IS NOT NULL)', t); EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END; $$;

-- 5. Insert 10 Jamaah
INSERT INTO public.jamaah (nama, nik, kloter, porsi, usia, kelamin, alamat, hp, kontak_keluarga, tanggal_tiba, bandara, kabupaten_kota, puskesmas, dokter_keluarga, paspor, embarkasi, gol_darah, riwayat_penyakit, riwayat_operasi, alergi, obat_rutin, status_istithaah, tanggal_berangkat, tanggal_pulang, risk_level, risk_summary, is_active) VALUES
('H. Ahmad Suryana','3201010101800001','JKT-08','H-2024-001234',68,'L','Jl. Melati No. 12, Bekasi','081234560001','Andi (anak) 081299880001','2026-06-19T08:03:46.694Z','Soekarno-Hatta','Kota Bekasi','Puskesmas Bekasi Selatan','dr. Rina Kartika','P2024000','Jakarta (Bekasi)','O+','Hipertensi','Appendectomy 2010','-','Amlodipine 10mg, Metformin 1000mg','Bersyarat','2026-05-05T08:03:46.694Z','2026-06-19T08:03:46.694Z','MERAH','Risiko Tinggi: Demam + sesak napas',true),
('Hj. Siti Aminah','3202020202700002','JKT-08','H-2024-001235',65,'P','Jl. Mawar No. 8, Bekasi','081234560002','Dewi (anak) 081299880002','2026-06-19T08:03:46.702Z','Soekarno-Hatta','Kota Bekasi','Puskesmas Bekasi Selatan','dr. Rina Kartika','P2024001','Jakarta (Bekasi)','A+','Tidak ada','-','Penisilin','Amlodipine 5mg','Laik','2026-05-05T08:03:46.702Z','2026-06-19T08:03:46.702Z','KUNING','Perlu Pemantauan: Hipertensi',true),
('H. Bambang Wijaya','3203030303720003','JKT-12','H-2024-002345',72,'L','Jl. Anggrek No. 45, Jakarta Timur','081234560003','Rizki (anak) 081299880003','2026-06-19T08:03:46.706Z','Soekarno-Hatta','Kota Jakarta Timur','Puskesmas Jatinegara','dr. Hartono, Sp.JP','P2024002','Jakarta (Soekarno-Hatta)','B+','Hipertensi + DM','CABG 2018','-','Bisoprolol, Furosemide, Isosorbide','Bersyarat','2026-05-05T08:03:46.706Z','2026-06-19T08:03:46.706Z','MERAH','Risiko Tinggi: Nyeri dada',true),
('Hj. Fatimah Zahra','3204040404700004','JKT-12','H-2024-002346',70,'P','Jl. Kenanga No. 22, Jakarta Timur','081234560004','Hendra (anak) 081299880004','2026-06-19T08:03:46.709Z','Soekarno-Hatta','Kota Jakarta Timur','Puskesmas Jatinegara','dr. Hartono, Sp.JP','P2024003','Jakarta (Soekarno-Hatta)','AB+','Tidak ada','-','-','-','Laik','2026-05-05T08:03:46.709Z','2026-06-19T08:03:46.709Z','HIJAU','Tidak ada keluhan, kondisi stabil',true),
('H. Slamet Riyadi','3205050505750005','SUB-03','H-2024-003456',75,'L','Jl. Cempaka No. 3, Bandung','081234560005','Bagus (anak) 081299880005','2026-06-19T08:03:46.712Z','Husein Sastranegara','Kota Bandung','Puskesmas Coblong','dr. Tya Pratiwi','P2024004','Bandung (Husein)','B+','PPOK','-','-','Salbutamol inhaler','Bersyarat','2026-05-05T08:03:46.712Z','2026-06-19T08:03:46.712Z','KUNING','Perlu Pemantauan: PPOK',true),
('Hj. Khadijah Nur','3206060606630006','SUB-03','H-2024-003457',63,'P','Jl. Dahlia No. 17, Bandung','081234560006','Fajar (anak) 081299880006','2026-06-19T08:03:46.715Z','Husein Sastranegara','Kota Bandung','Puskesmas Coblong','dr. Tya Pratiwi','P2024005','Bandung (Husein)','O+','Tidak ada','-','Makanan laut','-','Laik','2026-05-05T08:03:46.715Z','2026-06-19T08:03:46.715Z','HIJAU','Tidak ada keluhan, kondisi stabil',true),
('H. Yusuf Mansur','3207070707690007','JKT-15','H-2024-004567',69,'L','Jl. Flamboyan No. 9, Depok','081234560007','Lina (anak) 081299880007','2026-06-21T08:03:46.718Z','Soekarno-Hatta','Kota Depok','Puskesmas Beji','dr. Surya Atmaja','P2024006','Jakarta (Soekarno-Hatta)','O+','Hipertensi, DM, PJK','-','Sulfonamida','Amlodipine 10mg, Metformin 1000mg, Aspilet 80mg','Tidak Laik','2026-05-07T08:03:46.718Z','2026-06-21T08:03:46.718Z','MERAH','Risiko Tinggi: SpO₂ 92%, PHQ-9 18',true),
('Hj. Maryam Salma','3208080808670008','JKT-15','H-2024-004568',67,'P','Jl. Bougenville No. 14, Depok','081234560008','Galih (anak) 081299880008','2026-06-21T08:03:46.722Z','Soekarno-Hatta','Kota Depok','Puskesmas Beji','dr. Surya Atmaja','P2024007','Jakarta (Soekarno-Hatta)','B+','PPOK','-','-','Tiotropium inhaler','Bersyarat','2026-05-07T08:03:46.722Z','2026-06-21T08:03:46.722Z','KUNING','Perlu Pemantauan: PPOK sesak',true),
('H. Abdul Rahman','3209090909740009','SUB-05','H-2024-005678',74,'L','Jl. Teratai No. 6, Bandung','081234560009','Yusuf (anak) 081299880009','2026-06-19T08:03:46.725Z','Husein Sastranegara','Kota Bandung','Puskesmas Sukajadi','dr. Maya Sari','P2024008','Bandung (Husein)','A+','Hipertensi, Osteoarthritis','Prostatektomi 2015','-','Amlodipine 5mg, Paracetamol prn','Bersyarat','2026-05-05T08:03:46.725Z','2026-06-19T08:03:46.725Z','MERAH','Risiko Tinggi: Frail, Ketergantungan ADL',true),
('Hj. Aisyah Putri','3201010102660010','SUB-05','H-2024-005679',66,'P','Jl. Sakura No. 11, Bandung','081234560010','Rama (anak) 081299880010','2026-06-19T08:03:46.729Z','Husein Sastranegara','Kota Bandung','Puskesmas Sukajadi','dr. Maya Sari','P2024009','Bandung (Husein)','AB+','Tidak ada','-','-','-','Laik','2026-05-05T08:03:46.729Z','2026-06-19T08:03:46.729Z','HIJAU','Tidak ada keluhan, kondisi stabil',true)
ON CONFLICT (nik) DO NOTHING;

-- 6. Insert Vital Signs
INSERT INTO public.vital_sign (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, gula_darah, hari_ke, catatan, created_at) SELECT id, 150, 90, 108, 26, 38.4, 92, 58, 285, 1, 'Demam, sesak', '2026-06-21T08:03:46.710Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.vital_sign (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, gula_darah, hari_ke, catatan, created_at) SELECT id, 142, 88, 96, 22, 37.2, 95, 57, 210, 7, 'Membaik', '2026-06-22T08:03:46.711Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.vital_sign (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, gula_darah, hari_ke, catatan, created_at) SELECT id, 148, 92, 84, 18, 36.8, 97, 62, 110, 1, '', '2026-06-21T08:03:46.711Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.vital_sign (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, gula_darah, hari_ke, catatan, created_at) SELECT id, 140, 88, 80, 18, 36.7, 98, 62, 105, 7, '', '2026-06-22T08:03:46.712Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.vital_sign (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, gula_darah, hari_ke, catatan, created_at) SELECT id, 155, 95, 98, 24, 36.9, 93, 70, null, 1, 'Sesak, nyeri dada', '2026-06-21T08:03:46.712Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.vital_sign (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, gula_darah, hari_ke, catatan, created_at) SELECT id, 122, 78, 76, 16, 36.6, 98, 55, 95, 1, '', '2026-06-21T08:03:46.713Z' FROM public.jamaah WHERE nik = '3204040404700004';
INSERT INTO public.vital_sign (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, gula_darah, hari_ke, catatan, created_at) SELECT id, 120, 78, 74, 16, 36.5, 98, 56, 90, 1, '', '2026-06-09T08:03:46.746Z' FROM public.jamaah WHERE nik = '3201010102660010';
INSERT INTO public.vital_sign (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, gula_darah, hari_ke, catatan, created_at) SELECT id, 118, 76, 72, 16, 36.4, 99, 56, 88, 14, '', '2026-06-22T08:03:46.746Z' FROM public.jamaah WHERE nik = '3201010102660010';

-- 7. Insert Screenings
INSERT INTO public.screening (jamaah_id, jenis, data, skor, catatan, hari_ke, created_at) SELECT id, 'CHRONIC', '{"dm_gulaDarah":285}', 'Tidak Terkontrol', 'Gula darah tinggi', 1, '2026-06-21T08:03:46.707Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.screening (jamaah_id, jenis, data, skor, catatan, hari_ke, created_at) SELECT id, 'FALL_RISK', '{"jatuhSetahun":true}', 'Tinggi', '', 1, '2026-06-21T08:03:46.708Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.screening (jamaah_id, jenis, data, skor, catatan, hari_ke, created_at) SELECT id, 'FAMILY_APGAR', '{"adaptation":2}', 'Fungsional', '', 1, '2026-06-21T08:03:46.709Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.screening (jamaah_id, jenis, data, skor, catatan, hari_ke, created_at) SELECT id, 'FRAILTY', '{"fatigue":1}', 'Frail', '', 1, '2026-06-21T08:03:46.708Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.screening (jamaah_id, jenis, data, skor, catatan, hari_ke, created_at) SELECT id, 'INFECTIOUS', '{"ispa_demam":true}', 'Tinggi', 'Suspek pneumonia', 1, '2026-06-21T08:03:46.706Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.screening (jamaah_id, jenis, data, skor, catatan, hari_ke, created_at) SELECT id, 'MENTAL', '{"phq9_total":18}', 'Sedang-Berat', 'Intervensi krisis', 1, '2026-06-21T08:03:46.709Z' FROM public.jamaah WHERE nik = '3201010101800001';

-- 8. Insert Pre-Hajj Vitals
INSERT INTO public.pre_hajj_vital (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, tinggi_badan, lingkar_perut, catatan, created_at) SELECT id, 150, 90, 88, 18, 36.7, 97, 60, 165, 95, null, '2026-04-20T08:03:46.694Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_vital (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, tinggi_badan, lingkar_perut, catatan, created_at) SELECT id, 140, 88, 80, 18, 36.6, 98, 62, 158, 90, null, '2026-04-20T08:03:46.702Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.pre_hajj_vital (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, tinggi_badan, lingkar_perut, catatan, created_at) SELECT id, 145, 92, 86, 20, 36.7, 96, 70, 168, 98, null, '2026-04-20T08:03:46.706Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.pre_hajj_vital (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, tinggi_badan, lingkar_perut, catatan, created_at) SELECT id, 122, 78, 76, 16, 36.5, 99, 55, 155, 80, null, '2026-04-20T08:03:46.709Z' FROM public.jamaah WHERE nik = '3204040404700004';
INSERT INTO public.pre_hajj_vital (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, tinggi_badan, lingkar_perut, catatan, created_at) SELECT id, 135, 84, 78, 18, 36.6, 97, 52, 160, 85, null, '2026-04-20T08:03:46.712Z' FROM public.jamaah WHERE nik = '3205050505750005';
INSERT INTO public.pre_hajj_vital (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, tinggi_badan, lingkar_perut, catatan, created_at) SELECT id, 118, 75, 72, 16, 36.5, 99, 58, 152, 78, null, '2026-04-20T08:03:46.715Z' FROM public.jamaah WHERE nik = '3206060606630006';
INSERT INTO public.pre_hajj_vital (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, tinggi_badan, lingkar_perut, catatan, created_at) SELECT id, 160, 100, 92, 20, 36.8, 96, 60, 162, 96, null, '2026-04-22T08:03:46.718Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_vital (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, tinggi_badan, lingkar_perut, catatan, created_at) SELECT id, 132, 84, 88, 22, 36.7, 94, 48, 150, 82, null, '2026-04-22T08:03:46.722Z' FROM public.jamaah WHERE nik = '3208080808670008';
INSERT INTO public.pre_hajj_vital (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, tinggi_badan, lingkar_perut, catatan, created_at) SELECT id, 142, 86, 82, 19, 36.6, 95, 50, 163, 88, null, '2026-04-20T08:03:46.725Z' FROM public.jamaah WHERE nik = '3209090909740009';
INSERT INTO public.pre_hajj_vital (jamaah_id, td_sistolik, td_diastolik, nadi, rr, suhu, spo2, berat_badan, tinggi_badan, lingkar_perut, catatan, created_at) SELECT id, 120, 76, 74, 16, 36.4, 98, 56, 154, 79, null, '2026-04-20T08:03:46.729Z' FROM public.jamaah WHERE nik = '3201010102660010';

-- 9. Insert Pre-Hajj Labs
INSERT INTO public.pre_hajj_lab (jamaah_id, hb, gdp, gd2pp, hba1c, kolesterol, hdl, ldl, trigliserida, asam_urat, sgot, sgpt, kreatinin, egfr, urinalisis, catatan, created_at) SELECT id, 13.5, 180, 240, 8.2, 220, 38, 150, 180, 6.5, 30, 35, 1, 85, 'Protein +1', null, '2026-04-25T08:03:46.694Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_lab (jamaah_id, hb, gdp, gd2pp, hba1c, kolesterol, hdl, ldl, trigliserida, asam_urat, sgot, sgpt, kreatinin, egfr, urinalisis, catatan, created_at) SELECT id, 12.8, 100, 130, 5.6, 200, 45, 120, 140, 5, 25, 22, 0.8, 95, 'Normal', null, '2026-04-25T08:03:46.702Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.pre_hajj_lab (jamaah_id, hb, gdp, gd2pp, hba1c, kolesterol, hdl, ldl, trigliserida, asam_urat, sgot, sgpt, kreatinin, egfr, urinalisis, catatan, created_at) SELECT id, 13, 110, 140, 5.8, 240, 35, 170, 200, 7.2, 40, 45, 1.2, 70, 'Normal', null, '2026-04-25T08:03:46.706Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.pre_hajj_lab (jamaah_id, hb, gdp, gd2pp, hba1c, kolesterol, hdl, ldl, trigliserida, asam_urat, sgot, sgpt, kreatinin, egfr, urinalisis, catatan, created_at) SELECT id, 12.5, 90, 120, 5.2, 180, 55, 100, 120, 4.5, 20, 18, 0.7, 100, 'Normal', null, '2026-04-25T08:03:46.709Z' FROM public.jamaah WHERE nik = '3204040404700004';
INSERT INTO public.pre_hajj_lab (jamaah_id, hb, gdp, gd2pp, hba1c, kolesterol, hdl, ldl, trigliserida, asam_urat, sgot, sgpt, kreatinin, egfr, urinalisis, catatan, created_at) SELECT id, 13.2, 95, 125, 5.4, 210, 42, 130, 150, 5.8, 28, 30, 0.9, 90, 'Normal', null, '2026-04-25T08:03:46.712Z' FROM public.jamaah WHERE nik = '3205050505750005';
INSERT INTO public.pre_hajj_lab (jamaah_id, hb, gdp, gd2pp, hba1c, kolesterol, hdl, ldl, trigliserida, asam_urat, sgot, sgpt, kreatinin, egfr, urinalisis, catatan, created_at) SELECT id, 12, 88, 115, 5.1, 175, 58, 95, 110, 4, 18, 16, 0.7, 98, 'Normal', null, '2026-04-25T08:03:46.715Z' FROM public.jamaah WHERE nik = '3206060606630006';
INSERT INTO public.pre_hajj_lab (jamaah_id, hb, gdp, gd2pp, hba1c, kolesterol, hdl, ldl, trigliserida, asam_urat, sgot, sgpt, kreatinin, egfr, urinalisis, catatan, created_at) SELECT id, 14, 200, 280, 9, 260, 32, 190, 220, 7.8, 45, 50, 1.3, 65, 'Protein +1, Glukosa +2', null, '2026-04-27T08:03:46.718Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_lab (jamaah_id, hb, gdp, gd2pp, hba1c, kolesterol, hdl, ldl, trigliserida, asam_urat, sgot, sgpt, kreatinin, egfr, urinalisis, catatan, created_at) SELECT id, 12.6, 100, 135, 5.7, 195, 44, 118, 145, 5.2, 26, 24, 0.85, 92, 'Normal', null, '2026-04-27T08:03:46.722Z' FROM public.jamaah WHERE nik = '3208080808670008';
INSERT INTO public.pre_hajj_lab (jamaah_id, hb, gdp, gd2pp, hba1c, kolesterol, hdl, ldl, trigliserida, asam_urat, sgot, sgpt, kreatinin, egfr, urinalisis, catatan, created_at) SELECT id, 11.8, 92, 122, 5.3, 205, 43, 125, 138, 5.5, 24, 26, 0.9, 88, 'Normal', null, '2026-04-25T08:03:46.725Z' FROM public.jamaah WHERE nik = '3209090909740009';
INSERT INTO public.pre_hajj_lab (jamaah_id, hb, gdp, gd2pp, hba1c, kolesterol, hdl, ldl, trigliserida, asam_urat, sgot, sgpt, kreatinin, egfr, urinalisis, catatan, created_at) SELECT id, 12.7, 89, 118, 5, 170, 56, 92, 105, 4.2, 19, 17, 0.7, 99, 'Normal', null, '2026-04-25T08:03:46.729Z' FROM public.jamaah WHERE nik = '3201010102660010';

-- 10. Insert Pre-Hajj Chronic
INSERT INTO public.pre_hajj_chronic (jamaah_id, hipertensi, diabetes, ppok, ckd, jantung, stroke, kanker, obat_rutin, target_terapi) SELECT id, 'Tidak Terkontrol', 'Tidak Terkontrol', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Amlodipine, Metformin', 'TD <140/90, HbA1c <7%' FROM public.jamaah WHERE nik = '3201010101800001' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_chronic (jamaah_id, hipertensi, diabetes, ppok, ckd, jantung, stroke, kanker, obat_rutin, target_terapi) SELECT id, 'Terkontrol', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Amlodipine', 'TD <140/90' FROM public.jamaah WHERE nik = '3202020202700002' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_chronic (jamaah_id, hipertensi, diabetes, ppok, ckd, jantung, stroke, kanker, obat_rutin, target_terapi) SELECT id, 'Tidak Terkontrol', 'Tidak', 'Tidak', 'Tidak', 'Tidak Terkontrol', 'Tidak', 'Tidak', 'Bisoprolol, Furosemide', 'Kontrol kardiolog 1 bl' FROM public.jamaah WHERE nik = '3203030303720003' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_chronic (jamaah_id, hipertensi, diabetes, ppok, ckd, jantung, stroke, kanker, obat_rutin, target_terapi) SELECT id, 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', '-', '-' FROM public.jamaah WHERE nik = '3204040404700004' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_chronic (jamaah_id, hipertensi, diabetes, ppok, ckd, jantung, stroke, kanker, obat_rutin, target_terapi) SELECT id, 'Terkontrol', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Salbutamol', 'Bebas sesak' FROM public.jamaah WHERE nik = '3205050505750005' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_chronic (jamaah_id, hipertensi, diabetes, ppok, ckd, jantung, stroke, kanker, obat_rutin, target_terapi) SELECT id, 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', '-', '-' FROM public.jamaah WHERE nik = '3206060606630006' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_chronic (jamaah_id, hipertensi, diabetes, ppok, ckd, jantung, stroke, kanker, obat_rutin, target_terapi) SELECT id, 'Tidak Terkontrol', 'Tidak Terkontrol', 'Tidak', 'Tidak', 'Terkontrol', 'Tidak', 'Tidak', 'Amlodipine, Metformin, Aspilet', 'TD <130/80, HbA1c <7%' FROM public.jamaah WHERE nik = '3207070707690007' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_chronic (jamaah_id, hipertensi, diabetes, ppok, ckd, jantung, stroke, kanker, obat_rutin, target_terapi) SELECT id, 'Terkontrol', 'Tidak', 'Tidak Terkontrol', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tiotropium', 'Bebas sesak' FROM public.jamaah WHERE nik = '3208080808670008' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_chronic (jamaah_id, hipertensi, diabetes, ppok, ckd, jantung, stroke, kanker, obat_rutin, target_terapi) SELECT id, 'Terkontrol', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Amlodipine', 'TD <140/90' FROM public.jamaah WHERE nik = '3209090909740009' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_chronic (jamaah_id, hipertensi, diabetes, ppok, ckd, jantung, stroke, kanker, obat_rutin, target_terapi) SELECT id, 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', 'Tidak', '-', '-' FROM public.jamaah WHERE nik = '3201010102660010' ON CONFLICT (jamaah_id) DO NOTHING;

-- 11. Insert Pre-Hajj Screenings (FRAIL, MNA, MORSE, BARTHEL, PHQ9 for each jamaah)
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'BARTHEL', '{"total":75}', 'Bantuan Ringan', null, '2026-05-02T08:03:46.694Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'FRAIL', '{"fatigue":1}', 'Frail', null, '2026-04-30T08:03:46.694Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'MNA', '{"nafsuMakan":2}', 'Risiko Malnutrisi', null, '2026-04-30T08:03:46.694Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'MORSE', '{"total":35}', 'Sedang', null, '2026-05-02T08:03:46.694Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'PHQ9', '{"total":3}', 'Minimal', null, '2026-05-02T08:03:46.694Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'BARTHEL', '{"total":90}', 'Mandiri', null, '2026-05-02T08:03:46.702Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'FRAIL', '{"fatigue":1}', 'Pre-frail', null, '2026-04-30T08:03:46.702Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'MNA', '{"nafsuMakan":2}', 'Normal', null, '2026-04-30T08:03:46.702Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'MORSE', '{"total":25}', 'Sedang', null, '2026-05-02T08:03:46.702Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'PHQ9', '{"total":3}', 'Minimal', null, '2026-05-02T08:03:46.702Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'BARTHEL', '{"total":70}', 'Ketergantungan Sedang', null, '2026-05-02T08:03:46.706Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'FRAIL', '{"fatigue":1}', 'Pre-frail', null, '2026-04-30T08:03:46.706Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'MORSE', '{"total":45}', 'Tinggi', null, '2026-05-02T08:03:46.706Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'PHQ9', '{"total":11}', 'Sedang', null, '2026-05-02T08:03:46.706Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'BARTHEL', '{"total":100}', 'Mandiri', null, '2026-05-02T08:03:46.709Z' FROM public.jamaah WHERE nik = '3204040404700004';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'FRAIL', '{"fatigue":0}', 'Robust', null, '2026-04-30T08:03:46.709Z' FROM public.jamaah WHERE nik = '3204040404700004';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'MNA', '{"nafsuMakan":2}', 'Normal', null, '2026-05-02T08:03:46.709Z' FROM public.jamaah WHERE nik = '3204040404700004';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'BARTHEL', '{"total":55}', 'Ketergantungan Berat', null, '2026-05-04T08:03:46.718Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'FRAIL', '{"fatigue":1}', 'Frail', null, '2026-05-02T08:03:46.718Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'MORSE', '{"total":50}', 'Tinggi', null, '2026-05-04T08:03:46.718Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'PHQ9', '{"total":18}', 'Sedang-Berat', null, '2026-05-04T08:03:46.718Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'BARTHEL', '{"total":100}', 'Mandiri', null, '2026-05-02T08:03:46.729Z' FROM public.jamaah WHERE nik = '3201010102660010';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'FRAIL', '{"fatigue":0}', 'Robust', null, '2026-04-30T08:03:46.729Z' FROM public.jamaah WHERE nik = '3201010102660010';
INSERT INTO public.pre_hajj_screening (jamaah_id, jenis, data, skor, catatan, created_at) SELECT id, 'MNA', '{"nafsuMakan":2}', 'Normal', null, '2026-05-02T08:03:46.729Z' FROM public.jamaah WHERE nik = '3201010102660010';

-- 12. Insert Pre-Hajj Medications
INSERT INTO public.pre_hajj_medication (jamaah_id, nama_obat, dosis, frekuensi, indikasi, catatan, created_at) SELECT id, 'Amlodipine', '10mg', '1x/hari', 'Hipertensi', null, '2026-07-03T03:55:54.358Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_medication (jamaah_id, nama_obat, dosis, frekuensi, indikasi, catatan, created_at) SELECT id, 'Metformin', '1000mg', '2x/hari', 'DM tipe 2', null, '2026-07-03T03:55:54.359Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_medication (jamaah_id, nama_obat, dosis, frekuensi, indikasi, catatan, created_at) SELECT id, 'Amlodipine', '5mg', '1x/hari', 'Hipertensi', null, '2026-07-03T03:55:54.363Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.pre_hajj_medication (jamaah_id, nama_obat, dosis, frekuensi, indikasi, catatan, created_at) SELECT id, 'Bisoprolol', '5mg', '1x/hari', 'Jantung', null, '2026-07-03T03:55:54.367Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.pre_hajj_medication (jamaah_id, nama_obat, dosis, frekuensi, indikasi, catatan, created_at) SELECT id, 'Furosemide', '40mg', '1x/hari', 'Edema', null, '2026-07-03T03:55:54.368Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.pre_hajj_medication (jamaah_id, nama_obat, dosis, frekuensi, indikasi, catatan, created_at) SELECT id, 'Salbutamol Inhaler', '100mcg', 'prn', 'PPOK', null, '2026-07-03T03:55:54.372Z' FROM public.jamaah WHERE nik = '3205050505750005';
INSERT INTO public.pre_hajj_medication (jamaah_id, nama_obat, dosis, frekuensi, indikasi, catatan, created_at) SELECT id, 'Amlodipine', '10mg', '1x/hari', 'Hipertensi', null, '2026-07-03T03:55:54.377Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_medication (jamaah_id, nama_obat, dosis, frekuensi, indikasi, catatan, created_at) SELECT id, 'Metformin', '1000mg', '2x/hari', 'DM', null, '2026-07-03T03:55:54.378Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_medication (jamaah_id, nama_obat, dosis, frekuensi, indikasi, catatan, created_at) SELECT id, 'Aspilet', '80mg', '1x/hari', 'PJK', null, '2026-07-03T03:55:54.379Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_medication (jamaah_id, nama_obat, dosis, frekuensi, indikasi, catatan, created_at) SELECT id, 'Tiotropium Inhaler', '18mcg', '1x/hari', 'PPOK', null, '2026-07-03T03:55:54.383Z' FROM public.jamaah WHERE nik = '3208080808670008';
INSERT INTO public.pre_hajj_medication (jamaah_id, nama_obat, dosis, frekuensi, indikasi, catatan, created_at) SELECT id, 'Amlodipine', '5mg', '1x/hari', 'Hipertensi', null, '2026-07-03T03:55:54.388Z' FROM public.jamaah WHERE nik = '3209090909740009';

-- 13. Insert Pre-Hajj Immunizations
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'MENINGITIS', '2026-04-30T08:03:46.694Z', 'MN-2024-1000', 'Quadrivalent ACWY', '2026-07-03T03:55:54.352Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'INFLUENZA', '2026-04-30T08:03:46.694Z', 'FL-2024-2000', null, '2026-07-03T03:55:54.353Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'COVID', '2026-04-30T08:03:46.694Z', 'CV-2024-3000', 'Booster ke-3', '2026-07-03T03:55:54.354Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'PNEUMOKOKUS', '2026-04-30T08:03:46.694Z', 'PN-2024-4000', null, '2026-07-03T03:55:54.355Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'MENINGITIS', '2026-04-30T08:03:46.702Z', 'MN-2024-1001', 'Quadrivalent ACWY', '2026-07-03T03:55:54.357Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'MENINGITIS', '2026-04-30T08:03:46.706Z', 'MN-2024-1002', 'Quadrivalent ACWY', '2026-07-03T03:55:54.361Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'INFLUENZA', '2026-04-30T08:03:46.706Z', 'FL-2024-2002', null, '2026-07-03T03:55:54.362Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'MENINGITIS', '2026-04-30T08:03:46.709Z', 'MN-2024-1003', 'Quadrivalent ACWY', '2026-07-03T03:55:54.365Z' FROM public.jamaah WHERE nik = '3204040404700004';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'MENINGITIS', '2026-04-30T08:03:46.712Z', 'MN-2024-1004', 'Quadrivalent ACWY', '2026-07-03T03:55:54.370Z' FROM public.jamaah WHERE nik = '3205050505750005';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'MENINGITIS', '2026-04-30T08:03:46.715Z', 'MN-2024-1005', 'Quadrivalent ACWY', '2026-07-03T03:55:54.374Z' FROM public.jamaah WHERE nik = '3206060606630006';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'MENINGITIS', '2026-05-02T08:03:46.718Z', 'MN-2024-1006', 'Quadrivalent ACWY', '2026-07-03T03:55:54.379Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'COVID', '2026-05-02T08:03:46.718Z', 'CV-2024-3006', 'Booster ke-3', '2026-07-03T03:55:54.380Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'MENINGITIS', '2026-05-02T08:03:46.722Z', 'MN-2024-1007', 'Quadrivalent ACWY', '2026-07-03T03:55:54.384Z' FROM public.jamaah WHERE nik = '3208080808670008';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'MENINGITIS', '2026-04-30T08:03:46.725Z', 'MN-2024-1008', 'Quadrivalent ACWY', '2026-07-03T03:55:54.389Z' FROM public.jamaah WHERE nik = '3209090909740009';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'PNEUMOKOKUS', '2026-04-30T08:03:46.725Z', 'PN-2024-4008', null, '2026-07-03T03:55:54.390Z' FROM public.jamaah WHERE nik = '3209090909740009';
INSERT INTO public.pre_hajj_immunization (jamaah_id, jenis, tanggal_vaksin, nomor_batch, catatan, created_at) SELECT id, 'MENINGITIS', '2026-04-30T08:03:46.729Z', 'MN-2024-1009', 'Quadrivalent ACWY', '2026-07-03T03:55:54.394Z' FROM public.jamaah WHERE nik = '3201010102660010';

-- 14. Insert Pre-Hajj Fitness (all 10)
INSERT INTO public.pre_hajj_fitness (jamaah_id, target_langkah, jalan_kaki, aerobik, kekuatan, pernafasan, catatan, created_at) SELECT id, 8000, 30, 20, 15, 10, null, '2026-05-10T08:03:46.694Z' FROM public.jamaah WHERE nik = '3201010101800001';
INSERT INTO public.pre_hajj_fitness (jamaah_id, target_langkah, jalan_kaki, aerobik, kekuatan, pernafasan, catatan, created_at) SELECT id, 8000, 30, 20, 15, 10, null, '2026-05-10T08:03:46.702Z' FROM public.jamaah WHERE nik = '3202020202700002';
INSERT INTO public.pre_hajj_fitness (jamaah_id, target_langkah, jalan_kaki, aerobik, kekuatan, pernafasan, catatan, created_at) SELECT id, 8000, 30, 20, 15, 10, null, '2026-05-10T08:03:46.706Z' FROM public.jamaah WHERE nik = '3203030303720003';
INSERT INTO public.pre_hajj_fitness (jamaah_id, target_langkah, jalan_kaki, aerobik, kekuatan, pernafasan, catatan, created_at) SELECT id, 8000, 30, 20, 15, 10, null, '2026-05-10T08:03:46.709Z' FROM public.jamaah WHERE nik = '3204040404700004';
INSERT INTO public.pre_hajj_fitness (jamaah_id, target_langkah, jalan_kaki, aerobik, kekuatan, pernafasan, catatan, created_at) SELECT id, 8000, 30, 20, 15, 10, null, '2026-05-10T08:03:46.712Z' FROM public.jamaah WHERE nik = '3205050505750005';
INSERT INTO public.pre_hajj_fitness (jamaah_id, target_langkah, jalan_kaki, aerobik, kekuatan, pernafasan, catatan, created_at) SELECT id, 8000, 30, 20, 15, 10, null, '2026-05-10T08:03:46.715Z' FROM public.jamaah WHERE nik = '3206060606630006';
INSERT INTO public.pre_hajj_fitness (jamaah_id, target_langkah, jalan_kaki, aerobik, kekuatan, pernafasan, catatan, created_at) SELECT id, 8000, 30, 20, 15, 10, null, '2026-05-12T08:03:46.718Z' FROM public.jamaah WHERE nik = '3207070707690007';
INSERT INTO public.pre_hajj_fitness (jamaah_id, target_langkah, jalan_kaki, aerobik, kekuatan, pernafasan, catatan, created_at) SELECT id, 8000, 30, 20, 15, 10, null, '2026-05-12T08:03:46.722Z' FROM public.jamaah WHERE nik = '3208080808670008';
INSERT INTO public.pre_hajj_fitness (jamaah_id, target_langkah, jalan_kaki, aerobik, kekuatan, pernafasan, catatan, created_at) SELECT id, 8000, 30, 20, 15, 10, null, '2026-05-10T08:03:46.725Z' FROM public.jamaah WHERE nik = '3209090909740009';
INSERT INTO public.pre_hajj_fitness (jamaah_id, target_langkah, jalan_kaki, aerobik, kekuatan, pernafasan, catatan, created_at) SELECT id, 8000, 30, 20, 15, 10, null, '2026-05-10T08:03:46.729Z' FROM public.jamaah WHERE nik = '3201010102660010';

-- 15. Insert Pre-Hajj Education (all 10)
INSERT INTO public.pre_hajj_education (jamaah_id, diet, aktivitas, obat, hidrasi, istirahat, manajemen_kronis, persiapan_perjalanan, catatan) SELECT id, true, true, true, true, true, true, true, null FROM public.jamaah WHERE nik = '3201010101800001' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_education (jamaah_id, diet, aktivitas, obat, hidrasi, istirahat, manajemen_kronis, persiapan_perjalanan, catatan) SELECT id, true, false, true, true, false, false, true, null FROM public.jamaah WHERE nik = '3202020202700002' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_education (jamaah_id, diet, aktivitas, obat, hidrasi, istirahat, manajemen_kronis, persiapan_perjalanan, catatan) SELECT id, true, true, true, true, true, true, true, null FROM public.jamaah WHERE nik = '3203030303720003' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_education (jamaah_id, diet, aktivitas, obat, hidrasi, istirahat, manajemen_kronis, persiapan_perjalanan, catatan) SELECT id, true, true, true, true, true, true, true, null FROM public.jamaah WHERE nik = '3204040404700004' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_education (jamaah_id, diet, aktivitas, obat, hidrasi, istirahat, manajemen_kronis, persiapan_perjalanan, catatan) SELECT id, true, false, true, true, false, false, true, null FROM public.jamaah WHERE nik = '3205050505750005' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_education (jamaah_id, diet, aktivitas, obat, hidrasi, istirahat, manajemen_kronis, persiapan_perjalanan, catatan) SELECT id, true, true, true, true, true, true, true, null FROM public.jamaah WHERE nik = '3206060606630006' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_education (jamaah_id, diet, aktivitas, obat, hidrasi, istirahat, manajemen_kronis, persiapan_perjalanan, catatan) SELECT id, true, false, true, true, false, false, true, null FROM public.jamaah WHERE nik = '3207070707690007' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_education (jamaah_id, diet, aktivitas, obat, hidrasi, istirahat, manajemen_kronis, persiapan_perjalanan, catatan) SELECT id, true, false, true, true, false, false, true, null FROM public.jamaah WHERE nik = '3208080808670008' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_education (jamaah_id, diet, aktivitas, obat, hidrasi, istirahat, manajemen_kronis, persiapan_perjalanan, catatan) SELECT id, true, false, true, true, false, false, true, null FROM public.jamaah WHERE nik = '3209090909740009' ON CONFLICT (jamaah_id) DO NOTHING;
INSERT INTO public.pre_hajj_education (jamaah_id, diet, aktivitas, obat, hidrasi, istirahat, manajemen_kronis, persiapan_perjalanan, catatan) SELECT id, true, true, true, true, true, true, true, null FROM public.jamaah WHERE nik = '3201010102660010' ON CONFLICT (jamaah_id) DO NOTHING;

-- 16. Seed templates
INSERT INTO public.telemedicine_template (title, category, content) VALUES
('Pengingat TTV Pagi','TEXT','Selamat pagi. Silakan isi tekanan darah, suhu, dan saturasi hari ini.'),
('Pengingat Skrining PHQ-9','SKRINING','Mohon isi skrining PHQ-9 untuk evaluasi kesehatan mental Anda.'),
('Pengingat Minum Obat','TEXT','Jangan lupa minum obat pagi ini sesuai resep dokter.'),
('Cek Keluhan Harian','TEXT','Bagaimana kondisi Bapak/Ibu hari ini? Ada keluhan demam, batuk, atau sesak?')
ON CONFLICT DO NOTHING;

-- 17. Verify
SELECT 'jamaah' AS t, count(*) AS n FROM public.jamaah
UNION ALL SELECT 'vital_sign', count(*) FROM public.vital_sign
UNION ALL SELECT 'screening', count(*) FROM public.screening
UNION ALL SELECT 'pre_hajj_vital', count(*) FROM public.pre_hajj_vital
UNION ALL SELECT 'pre_hajj_lab', count(*) FROM public.pre_hajj_lab
UNION ALL SELECT 'pre_hajj_chronic', count(*) FROM public.pre_hajj_chronic
UNION ALL SELECT 'pre_hajj_screening', count(*) FROM public.pre_hajj_screening
UNION ALL SELECT 'pre_hajj_medication', count(*) FROM public.pre_hajj_medication
UNION ALL SELECT 'pre_hajj_immunization', count(*) FROM public.pre_hajj_immunization
UNION ALL SELECT 'pre_hajj_fitness', count(*) FROM public.pre_hajj_fitness
UNION ALL SELECT 'pre_hajj_education', count(*) FROM public.pre_hajj_education;
