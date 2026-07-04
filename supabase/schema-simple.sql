-- ============================================================================
-- SiHaji Care — Supabase Schema (Simplified, Production-Ready)
-- Run in: Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

-- 0. PROFILES (linked to auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'petugas' check (role in ('super_admin','admin','kepala_klinik','pj_mutu','petugas','viewer','jamaah')),
  full_name   text,
  email       text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email),
          coalesce(new.raw_user_meta_data->>'role', 'petugas'))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 1. JAMAAH (patients — linked to doctor via doctor_id, to auth user via user_id)
create table if not exists public.jamaah (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  doctor_id         uuid references auth.users(id) on delete set null,
  nama              text not null,
  nik               text not null unique,
  kloter            text not null,
  porsi             text not null,
  usia              integer not null,
  kelamin           text not null check (kelamin in ('L','P')),
  alamat            text not null default '',
  hp                text not null default '',
  kontak_keluarga   text not null default '',
  tanggal_tiba      timestamptz not null,
  bandara           text not null default '',
  kabupaten_kota    text not null default '',
  puskesmas         text not null default '',
  dokter_keluarga   text not null default '',
  paspor            text, embarkasi text, gol_darah text,
  riwayat_penyakit  text, riwayat_operasi text, alergi text, obat_rutin text,
  status_istithaah  text default 'Belum Dinilai',
  tanggal_berangkat timestamptz, tanggal_pulang timestamptz,
  risk_level        text not null default 'HIJAU',
  risk_summary      text not null default '',
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_jamaah_user_id on public.jamaah(user_id);
create index if not exists idx_jamaah_doctor_id on public.jamaah(doctor_id);

-- 2. SCREENING (pasca haji screenings)
create table if not exists public.screening (
  id          uuid primary key default gen_random_uuid(),
  jamaah_id   text not null,
  jenis       text not null,
  data        text not null default '{}',
  skor        text,
  catatan     text,
  hari_ke     integer not null default 1,
  created_at  timestamptz not null default now()
);
create index if not exists idx_screening_jamaah on public.screening(jamaah_id);

-- 3. VITAL_SIGN (pasca haji vitals)
create table if not exists public.vital_sign (
  id            uuid primary key default gen_random_uuid(),
  jamaah_id     text not null,
  td_sistolik   integer, td_diastolik integer, nadi integer, rr integer,
  suhu          double precision, spo2 double precision,
  berat_badan   double precision, gula_darah double precision,
  hari_ke       integer not null default 1,
  catatan       text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_vital_sign_jamaah on public.vital_sign(jamaah_id);

-- 4. PASCA_HAJJ_LAB
create table if not exists public.pasca_hajj_lab (
  id           uuid primary key default gen_random_uuid(),
  jamaah_id    text not null,
  hb double precision, leukosit double precision,
  gdp double precision, gd2pp double precision, hba1c double precision,
  kolesterol double precision, ldl double precision, hdl double precision,
  trigliserida double precision, sgot double precision, sgpt double precision,
  ureum double precision, kreatinin double precision,
  catatan text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_pasca_lab_jamaah on public.pasca_hajj_lab(jamaah_id);

-- 5. PRE_HAJJ tables (vitals, labs, chronic, screenings, meds, immunizations, fitness, education, ai)
create table if not exists public.pre_hajj_vital (
  id uuid primary key default gen_random_uuid(), jamaah_id text not null,
  td_sistolik integer, td_diastolik integer, nadi integer, rr integer,
  suhu double precision, spo2 double precision, berat_badan double precision,
  tinggi_badan double precision, lingkar_perut double precision, catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_phv_jamaah on public.pre_hajj_vital(jamaah_id);

create table if not exists public.pre_hajj_lab (
  id uuid primary key default gen_random_uuid(), jamaah_id text not null,
  hb double precision, gdp double precision, gd2pp double precision, hba1c double precision,
  kolesterol double precision, hdl double precision, ldl double precision, trigliserida double precision,
  asam_urat double precision, sgot double precision, sgpt double precision,
  kreatinin double precision, egfr double precision, urinalisis text, catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_phl_jamaah on public.pre_hajj_lab(jamaah_id);

create table if not exists public.pre_hajj_chronic (
  id uuid primary key default gen_random_uuid(), jamaah_id text not null unique,
  hipertensi text default 'Tidak', diabetes text default 'Tidak', ppok text default 'Tidak',
  ckd text default 'Tidak', jantung text default 'Tidak', stroke text default 'Tidak',
  kanker text default 'Tidak', obat_rutin text, target_terapi text,
  updated_at timestamptz not null default now()
);

create table if not exists public.pre_hajj_screening (
  id uuid primary key default gen_random_uuid(), jamaah_id text not null,
  jenis text not null, data text default '{}', skor text, catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_phs_jamaah on public.pre_hajj_screening(jamaah_id);

create table if not exists public.pre_hajj_medication (
  id uuid primary key default gen_random_uuid(), jamaah_id text not null,
  nama_obat text not null, dosis text, frekuensi text, indikasi text, catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_phm_jamaah on public.pre_hajj_medication(jamaah_id);

create table if not exists public.pre_hajj_immunization (
  id uuid primary key default gen_random_uuid(), jamaah_id text not null,
  jenis text not null, tanggal_vaksin timestamptz, nomor_batch text, catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_phi_jamaah on public.pre_hajj_immunization(jamaah_id);

create table if not exists public.pre_hajj_fitness (
  id uuid primary key default gen_random_uuid(), jamaah_id text not null,
  target_langkah integer, jalan_kaki integer, aerobik integer, kekuatan integer, pernafasan integer,
  catatan text, created_at timestamptz not null default now()
);
create index if not exists idx_phf_jamaah on public.pre_hajj_fitness(jamaah_id);

create table if not exists public.pre_hajj_education (
  id uuid primary key default gen_random_uuid(), jamaah_id text not null unique,
  diet boolean default false, aktivitas boolean default false, obat boolean default false,
  hidrasi boolean default false, istirahat boolean default false,
  manajemen_kronis boolean default false, persiapan_perjalanan boolean default false,
  catatan text, updated_at timestamptz not null default now()
);

create table if not exists public.pre_hajj_ai_assessment (
  id uuid primary key default gen_random_uuid(), jamaah_id text not null,
  ringkasan text not null, faktor_risiko text default '[]',
  kesiapan_berangkat text not null, rekomendasi text default '[]',
  soap text, resume_medis text, surat_rujukan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pha_jamaah on public.pre_hajj_ai_assessment(jamaah_id);

-- 6. TELEMEDICINE tables
create table if not exists public.chat_room (
  id uuid primary key default gen_random_uuid(),
  jamaah_id text not null unique,
  doctor_id uuid references auth.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  unread_by_doctor integer not null default 0,
  unread_by_jamaah integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_message (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_room(id) on delete cascade,
  sender_type text not null, sender_name text,
  type text not null, content text not null,
  attachment_url text, attachment_name text, request_id text,
  read_by_doctor boolean default false, read_by_jamaah boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_cm_room on public.chat_message(room_id, created_at);

create table if not exists public.telemedicine_request (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_room(id) on delete cascade,
  jamaah_id text not null, category text not null, sub_type text, title text not null,
  fields text default '[]', status text default 'PENDING',
  scheduled_for timestamptz, submitted_at timestamptz, response text, skor text, hari_ke integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_tr_jamaah on public.telemedicine_request(jamaah_id);

create table if not exists public.telemedicine_template (
  id uuid primary key default gen_random_uuid(),
  title text not null, category text not null, content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.telemedicine_schedule (
  id uuid primary key default gen_random_uuid(), jamaah_id text not null,
  category text not null, sub_type text, title text not null,
  hari_ke integer, time_of_day text, active boolean default true, last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.telemedicine_ai_summary (
  id uuid primary key default gen_random_uuid(), jamaah_id text not null,
  room_id uuid not null references public.chat_room(id) on delete cascade,
  ringkasan text not null, soap text, assessment text, plan text,
  prioritas text, rekomendasi text, alerts text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- RLS POLICIES — auth.uid() based
-- ============================================================================
-- Doctor sees: jamaah where doctor_id = auth.uid() (or any if staff)
-- Jamaah sees: only their own data where user_id = auth.uid()
-- Chat: any authenticated user can read/write their rooms

-- PROFILES — user sees own profile only (no self-referencing subquery)
alter table public.profiles enable row level security;
drop policy if exists profiles_sel on public.profiles;
create policy profiles_sel on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_ins on public.profiles;
create policy profiles_ins on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_upd on public.profiles;
create policy profiles_upd on public.profiles for update using (auth.uid() = id);

-- JAMAAH — doctor sees assigned patients, jamaah sees own record
-- Uses is_staff() (SECURITY DEFINER) to avoid infinite recursion
alter table public.jamaah enable row level security;
drop policy if exists jamaah_sel on public.jamaah;
create policy jamaah_sel on public.jamaah for select using (
  user_id = auth.uid() or doctor_id = auth.uid() or public.is_staff()
);
drop policy if exists jamaah_ins on public.jamaah;
create policy jamaah_ins on public.jamaah for insert with check (auth.uid() is not null);
drop policy if exists jamaah_upd on public.jamaah;
create policy jamaah_upd on public.jamaah for update using (
  user_id = auth.uid() or doctor_id = auth.uid() or public.is_staff()
);
drop policy if exists jamaah_del on public.jamaah;
create policy jamaah_del on public.jamaah for delete using (public.is_staff());

-- CHILD TABLES (screening, vital_sign, pasca_hajj_lab, pre_hajj_*) — same pattern
-- Staff can read all; jamaah can read own (via jamaah_id linked to jamaah.user_id = auth.uid())
-- Staff can insert/update; jamaah can insert own

-- Helper: check if jamaah_id belongs to current user
create or replace function public.is_own_jamaah(jid text)
returns boolean language sql security definer as $$
  select exists(select 1 from public.jamaah where id::text = jid and user_id = auth.uid());
$$;

create or replace function public.is_staff()
returns boolean language sql security definer as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('super_admin','admin','kepala_klinik','pj_mutu','petugas'));
$$;

-- Apply RLS to all child tables (same policy pattern)
-- For brevity, using a DO block to apply to all child tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'screening','vital_sign','pasca_hajj_lab',
    'pre_hajj_vital','pre_hajj_lab','pre_hajj_chronic','pre_hajj_screening',
    'pre_hajj_medication','pre_hajj_immunization','pre_hajj_fitness',
    'pre_hajj_education','pre_hajj_ai_assessment',
    'telemedicine_request','telemedicine_schedule','telemedicine_ai_summary'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %1$s_sel on public.%1$s', t);
    execute format('create policy %1$s_sel on public.%1$s for select using (public.is_staff() or public.is_own_jamaah(jamaah_id::text))', t);
    execute format('drop policy if exists %1$s_ins on public.%1$s', t);
    execute format('create policy %1$s_ins on public.%1$s for insert with check (public.is_staff() or public.is_own_jamaah(jamaah_id::text))', t);
    execute format('drop policy if exists %1$s_upd on public.%1$s', t);
    execute format('create policy %1$s_upd on public.%1$s for update using (public.is_staff() or public.is_own_jamaah(jamaah_id::text))', t);
    execute format('drop policy if exists %1$s_del on public.%1$s', t);
    execute format('create policy %1$s_del on public.%1$s for delete using (public.is_staff())', t);
  end loop;
end; $$;

-- CHAT_ROOM & CHAT_MESSAGE — any authenticated user
alter table public.chat_room enable row level security;
drop policy if exists cr_sel on public.chat_room;
create policy cr_sel on public.chat_room for select using (auth.uid() is not null);
drop policy if exists cr_ins on public.chat_room;
create policy cr_ins on public.chat_room for insert with check (auth.uid() is not null);
drop policy if exists cr_upd on public.chat_room;
create policy cr_upd on public.chat_room for update using (auth.uid() is not null);

alter table public.chat_message enable row level security;
drop policy if exists cm_sel on public.chat_message;
create policy cm_sel on public.chat_message for select using (auth.uid() is not null);
drop policy if exists cm_ins on public.chat_message;
create policy cm_ins on public.chat_message for insert with check (auth.uid() is not null);
drop policy if exists cm_upd on public.chat_message;
create policy cm_upd on public.chat_message for update using (auth.uid() is not null);

-- TELEMEDICINE_TEMPLATE — staff can manage, all can read
alter table public.telemedicine_template enable row level security;
drop policy if exists tt_sel on public.telemedicine_template;
create policy tt_sel on public.telemedicine_template for select using (auth.uid() is not null);
drop policy if exists tt_ins on public.telemedicine_template;
create policy tt_ins on public.telemedicine_template for insert with check (public.is_staff());
drop policy if exists tt_upd on public.telemedicine_template;
create policy tt_upd on public.telemedicine_template for update using (public.is_staff());

-- ============================================================================
-- REALTIME — enable for chat tables
-- ============================================================================
do $$
begin
  begin alter publication supabase_realtime add table public.chat_message; exception when others then null; end;
  begin alter publication supabase_realtime add table public.chat_room; exception when others then null; end;
  begin alter publication supabase_realtime add table public.vital_sign; exception when others then null; end;
  begin alter publication supabase_realtime add table public.screening; exception when others then null; end;
end; $$;

-- ============================================================================
-- SEED: default templates
-- ============================================================================
insert into public.telemedicine_template (title, category, content)
values
  ('Pengingat TTV Pagi','TEXT','Selamat pagi. Silakan isi tekanan darah, suhu, dan saturasi hari ini.'),
  ('Pengingat Skrining PHQ-9','SKRINING','Mohon isi skrining PHQ-9 untuk evaluasi kesehatan mental Anda.'),
  ('Pengingat Minum Obat','TEXT','Jangan lupa minum obat pagi ini sesuai resep dokter.'),
  ('Cek Keluhan Harian','TEXT','Bagaimana kondisi Bapak/Ibu hari ini? Ada keluhan demam, batuk, atau sesak?')
on conflict do nothing;
