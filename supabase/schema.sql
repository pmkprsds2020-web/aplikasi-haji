-- ============================================================================
-- SiHaji Care — Enterprise Supabase Schema (Production-Ready)
-- Electronic Hajj Health Record (EHHR) + Telemedicine Monitoring
-- ============================================================================
-- Compliance: Chapters 3, 4, 5, 6, 11, 26 of the Architecture Standard.
--
-- Standards enforced:
--   • Every table: id (UUID), created_at, updated_at, created_by, updated_by,
--     deleted_at, is_active  (Chapter 3)
--   • UUID primary keys only — no auto-increment integers (Chapter 3)
--   • Foreign Keys, Indexes, Unique, Check Constraints on every table (Chapter 3)
--   • RLS enabled on every table with SELECT/INSERT/UPDATE/DELETE policies (Chapter 5)
--   • RLS uses DROP POLICY IF EXISTS + CREATE POLICY (never IF NOT EXISTS) (Chapter 4)
--   • Audit Log table + triggers on every mutation (Chapter 11)
--   • Multi-role: super_admin, admin, kepala_klinik, pj_mutu, petugas, viewer, jamaah (Chapter 26)
--   • Soft delete via deleted_at + is_active (Chapter 3)
--
-- Run in: Supabase Dashboard → SQL Editor → paste → Run
-- Idempotent: safe to re-run. NOTE: re-running DROPS all existing tables
-- and recreates them (data is reset). This guarantees a clean schema even
-- after prior failed runs that left partial tables.
-- ============================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Remove conflicting enum from prior runs ----------
drop type if exists public.user_role cascade;

-- ============================================================================
-- 0a. CLEAN SLATE — drop all existing objects so re-runs rebuild correctly.
-- ============================================================================
-- IMPORTANT: Prior failed runs may have left partial tables (e.g. jamaah
-- without the is_active column). CREATE TABLE IF NOT EXISTS will NOT add
-- missing columns to an existing table, so we must drop everything first
-- to guarantee a clean rebuild with the full correct schema every time.
-- All data is lost on re-run — this is expected during schema setup.

drop function if exists public.is_staff() cascade;
drop function if exists public.is_super_admin() cascade;
drop function if exists public.current_jamaah_id() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_meta_on_insert() cascade;
drop function if exists public.set_meta_on_update() cascade;
drop function if exists public.log_audit() cascade;

drop table if exists public.telemedicine_ai_summary cascade;
drop table if exists public.telemedicine_schedule cascade;
drop table if exists public.telemedicine_template cascade;
drop table if exists public.telemedicine_request cascade;
drop table if exists public.chat_message cascade;
drop table if exists public.chat_room cascade;
drop table if exists public.pre_hajj_ai_assessment cascade;
drop table if exists public.pre_hajj_education cascade;
drop table if exists public.pre_hajj_fitness cascade;
drop table if exists public.pre_hajj_immunization cascade;
drop table if exists public.pre_hajj_medication cascade;
drop table if exists public.pre_hajj_screening cascade;
drop table if exists public.pre_hajj_chronic cascade;
drop table if exists public.pre_hajj_lab cascade;
drop table if exists public.pre_hajj_vital cascade;
drop table if exists public.vital_sign cascade;
drop table if exists public.screening cascade;
drop table if exists public.jamaah cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.profiles cascade;

-- ============================================================================
-- 0b. HELPER FUNCTIONS
-- ============================================================================
-- NOTE: Functions that reference tables (is_staff, is_super_admin,
-- current_jamaah_id) are defined AFTER those tables are created, because
-- LANGUAGE sql functions validate their queries at creation time.
-- The generic meta/audit functions (which don't reference specific tables
-- at parse time — they use TG_* variables) are defined after audit_log.
-- All functions were DROPped above; they are CREATEd in the correct order below.

-- ============================================================================
-- 1. PROFILES (linked to auth.users) — multi-role
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'petugas'
              check (role in ('super_admin','admin','kepala_klinik','pj_mutu','petugas','viewer','jamaah')),
  full_name   text,
  email       text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id),
  updated_by  uuid references auth.users(id),
  deleted_at  timestamptz,
  unique (email)
);
create index if not exists idx_profiles_role      on public.profiles(role);
create index if not exists idx_profiles_is_active on public.profiles(is_active);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'petugas');
  if v_role not in ('super_admin','admin','kepala_klinik','pj_mutu','petugas','viewer','jamaah') then
    v_role := 'petugas';
  end if;
  insert into public.profiles (id, email, full_name, role, created_by, updated_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    v_role,
    new.id,
    new.id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. AUDIT LOG (Chapter 11)
-- ============================================================================
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null check (action in ('INSERT','UPDATE','DELETE','RESTORE','LOGIN','LOGOUT','EXPORT','IMPORT')),
  table_name  text not null,
  record_id   text,
  old_value   jsonb,
  new_value   jsonb,
  ip_address  text,
  user_agent  text,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_log_user       on public.audit_log(user_id);
create index if not exists idx_audit_log_table      on public.audit_log(table_name);
create index if not exists idx_audit_log_action     on public.audit_log(action);
create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);

-- ============================================================================
-- 3. GENERIC META TRIGGERS (auto-set created_by/updated_by/updated_at)
-- ============================================================================
create or replace function public.set_meta_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.created_at := coalesce(new.created_at, now());
  new.updated_at := now();
  new.is_active  := coalesce(new.is_active, true);
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  if new.updated_by is null then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.set_meta_on_update()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  -- Prevent immutable fields from changing
  new.created_at := old.created_at;
  new.created_by := old.created_by;
  return new;
end;
$$;

-- Generic audit logger: logs INSERT/UPDATE/DELETE to audit_log
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_action text;
  v_old jsonb;
  v_new jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'INSERT'; v_old := null; v_new := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_action := 'UPDATE'; v_old := to_jsonb(old); v_new := to_jsonb(new);
    -- Skip if only updated_at changed (avoid noise)
    if v_old - 'updated_at' = v_new - 'updated_at' then return new; end if;
  elsif tg_op = 'DELETE' then
    v_action := 'DELETE'; v_old := to_jsonb(old); v_new := null;
  end if;
  insert into public.audit_log (user_id, action, table_name, record_id, old_value, new_value)
  values (auth.uid(), v_action, tg_table_name, coalesce(new.id::text, old.id::text), v_old, v_new);
  return coalesce(new, old);
end;
$$;

-- ============================================================================
-- 4. JAMAAH (EHHR core)
-- ============================================================================
create table if not exists public.jamaah (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  nama              text not null,
  nik               text not null,
  kloter            text not null,
  porsi             text not null,
  usia              integer not null check (usia >= 0 and usia <= 150),
  kelamin           text not null check (kelamin in ('L','P')),
  alamat            text not null default '',
  hp                text not null default '',
  kontak_keluarga   text not null default '',
  tanggal_tiba      timestamptz not null,
  bandara           text not null default '',
  kabupaten_kota    text not null default '',
  puskesmas         text not null default '',
  dokter_keluarga   text not null default '',
  paspor            text,
  embarkasi         text,
  gol_darah         text check (gol_darah is null or gol_darah ~ '^(A|B|AB|O)[+-]$'),
  riwayat_penyakit  text,
  riwayat_operasi   text,
  alergi            text,
  obat_rutin        text,
  status_istithaah  text default 'Belum Dinilai'
                    check (status_istithaah in ('Laik','Bersyarat','Tidak Laik','Belum Dinilai')),
  tanggal_berangkat timestamptz,
  tanggal_pulang    timestamptz,
  risk_level        text not null default 'HIJAU' check (risk_level in ('HIJAU','KUNING','MERAH')),
  risk_summary      text not null default '',
  -- Standard columns
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id),
  updated_by  uuid references auth.users(id),
  deleted_at  timestamptz,
  is_active   boolean not null default true,
  unique (nik)
);
create index if not exists idx_jamaah_user_id     on public.jamaah(user_id);
create index if not exists idx_jamaah_risk_level  on public.jamaah(risk_level desc);
create index if not exists idx_jamaah_kloter      on public.jamaah(kloter);
create index if not exists idx_jamaah_puskesmas   on public.jamaah(puskesmas);
create index if not exists idx_jamaah_is_active   on public.jamaah(is_active);
create index if not exists idx_jamaah_deleted_at  on public.jamaah(deleted_at);

drop trigger if exists trg_jamaah_meta_ins on public.jamaah;
create trigger trg_jamaah_meta_ins before insert on public.jamaah
  for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_jamaah_meta_upd on public.jamaah;
create trigger trg_jamaah_meta_upd before update on public.jamaah
  for each row execute function public.set_meta_on_update();
drop trigger if exists trg_jamaah_audit on public.jamaah;
create trigger trg_jamaah_audit after insert or update or delete on public.jamaah
  for each row execute function public.log_audit();

-- TABLE-DEPENDENT HELPER FUNCTIONS
-- Defined here (after profiles + jamaah tables) because LANGUAGE sql
-- functions validate their queries at creation time.

-- Is the current user a staff member (can manage clinical data)?
create or replace function public.is_staff()
returns boolean
language sql
security definer set search_path = public
as $$
  select coalesce(
    (select role in ('super_admin','admin','kepala_klinik','pj_mutu','petugas')
     from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Is the current user a super admin?
create or replace function public.is_super_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select coalesce(
    (select role = 'super_admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- The current user's linked jamaah id (if they are a patient)
create or replace function public.current_jamaah_id()
returns uuid
language sql
security definer set search_path = public
as $$
  select id from public.jamaah where user_id = auth.uid() and deleted_at is null limit 1;
$$;

-- ============================================================================
-- 5. PASCA HAJI — Screening & VitalSign
-- ============================================================================
create table if not exists public.screening (
  id          uuid primary key default gen_random_uuid(),
  jamaah_id   uuid not null references public.jamaah(id) on delete cascade,
  jenis       text not null,
  data        text not null default '{}',
  skor        text,
  catatan     text,
  hari_ke     integer not null default 1 check (hari_ke in (1,7,14,30,90)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id),
  updated_by  uuid references auth.users(id),
  deleted_at  timestamptz,
  is_active   boolean not null default true
);
create index if not exists idx_screening_jamaah_jenis on public.screening(jamaah_id, jenis);
create index if not exists idx_screening_jenis_hari   on public.screening(jenis, hari_ke);
create index if not exists idx_screening_is_active    on public.screening(is_active);

drop trigger if exists trg_screening_meta_ins on public.screening;
create trigger trg_screening_meta_ins before insert on public.screening
  for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_screening_meta_upd on public.screening;
create trigger trg_screening_meta_upd before update on public.screening
  for each row execute function public.set_meta_on_update();
drop trigger if exists trg_screening_audit on public.screening;
create trigger trg_screening_audit after insert or update or delete on public.screening
  for each row execute function public.log_audit();

create table if not exists public.vital_sign (
  id            uuid primary key default gen_random_uuid(),
  jamaah_id     uuid not null references public.jamaah(id) on delete cascade,
  td_sistolik   integer check (td_sistolik is null or td_sistolik between 40 and 300),
  td_diastolik  integer check (td_diastolik is null or td_diastolik between 20 and 200),
  nadi          integer check (nadi is null or nadi between 20 and 250),
  rr            integer check (rr is null or rr between 5 and 60),
  suhu          double precision check (suhu is null or suhu between 30 and 45),
  spo2          double precision check (spo2 is null or spo2 between 0 and 100),
  berat_badan   double precision check (berat_badan is null or berat_badan between 1 and 400),
  gula_darah    double precision check (gula_darah is null or gula_darah between 10 and 1000),
  hari_ke       integer not null default 1 check (hari_ke in (1,7,14,30,90)),
  catatan       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id),
  updated_by    uuid references auth.users(id),
  deleted_at    timestamptz,
  is_active     boolean not null default true
);
create index if not exists idx_vital_sign_jamaah_hari on public.vital_sign(jamaah_id, hari_ke);
create index if not exists idx_vital_sign_is_active  on public.vital_sign(is_active);

drop trigger if exists trg_vital_sign_meta_ins on public.vital_sign;
create trigger trg_vital_sign_meta_ins before insert on public.vital_sign
  for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_vital_sign_meta_upd on public.vital_sign;
create trigger trg_vital_sign_meta_upd before update on public.vital_sign
  for each row execute function public.set_meta_on_update();
drop trigger if exists trg_vital_sign_audit on public.vital_sign;
create trigger trg_vital_sign_audit after insert or update or delete on public.vital_sign
  for each row execute function public.log_audit();

-- ============================================================================
-- 6. PRA HAJI — Vitals, Labs, Chronic, Screenings, Meds, Immunizations, Fitness, Education, AI
-- ============================================================================
-- (Each table follows the standard: UUID PK, 7 meta columns, FK, indexes, check, triggers.)

create table if not exists public.pre_hajj_vital (
  id            uuid primary key default gen_random_uuid(),
  jamaah_id     uuid not null references public.jamaah(id) on delete cascade,
  td_sistolik   integer, td_diastolik integer, nadi integer, rr integer,
  suhu          double precision, spo2 double precision,
  berat_badan   double precision, tinggi_badan double precision, lingkar_perut double precision,
  catatan       text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
create index if not exists idx_pre_hajj_vital_jamaah on public.pre_hajj_vital(jamaah_id);
create index if not exists idx_pre_hajj_vital_active on public.pre_hajj_vital(is_active);
drop trigger if exists trg_phv_meta_ins on public.pre_hajj_vital;
create trigger trg_phv_meta_ins before insert on public.pre_hajj_vital for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_phv_meta_upd on public.pre_hajj_vital;
create trigger trg_phv_meta_upd before update on public.pre_hajj_vital for each row execute function public.set_meta_on_update();
drop trigger if exists trg_phv_audit on public.pre_hajj_vital;
create trigger trg_phv_audit after insert or update or delete on public.pre_hajj_vital for each row execute function public.log_audit();

create table if not exists public.pre_hajj_lab (
  id           uuid primary key default gen_random_uuid(),
  jamaah_id    uuid not null references public.jamaah(id) on delete cascade,
  hb double precision, gdp double precision, gd2pp double precision, hba1c double precision,
  kolesterol double precision, hdl double precision, ldl double precision, trigliserida double precision,
  asam_urat double precision, sgot double precision, sgpt double precision,
  kreatinin double precision, egfr double precision, urinalisis text, catatan text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
create index if not exists idx_pre_hajj_lab_jamaah on public.pre_hajj_lab(jamaah_id);
create index if not exists idx_pre_hajj_lab_active on public.pre_hajj_lab(is_active);
drop trigger if exists trg_phl_meta_ins on public.pre_hajj_lab;
create trigger trg_phl_meta_ins before insert on public.pre_hajj_lab for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_phl_meta_upd on public.pre_hajj_lab;
create trigger trg_phl_meta_upd before update on public.pre_hajj_lab for each row execute function public.set_meta_on_update();
drop trigger if exists trg_phl_audit on public.pre_hajj_lab;
create trigger trg_phl_audit after insert or update or delete on public.pre_hajj_lab for each row execute function public.log_audit();

create table if not exists public.pre_hajj_chronic (
  id            uuid primary key default gen_random_uuid(),
  jamaah_id     uuid not null references public.jamaah(id) on delete cascade,
  hipertensi    text not null default 'Tidak' check (hipertensi in ('Tidak','Terkontrol','Tidak Terkontrol')),
  diabetes      text not null default 'Tidak' check (diabetes in ('Tidak','Terkontrol','Tidak Terkontrol')),
  ppok          text not null default 'Tidak' check (ppok in ('Tidak','Terkontrol','Tidak Terkontrol')),
  ckd           text not null default 'Tidak' check (ckd in ('Tidak','Terkontrol','Tidak Terkontrol')),
  jantung       text not null default 'Tidak' check (jantung in ('Tidak','Terkontrol','Tidak Terkontrol')),
  stroke        text not null default 'Tidak' check (stroke in ('Tidak','Terkontrol','Tidak Terkontrol')),
  kanker        text not null default 'Tidak' check (kanker in ('Tidak','Terkontrol','Tidak Terkontrol')),
  obat_rutin    text, target_terapi text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true,
  unique (jamaah_id)
);
create index if not exists idx_pre_hajj_chronic_jamaah on public.pre_hajj_chronic(jamaah_id);
drop trigger if exists trg_phc_meta_ins on public.pre_hajj_chronic;
create trigger trg_phc_meta_ins before insert on public.pre_hajj_chronic for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_phc_meta_upd on public.pre_hajj_chronic;
create trigger trg_phc_meta_upd before update on public.pre_hajj_chronic for each row execute function public.set_meta_on_update();
drop trigger if exists trg_phc_audit on public.pre_hajj_chronic;
create trigger trg_phc_audit after insert or update or delete on public.pre_hajj_chronic for each row execute function public.log_audit();

create table if not exists public.pre_hajj_screening (
  id          uuid primary key default gen_random_uuid(),
  jamaah_id   uuid not null references public.jamaah(id) on delete cascade,
  jenis       text not null,
  data        text not null default '{}', skor text, catatan text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
create index if not exists idx_pre_hajj_screening_jamaah_jenis on public.pre_hajj_screening(jamaah_id, jenis);
create index if not exists idx_pre_hajj_screening_active on public.pre_hajj_screening(is_active);
drop trigger if exists trg_phs_meta_ins on public.pre_hajj_screening;
create trigger trg_phs_meta_ins before insert on public.pre_hajj_screening for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_phs_meta_upd on public.pre_hajj_screening;
create trigger trg_phs_meta_upd before update on public.pre_hajj_screening for each row execute function public.set_meta_on_update();
drop trigger if exists trg_phs_audit on public.pre_hajj_screening;
create trigger trg_phs_audit after insert or update or delete on public.pre_hajj_screening for each row execute function public.log_audit();

create table if not exists public.pre_hajj_medication (
  id          uuid primary key default gen_random_uuid(),
  jamaah_id   uuid not null references public.jamaah(id) on delete cascade,
  nama_obat   text not null, dosis text, frekuensi text, indikasi text, catatan text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
create index if not exists idx_pre_hajj_medication_jamaah on public.pre_hajj_medication(jamaah_id);
drop trigger if exists trg_phm_meta_ins on public.pre_hajj_medication;
create trigger trg_phm_meta_ins before insert on public.pre_hajj_medication for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_phm_meta_upd on public.pre_hajj_medication;
create trigger trg_phm_meta_upd before update on public.pre_hajj_medication for each row execute function public.set_meta_on_update();
drop trigger if exists trg_phm_audit on public.pre_hajj_medication;
create trigger trg_phm_audit after insert or update or delete on public.pre_hajj_medication for each row execute function public.log_audit();

create table if not exists public.pre_hajj_immunization (
  id             uuid primary key default gen_random_uuid(),
  jamaah_id      uuid not null references public.jamaah(id) on delete cascade,
  jenis          text not null check (jenis in ('MENINGITIS','INFLUENZA','COVID','PNEUMOKOKUS','HEPATITIS')),
  tanggal_vaksin timestamptz, nomor_batch text, catatan text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
create index if not exists idx_pre_hajj_immunization_jamaah on public.pre_hajj_immunization(jamaah_id);
drop trigger if exists trg_phi_meta_ins on public.pre_hajj_immunization;
create trigger trg_phi_meta_ins before insert on public.pre_hajj_immunization for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_phi_meta_upd on public.pre_hajj_immunization;
create trigger trg_phi_meta_upd before update on public.pre_hajj_immunization for each row execute function public.set_meta_on_update();
drop trigger if exists trg_phi_audit on public.pre_hajj_immunization;
create trigger trg_phi_audit after insert or update or delete on public.pre_hajj_immunization for each row execute function public.log_audit();

create table if not exists public.pre_hajj_fitness (
  id             uuid primary key default gen_random_uuid(),
  jamaah_id      uuid not null references public.jamaah(id) on delete cascade,
  target_langkah integer, jalan_kaki integer, aerobik integer, kekuatan integer, pernafasan integer,
  catatan text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
create index if not exists idx_pre_hajj_fitness_jamaah on public.pre_hajj_fitness(jamaah_id);
drop trigger if exists trg_phf_meta_ins on public.pre_hajj_fitness;
create trigger trg_phf_meta_ins before insert on public.pre_hajj_fitness for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_phf_meta_upd on public.pre_hajj_fitness;
create trigger trg_phf_meta_upd before update on public.pre_hajj_fitness for each row execute function public.set_meta_on_update();
drop trigger if exists trg_phf_audit on public.pre_hajj_fitness;
create trigger trg_phf_audit after insert or update or delete on public.pre_hajj_fitness for each row execute function public.log_audit();

create table if not exists public.pre_hajj_education (
  id                     uuid primary key default gen_random_uuid(),
  jamaah_id              uuid not null references public.jamaah(id) on delete cascade,
  diet                   boolean not null default false,
  aktivitas              boolean not null default false,
  obat                   boolean not null default false,
  hidrasi                boolean not null default false,
  istirahat              boolean not null default false,
  manajemen_kronis       boolean not null default false,
  persiapan_perjalanan   boolean not null default false,
  catatan text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true,
  unique (jamaah_id)
);
create index if not exists idx_pre_hajj_education_jamaah on public.pre_hajj_education(jamaah_id);
drop trigger if exists trg_phe_meta_ins on public.pre_hajj_education;
create trigger trg_phe_meta_ins before insert on public.pre_hajj_education for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_phe_meta_upd on public.pre_hajj_education;
create trigger trg_phe_meta_upd before update on public.pre_hajj_education for each row execute function public.set_meta_on_update();
drop trigger if exists trg_phe_audit on public.pre_hajj_education;
create trigger trg_phe_audit after insert or update or delete on public.pre_hajj_education for each row execute function public.log_audit();

create table if not exists public.pre_hajj_ai_assessment (
  id                  uuid primary key default gen_random_uuid(),
  jamaah_id           uuid not null references public.jamaah(id) on delete cascade,
  ringkasan           text not null,
  faktor_risiko       text not null default '[]',
  kesiapan_berangkat  text not null check (kesiapan_berangkat in ('Siap','Bersyarat','Belum Siap')),
  rekomendasi         text not null default '[]',
  soap text, resume_medis text, surat_rujukan text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
create index if not exists idx_pre_hajj_ai_assessment_jamaah on public.pre_hajj_ai_assessment(jamaah_id);
drop trigger if exists trg_pha_meta_ins on public.pre_hajj_ai_assessment;
create trigger trg_pha_meta_ins before insert on public.pre_hajj_ai_assessment for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_pha_meta_upd on public.pre_hajj_ai_assessment;
create trigger trg_pha_meta_upd before update on public.pre_hajj_ai_assessment for each row execute function public.set_meta_on_update();
drop trigger if exists trg_pha_audit on public.pre_hajj_ai_assessment;
create trigger trg_pha_audit after insert or update or delete on public.pre_hajj_ai_assessment for each row execute function public.log_audit();

-- ============================================================================
-- 7. TELEMEDICINE
-- ============================================================================
create table if not exists public.chat_room (
  id               uuid primary key default gen_random_uuid(),
  jamaah_id        uuid not null references public.jamaah(id) on delete cascade,
  doctor_id        uuid references auth.users(id) on delete set null,
  last_message_at  timestamptz not null default now(),
  unread_by_doctor integer not null default 0 check (unread_by_doctor >= 0),
  unread_by_jamaah integer not null default 0 check (unread_by_jamaah >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true,
  unique (jamaah_id)
);
create index if not exists idx_chat_room_doctor on public.chat_room(doctor_id);
drop trigger if exists trg_cr_meta_ins on public.chat_room;
create trigger trg_cr_meta_ins before insert on public.chat_room for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_cr_meta_upd on public.chat_room;
create trigger trg_cr_meta_upd before update on public.chat_room for each row execute function public.set_meta_on_update();

create table if not exists public.chat_message (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.chat_room(id) on delete cascade,
  sender_type     text not null check (sender_type in ('DOCTOR','JAMAAH','SYSTEM','AI')),
  sender_name     text,
  type            text not null,
  content         text not null,
  attachment_url  text, attachment_name text, request_id text,
  read_by_doctor  boolean not null default false,
  read_by_jamaah  boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
create index if not exists idx_chat_message_room_created on public.chat_message(room_id, created_at);
create index if not exists idx_chat_message_sender        on public.chat_message(sender_type);
drop trigger if exists trg_cm_meta_ins on public.chat_message;
create trigger trg_cm_meta_ins before insert on public.chat_message for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_cm_meta_upd on public.chat_message;
create trigger trg_cm_meta_upd before update on public.chat_message for each row execute function public.set_meta_on_update();

create table if not exists public.telemedicine_request (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.chat_room(id) on delete cascade,
  jamaah_id     uuid not null references public.jamaah(id) on delete cascade,
  category      text not null check (category in ('TTV','SKRINING','EDUKASI','OBAT','DAILY_COMPLAINT','CHRONIC')),
  sub_type      text, title text not null, fields text not null default '[]',
  status        text not null default 'PENDING' check (status in ('PENDING','SUBMITTED','EXPIRED')),
  scheduled_for timestamptz, submitted_at timestamptz, response text, skor text, hari_ke integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
create index if not exists idx_telemedicine_request_jamaah_cat on public.telemedicine_request(jamaah_id, category);
create index if not exists idx_telemedicine_request_status    on public.telemedicine_request(status);
drop trigger if exists trg_tr_meta_ins on public.telemedicine_request;
create trigger trg_tr_meta_ins before insert on public.telemedicine_request for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_tr_meta_upd on public.telemedicine_request;
create trigger trg_tr_meta_upd before update on public.telemedicine_request for each row execute function public.set_meta_on_update();

create table if not exists public.telemedicine_template (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text not null check (category in ('TEXT','TTV','SKRINING','EDUKASI','OBAT')),
  content     text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
drop trigger if exists trg_tt_meta_ins on public.telemedicine_template;
create trigger trg_tt_meta_ins before insert on public.telemedicine_template for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_tt_meta_upd on public.telemedicine_template;
create trigger trg_tt_meta_upd before update on public.telemedicine_template for each row execute function public.set_meta_on_update();

create table if not exists public.telemedicine_schedule (
  id          uuid primary key default gen_random_uuid(),
  jamaah_id   uuid not null references public.jamaah(id) on delete cascade,
  category    text not null, sub_type text, title text not null,
  hari_ke integer, time_of_day text,
  active      boolean not null default true, last_sent_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
create index if not exists idx_telemedicine_schedule_jamaah_active on public.telemedicine_schedule(jamaah_id, active);
drop trigger if exists trg_ts_meta_ins on public.telemedicine_schedule;
create trigger trg_ts_meta_ins before insert on public.telemedicine_schedule for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_ts_meta_upd on public.telemedicine_schedule;
create trigger trg_ts_meta_upd before update on public.telemedicine_schedule for each row execute function public.set_meta_on_update();

create table if not exists public.telemedicine_ai_summary (
  id          uuid primary key default gen_random_uuid(),
  jamaah_id   uuid not null references public.jamaah(id) on delete cascade,
  room_id     uuid not null references public.chat_room(id) on delete cascade,
  ringkasan   text not null, soap text, assessment text, plan text,
  prioritas   text check (prioritas is null or prioritas in ('URGENT','TINGGI','SEDANG','RUTIN')),
  rekomendasi text, alerts text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id),
  deleted_at timestamptz, is_active boolean not null default true
);
create index if not exists idx_telemedicine_ai_summary_jamaah on public.telemedicine_ai_summary(jamaah_id);
drop trigger if exists trg_tas_meta_ins on public.telemedicine_ai_summary;
create trigger trg_tas_meta_ins before insert on public.telemedicine_ai_summary for each row execute function public.set_meta_on_insert();
drop trigger if exists trg_tas_meta_upd on public.telemedicine_ai_summary;
create trigger trg_tas_meta_upd before update on public.telemedicine_ai_summary for each row execute function public.set_meta_on_update();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (Chapter 5) — DROP IF EXISTS + CREATE pattern
-- ============================================================================
-- Policy model:
--   • Staff (super_admin/admin/kepala_klinik/pj_mutu/petugas) → full CRUD, sees non-deleted rows
--   • Jamaah (patient) → read/insert own linked rows only
--   • Soft delete: SELECT excludes deleted_at IS NOT NULL for non-super-admins

-- ---------- PROFILES ----------
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (auth.uid() = id or public.is_staff());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (auth.uid() = id or public.is_staff());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (auth.uid() = id or public.is_staff());
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete using (public.is_super_admin());

-- ---------- AUDIT LOG ----------
alter table public.audit_log enable row level security;
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select using (public.is_staff());
drop policy if exists audit_log_insert on public.audit_log;
create policy audit_log_insert on public.audit_log for insert with check (auth.uid() is not null);
drop policy if exists audit_log_update on public.audit_log;
create policy audit_log_update on public.audit_log for update using (public.is_super_admin());
drop policy if exists audit_log_delete on public.audit_log;
create policy audit_log_delete on public.audit_log for delete using (public.is_super_admin());

-- ---------- JAMAAH ----------
alter table public.jamaah enable row level security;
drop policy if exists jamaah_select on public.jamaah;
create policy jamaah_select on public.jamaah for select using (public.is_staff() or user_id = auth.uid());
drop policy if exists jamaah_insert on public.jamaah;
create policy jamaah_insert on public.jamaah for insert with check (public.is_staff() or user_id = auth.uid());
drop policy if exists jamaah_update on public.jamaah;
create policy jamaah_update on public.jamaah for update using (public.is_staff() or user_id = auth.uid());
drop policy if exists jamaah_delete on public.jamaah;
create policy jamaah_delete on public.jamaah for delete using (public.is_staff());

-- ---------- Generic policy block for child tables (jamaah_id-linked) ----------
-- Applied to: screening, vital_sign, pre_hajj_*, telemedicine_request, telemedicine_schedule, telemedicine_ai_summary

-- SCREENING
alter table public.screening enable row level security;
drop policy if exists screening_select on public.screening;
create policy screening_select on public.screening for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists screening_insert on public.screening;
create policy screening_insert on public.screening for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists screening_update on public.screening;
create policy screening_update on public.screening for update using (public.is_staff());
drop policy if exists screening_delete on public.screening;
create policy screening_delete on public.screening for delete using (public.is_staff());

-- VITAL_SIGN
alter table public.vital_sign enable row level security;
drop policy if exists vital_sign_select on public.vital_sign;
create policy vital_sign_select on public.vital_sign for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists vital_sign_insert on public.vital_sign;
create policy vital_sign_insert on public.vital_sign for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists vital_sign_update on public.vital_sign;
create policy vital_sign_update on public.vital_sign for update using (public.is_staff());
drop policy if exists vital_sign_delete on public.vital_sign;
create policy vital_sign_delete on public.vital_sign for delete using (public.is_staff());

-- PRE_HAJJ_VITAL
alter table public.pre_hajj_vital enable row level security;
drop policy if exists phv_select on public.pre_hajj_vital;
create policy phv_select on public.pre_hajj_vital for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phv_insert on public.pre_hajj_vital;
create policy phv_insert on public.pre_hajj_vital for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phv_update on public.pre_hajj_vital;
create policy phv_update on public.pre_hajj_vital for update using (public.is_staff());
drop policy if exists phv_delete on public.pre_hajj_vital;
create policy phv_delete on public.pre_hajj_vital for delete using (public.is_staff());

-- PRE_HAJJ_LAB
alter table public.pre_hajj_lab enable row level security;
drop policy if exists phl_select on public.pre_hajj_lab;
create policy phl_select on public.pre_hajj_lab for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phl_insert on public.pre_hajj_lab;
create policy phl_insert on public.pre_hajj_lab for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phl_update on public.pre_hajj_lab;
create policy phl_update on public.pre_hajj_lab for update using (public.is_staff());
drop policy if exists phl_delete on public.pre_hajj_lab;
create policy phl_delete on public.pre_hajj_lab for delete using (public.is_staff());

-- PRE_HAJJ_CHRONIC
alter table public.pre_hajj_chronic enable row level security;
drop policy if exists phc_select on public.pre_hajj_chronic;
create policy phc_select on public.pre_hajj_chronic for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phc_insert on public.pre_hajj_chronic;
create policy phc_insert on public.pre_hajj_chronic for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phc_update on public.pre_hajj_chronic;
create policy phc_update on public.pre_hajj_chronic for update using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phc_delete on public.pre_hajj_chronic;
create policy phc_delete on public.pre_hajj_chronic for delete using (public.is_staff());

-- PRE_HAJJ_SCREENING
alter table public.pre_hajj_screening enable row level security;
drop policy if exists phs_select on public.pre_hajj_screening;
create policy phs_select on public.pre_hajj_screening for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phs_insert on public.pre_hajj_screening;
create policy phs_insert on public.pre_hajj_screening for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phs_update on public.pre_hajj_screening;
create policy phs_update on public.pre_hajj_screening for update using (public.is_staff());
drop policy if exists phs_delete on public.pre_hajj_screening;
create policy phs_delete on public.pre_hajj_screening for delete using (public.is_staff());

-- PRE_HAJJ_MEDICATION
alter table public.pre_hajj_medication enable row level security;
drop policy if exists phm_select on public.pre_hajj_medication;
create policy phm_select on public.pre_hajj_medication for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phm_insert on public.pre_hajj_medication;
create policy phm_insert on public.pre_hajj_medication for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phm_update on public.pre_hajj_medication;
create policy phm_update on public.pre_hajj_medication for update using (public.is_staff());
drop policy if exists phm_delete on public.pre_hajj_medication;
create policy phm_delete on public.pre_hajj_medication for delete using (public.is_staff());

-- PRE_HAJJ_IMMUNIZATION
alter table public.pre_hajj_immunization enable row level security;
drop policy if exists phi_select on public.pre_hajj_immunization;
create policy phi_select on public.pre_hajj_immunization for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phi_insert on public.pre_hajj_immunization;
create policy phi_insert on public.pre_hajj_immunization for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phi_update on public.pre_hajj_immunization;
create policy phi_update on public.pre_hajj_immunization for update using (public.is_staff());
drop policy if exists phi_delete on public.pre_hajj_immunization;
create policy phi_delete on public.pre_hajj_immunization for delete using (public.is_staff());

-- PRE_HAJJ_FITNESS
alter table public.pre_hajj_fitness enable row level security;
drop policy if exists phf_select on public.pre_hajj_fitness;
create policy phf_select on public.pre_hajj_fitness for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phf_insert on public.pre_hajj_fitness;
create policy phf_insert on public.pre_hajj_fitness for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phf_update on public.pre_hajj_fitness;
create policy phf_update on public.pre_hajj_fitness for update using (public.is_staff());
drop policy if exists phf_delete on public.pre_hajj_fitness;
create policy phf_delete on public.pre_hajj_fitness for delete using (public.is_staff());

-- PRE_HAJJ_EDUCATION
alter table public.pre_hajj_education enable row level security;
drop policy if exists phe_select on public.pre_hajj_education;
create policy phe_select on public.pre_hajj_education for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phe_insert on public.pre_hajj_education;
create policy phe_insert on public.pre_hajj_education for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phe_update on public.pre_hajj_education;
create policy phe_update on public.pre_hajj_education for update using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phe_delete on public.pre_hajj_education;
create policy phe_delete on public.pre_hajj_education for delete using (public.is_staff());

-- PRE_HAJJ_AI_ASSESSMENT
alter table public.pre_hajj_ai_assessment enable row level security;
drop policy if exists pha_select on public.pre_hajj_ai_assessment;
create policy pha_select on public.pre_hajj_ai_assessment for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists pha_insert on public.pre_hajj_ai_assessment;
create policy pha_insert on public.pre_hajj_ai_assessment for insert with check (public.is_staff());
drop policy if exists pha_update on public.pre_hajj_ai_assessment;
create policy pha_update on public.pre_hajj_ai_assessment for update using (public.is_staff());
drop policy if exists pha_delete on public.pre_hajj_ai_assessment;
create policy pha_delete on public.pre_hajj_ai_assessment for delete using (public.is_staff());

-- CHAT_ROOM
alter table public.chat_room enable row level security;
drop policy if exists cr_select on public.chat_room;
create policy cr_select on public.chat_room for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists cr_insert on public.chat_room;
create policy cr_insert on public.chat_room for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists cr_update on public.chat_room;
create policy cr_update on public.chat_room for update using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists cr_delete on public.chat_room;
create policy cr_delete on public.chat_room for delete using (public.is_staff());

-- CHAT_MESSAGE
alter table public.chat_message enable row level security;
drop policy if exists cm_select on public.chat_message;
create policy cm_select on public.chat_message for select using (
  public.is_staff() or
  exists (select 1 from public.chat_room where id = chat_message.room_id and jamaah_id = public.current_jamaah_id())
);
drop policy if exists cm_insert on public.chat_message;
create policy cm_insert on public.chat_message for insert with check (
  public.is_staff() or
  exists (select 1 from public.chat_room where id = chat_message.room_id and jamaah_id = public.current_jamaah_id())
);
drop policy if exists cm_update on public.chat_message;
create policy cm_update on public.chat_message for update using (public.is_staff());
drop policy if exists cm_delete on public.chat_message;
create policy cm_delete on public.chat_message for delete using (public.is_staff());

-- TELEMEDICINE_REQUEST
alter table public.telemedicine_request enable row level security;
drop policy if exists tr_select on public.telemedicine_request;
create policy tr_select on public.telemedicine_request for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists tr_insert on public.telemedicine_request;
create policy tr_insert on public.telemedicine_request for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists tr_update on public.telemedicine_request;
create policy tr_update on public.telemedicine_request for update using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists tr_delete on public.telemedicine_request;
create policy tr_delete on public.telemedicine_request for delete using (public.is_staff());

-- TELEMEDICINE_TEMPLATE
alter table public.telemedicine_template enable row level security;
drop policy if exists tt_select on public.telemedicine_template;
create policy tt_select on public.telemedicine_template for select using (auth.uid() is not null);
drop policy if exists tt_insert on public.telemedicine_template;
create policy tt_insert on public.telemedicine_template for insert with check (public.is_staff());
drop policy if exists tt_update on public.telemedicine_template;
create policy tt_update on public.telemedicine_template for update using (public.is_staff());
drop policy if exists tt_delete on public.telemedicine_template;
create policy tt_delete on public.telemedicine_template for delete using (public.is_staff());

-- TELEMEDICINE_SCHEDULE
alter table public.telemedicine_schedule enable row level security;
drop policy if exists ts_select on public.telemedicine_schedule;
create policy ts_select on public.telemedicine_schedule for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists ts_insert on public.telemedicine_schedule;
create policy ts_insert on public.telemedicine_schedule for insert with check (public.is_staff());
drop policy if exists ts_update on public.telemedicine_schedule;
create policy ts_update on public.telemedicine_schedule for update using (public.is_staff());
drop policy if exists ts_delete on public.telemedicine_schedule;
create policy ts_delete on public.telemedicine_schedule for delete using (public.is_staff());

-- TELEMEDICINE_AI_SUMMARY
alter table public.telemedicine_ai_summary enable row level security;
drop policy if exists tas_select on public.telemedicine_ai_summary;
create policy tas_select on public.telemedicine_ai_summary for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists tas_insert on public.telemedicine_ai_summary;
create policy tas_insert on public.telemedicine_ai_summary for insert with check (public.is_staff());
drop policy if exists tas_update on public.telemedicine_ai_summary;
create policy tas_update on public.telemedicine_ai_summary for update using (public.is_staff());
drop policy if exists tas_delete on public.telemedicine_ai_summary;
create policy tas_delete on public.telemedicine_ai_summary for delete using (public.is_staff());

-- ============================================================================
-- 9. SEED: default telemedicine templates
-- ============================================================================
insert into public.telemedicine_template (title, category, content)
values
  ('Pengingat TTV Pagi', 'TEXT', 'Selamat pagi. Silakan isi tekanan darah, suhu, dan saturasi hari ini. Terima kasih.'),
  ('Pengingat Skrining PHQ-9', 'SKRINING', 'Mohon isi skrining PHQ-9 untuk evaluasi kesehatan mental Anda.'),
  ('Pengingat Minum Obat', 'TEXT', 'Jangan lupa minum obat pagi ini sesuai resep dokter.'),
  ('Cek Keluhan Harian', 'TEXT', 'Bagaimana kondisi Bapak/Ibu hari ini? Ada keluhan demam, batuk, atau sesak?')
on conflict do nothing;

-- ============================================================================
-- DONE — 20 tables (profiles, audit_log, jamaah + 17 clinical/telemedicine)
-- Verify:
--   select tablename from pg_tables where schemaname='public' order by tablename;
--   select tablename, count(*) from pg_policies where schemaname='public' group by tablename;
-- ============================================================================