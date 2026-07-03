-- ============================================================================
-- SiHaji Care — Supabase Schema Migration
-- Electronic Hajj Health Record (EHHR) + Telemedicine Monitoring
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- Project: pmkprsds2020-web's Project (rkbmbyhofygwaucgqcpb)
--
-- This script is IDEMPOTENT: safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS).
-- It creates: profiles, 18 clinical/telemedicine tables, indexes, FKs, RLS policies,
-- and a trigger that auto-creates a profile row when a new auth user signs up.
-- ============================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";   -- for gen_random_uuid()

-- ---------- ENUM for user roles ----------
do $$ begin
  create type user_role as enum ('doctor', 'admin', 'jamaah');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 1. PROFILES (linked to auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'doctor',
  full_name   text,
  email       text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'doctor')
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
-- 2. JAMAAH (EHHR core)
-- ============================================================================
create table if not exists public.jamaah (
  id                text primary key default gen_random_uuid()::text,
  user_id           uuid references auth.users(id) on delete set null,
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
  paspor            text,
  embarkasi         text,
  gol_darah         text,
  riwayat_penyakit  text,
  riwayat_operasi   text,
  alergi            text,
  obat_rutin        text,
  status_istithaah  text default 'Belum Dinilai',
  tanggal_berangkat timestamptz,
  tanggal_pulang    timestamptz,
  risk_level        text not null default 'HIJAU' check (risk_level in ('HIJAU','KUNING','MERAH')),
  risk_summary      text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_jamaah_user_id     on public.jamaah(user_id);
create index if not exists idx_jamaah_risk_level  on public.jamaah(risk_level desc);
create index if not exists idx_jamaah_kloter      on public.jamaah(kloter);
create index if not exists idx_jamaah_puskesmas   on public.jamaah(puskesmas);

-- ============================================================================
-- 3. PASCA HAJI — Screening & VitalSign
-- ============================================================================
create table if not exists public.screening (
  id          text primary key default gen_random_uuid()::text,
  jamaah_id   text not null references public.jamaah(id) on delete cascade,
  jenis       text not null,
  data        text not null default '{}',
  skor        text,
  catatan     text,
  hari_ke     integer not null default 1,
  created_at  timestamptz not null default now()
);
create index if not exists idx_screening_jamaah_jenis on public.screening(jamaah_id, jenis);
create index if not exists idx_screening_jenis_hari   on public.screening(jenis, hari_ke);

create table if not exists public.vital_sign (
  id            text primary key default gen_random_uuid()::text,
  jamaah_id     text not null references public.jamaah(id) on delete cascade,
  td_sistolik   integer,
  td_diastolik  integer,
  nadi          integer,
  rr            integer,
  suhu          double precision,
  spo2          double precision,
  berat_badan   double precision,
  gula_darah    double precision,
  hari_ke       integer not null default 1,
  catatan       text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_vital_sign_jamaah_hari on public.vital_sign(jamaah_id, hari_ke);

-- ============================================================================
-- 4. PRA HAJI
-- ============================================================================
create table if not exists public.pre_hajj_vital (
  id            text primary key default gen_random_uuid()::text,
  jamaah_id     text not null references public.jamaah(id) on delete cascade,
  td_sistolik   integer,
  td_diastolik  integer,
  nadi          integer,
  rr            integer,
  suhu          double precision,
  spo2          double precision,
  berat_badan   double precision,
  tinggi_badan  double precision,
  lingkar_perut double precision,
  catatan       text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_pre_hajj_vital_jamaah on public.pre_hajj_vital(jamaah_id);

create table if not exists public.pre_hajj_lab (
  id           text primary key default gen_random_uuid()::text,
  jamaah_id    text not null references public.jamaah(id) on delete cascade,
  hb           double precision,
  gdp          double precision,
  gd2pp        double precision,
  hba1c        double precision,
  kolesterol   double precision,
  hdl          double precision,
  ldl          double precision,
  trigliserida double precision,
  asam_urat    double precision,
  sgot         double precision,
  sgpt         double precision,
  kreatinin    double precision,
  egfr         double precision,
  urinalisis   text,
  catatan      text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_pre_hajj_lab_jamaah on public.pre_hajj_lab(jamaah_id);

create table if not exists public.pre_hajj_chronic (
  id            text primary key default gen_random_uuid()::text,
  jamaah_id     text not null unique references public.jamaah(id) on delete cascade,
  hipertensi    text not null default 'Tidak',
  diabetes      text not null default 'Tidak',
  ppok          text not null default 'Tidak',
  ckd           text not null default 'Tidak',
  jantung       text not null default 'Tidak',
  stroke        text not null default 'Tidak',
  kanker        text not null default 'Tidak',
  obat_rutin    text,
  target_terapi text,
  updated_at    timestamptz not null default now()
);
create index if not exists idx_pre_hajj_chronic_jamaah on public.pre_hajj_chronic(jamaah_id);

create table if not exists public.pre_hajj_screening (
  id          text primary key default gen_random_uuid()::text,
  jamaah_id   text not null references public.jamaah(id) on delete cascade,
  jenis       text not null,
  data        text not null default '{}',
  skor        text,
  catatan     text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_pre_hajj_screening_jamaah_jenis on public.pre_hajj_screening(jamaah_id, jenis);

create table if not exists public.pre_hajj_medication (
  id          text primary key default gen_random_uuid()::text,
  jamaah_id   text not null references public.jamaah(id) on delete cascade,
  nama_obat   text not null,
  dosis       text,
  frekuensi   text,
  indikasi    text,
  catatan     text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_pre_hajj_medication_jamaah on public.pre_hajj_medication(jamaah_id);

create table if not exists public.pre_hajj_immunization (
  id             text primary key default gen_random_uuid()::text,
  jamaah_id      text not null references public.jamaah(id) on delete cascade,
  jenis          text not null,
  tanggal_vaksin timestamptz,
  nomor_batch    text,
  catatan        text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_pre_hajj_immunization_jamaah on public.pre_hajj_immunization(jamaah_id);

create table if not exists public.pre_hajj_fitness (
  id             text primary key default gen_random_uuid()::text,
  jamaah_id      text not null references public.jamaah(id) on delete cascade,
  target_langkah integer,
  jalan_kaki     integer,
  aerobik        integer,
  kekuatan       integer,
  pernafasan     integer,
  catatan        text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_pre_hajj_fitness_jamaah on public.pre_hajj_fitness(jamaah_id);

create table if not exists public.pre_hajj_education (
  id                     text primary key default gen_random_uuid()::text,
  jamaah_id              text not null unique references public.jamaah(id) on delete cascade,
  diet                   boolean not null default false,
  aktivitas              boolean not null default false,
  obat                   boolean not null default false,
  hidrasi                boolean not null default false,
  istirahat              boolean not null default false,
  manajemen_kronis       boolean not null default false,
  persiapan_perjalanan   boolean not null default false,
  catatan                text,
  updated_at             timestamptz not null default now()
);
create index if not exists idx_pre_hajj_education_jamaah on public.pre_hajj_education(jamaah_id);

create table if not exists public.pre_hajj_ai_assessment (
  id                  text primary key default gen_random_uuid()::text,
  jamaah_id           text not null references public.jamaah(id) on delete cascade,
  ringkasan           text not null,
  faktor_risiko       text not null default '[]',
  kesiapan_berangkat  text not null,
  rekomendasi         text not null default '[]',
  soap                text,
  resume_medis        text,
  surat_rujukan       text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_pre_hajj_ai_assessment_jamaah on public.pre_hajj_ai_assessment(jamaah_id);

-- ============================================================================
-- 5. TELEMEDICINE
-- ============================================================================
create table if not exists public.chat_room (
  id               text primary key default gen_random_uuid()::text,
  jamaah_id        text not null unique references public.jamaah(id) on delete cascade,
  doctor_id        text not null default 'dokter-1',
  last_message_at  timestamptz not null default now(),
  unread_by_doctor integer not null default 0,
  unread_by_jamaah integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_chat_room_doctor on public.chat_room(doctor_id);

create table if not exists public.chat_message (
  id              text primary key default gen_random_uuid()::text,
  room_id         text not null references public.chat_room(id) on delete cascade,
  sender_type     text not null,
  sender_name     text,
  type            text not null,
  content         text not null,
  attachment_url  text,
  attachment_name text,
  request_id      text,
  read_by_doctor  boolean not null default false,
  read_by_jamaah  boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists idx_chat_message_room_created on public.chat_message(room_id, created_at);
create index if not exists idx_chat_message_sender        on public.chat_message(sender_type);

create table if not exists public.telemedicine_request (
  id            text primary key default gen_random_uuid()::text,
  room_id       text not null references public.chat_room(id) on delete cascade,
  jamaah_id     text not null references public.jamaah(id) on delete cascade,
  category      text not null,
  sub_type      text,
  title         text not null,
  fields        text not null default '[]',
  status        text not null default 'PENDING',
  scheduled_for timestamptz,
  submitted_at  timestamptz,
  response      text,
  skor          text,
  hari_ke       integer,
  created_at    timestamptz not null default now()
);
create index if not exists idx_telemedicine_request_jamaah_cat on public.telemedicine_request(jamaah_id, category);
create index if not exists idx_telemedicine_request_status    on public.telemedicine_request(status);

create table if not exists public.telemedicine_template (
  id          text primary key default gen_random_uuid()::text,
  title       text not null,
  category    text not null,
  content     text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.telemedicine_schedule (
  id          text primary key default gen_random_uuid()::text,
  jamaah_id   text not null references public.jamaah(id) on delete cascade,
  category    text not null,
  sub_type    text,
  title       text not null,
  hari_ke     integer,
  time_of_day text,
  active      boolean not null default true,
  last_sent_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_telemedicine_schedule_jamaah_active on public.telemedicine_schedule(jamaah_id, active);

create table if not exists public.telemedicine_ai_summary (
  id          text primary key default gen_random_uuid()::text,
  jamaah_id   text not null references public.jamaah(id) on delete cascade,
  room_id     text not null,
  ringkasan   text not null,
  soap        text,
  assessment  text,
  plan        text,
  prioritas   text,
  rekomendasi text,
  alerts      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_telemedicine_ai_summary_jamaah on public.telemedicine_ai_summary(jamaah_id);

-- ============================================================================
-- 6. updated_at TRIGGERS (auto-update on row change)
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_jamaah_updated on public.jamaah;
create trigger trg_jamaah_updated before update on public.jamaah
  for each row execute function public.set_updated_at();

drop trigger if exists trg_pre_hajj_chronic_updated on public.pre_hajj_chronic;
create trigger trg_pre_hajj_chronic_updated before update on public.pre_hajj_chronic
  for each row execute function public.set_updated_at();

drop trigger if exists trg_pre_hajj_education_updated on public.pre_hajj_education;
create trigger trg_pre_hajj_education_updated before update on public.pre_hajj_education
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
-- Policy model:
--   • doctors & admins  → full CRUD on all clinical/telemedicine tables
--   • jamaah (patient)  → read/update only their own linked data
--   • profiles          → each user reads/updates their own profile;
--                         doctors/admins read all profiles
-- ============================================================================

-- Helper: is the current user a doctor or admin?
create or replace function public.is_staff()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('doctor','admin')
  );
$$;

-- Helper: the current user's linked jamaah id (if they are a patient)
create or replace function public.current_jamaah_id()
returns text language sql security definer set search_path = public as $$
  select id from public.jamaah where user_id = auth.uid() limit 1;
$$;

-- ---------- PROFILES ----------
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own_or_staff on public.profiles;
create policy profiles_select_own_or_staff on public.profiles
  for select using (auth.uid() = id or public.is_staff());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

-- ---------- JAMAAH ----------
alter table public.jamaah enable row level security;
drop policy if exists jamaah_select on public.jamaah;
create policy jamaah_select on public.jamaah
  for select using (public.is_staff() or user_id = auth.uid());
drop policy if exists jamaah_insert on public.jamaah;
create policy jamaah_insert on public.jamaah
  for insert with check (public.is_staff() or user_id = auth.uid());
drop policy if exists jamaah_update on public.jamaah;
create policy jamaah_update on public.jamaah
  for update using (public.is_staff() or user_id = auth.uid());
drop policy if exists jamaah_delete on public.jamaah;
create policy jamaah_delete on public.jamaah
  for delete using (public.is_staff());

-- ---------- Generic policy applier for child tables ----------
-- Each child table: staff full access; patient read/insert on rows where
-- jamaah_id = current_jamaah_id().
--
-- We define explicit policies per table for clarity.

-- ---------- SCREENING ----------
alter table public.screening enable row level security;
drop policy if exists screening_select on public.screening;
create policy screening_select on public.screening
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists screening_insert on public.screening;
create policy screening_insert on public.screening
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists screening_update on public.screening;
create policy screening_update on public.screening
  for update using (public.is_staff());
drop policy if exists screening_delete on public.screening;
create policy screening_delete on public.screening
  for delete using (public.is_staff());

-- ---------- VITAL_SIGN ----------
alter table public.vital_sign enable row level security;
drop policy if exists vital_sign_select on public.vital_sign;
create policy vital_sign_select on public.vital_sign
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists vital_sign_insert on public.vital_sign;
create policy vital_sign_insert on public.vital_sign
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists vital_sign_update on public.vital_sign;
create policy vital_sign_update on public.vital_sign
  for update using (public.is_staff());
drop policy if exists vital_sign_delete on public.vital_sign;
create policy vital_sign_delete on public.vital_sign
  for delete using (public.is_staff());

-- ---------- PRE_HAJJ_VITAL ----------
alter table public.pre_hajj_vital enable row level security;
drop policy if exists phv_select on public.pre_hajj_vital;
create policy phv_select on public.pre_hajj_vital
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phv_insert on public.pre_hajj_vital;
create policy phv_insert on public.pre_hajj_vital
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phv_update on public.pre_hajj_vital;
create policy phv_update on public.pre_hajj_vital
  for update using (public.is_staff());
drop policy if exists phv_delete on public.pre_hajj_vital;
create policy phv_delete on public.pre_hajj_vital
  for delete using (public.is_staff());

-- ---------- PRE_HAJJ_LAB ----------
alter table public.pre_hajj_lab enable row level security;
drop policy if exists phl_select on public.pre_hajj_lab;
create policy phl_select on public.pre_hajj_lab
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phl_insert on public.pre_hajj_lab;
create policy phl_insert on public.pre_hajj_lab
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phl_update on public.pre_hajj_lab;
create policy phl_update on public.pre_hajj_lab
  for update using (public.is_staff());
drop policy if exists phl_delete on public.pre_hajj_lab;
create policy phl_delete on public.pre_hajj_lab
  for delete using (public.is_staff());

-- ---------- PRE_HAJJ_CHRONIC ----------
alter table public.pre_hajj_chronic enable row level security;
drop policy if exists phc_select on public.pre_hajj_chronic;
create policy phc_select on public.pre_hajj_chronic
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phc_insert on public.pre_hajj_chronic;
create policy phc_insert on public.pre_hajj_chronic
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phc_update on public.pre_hajj_chronic;
create policy phc_update on public.pre_hajj_chronic
  for update using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phc_delete on public.pre_hajj_chronic;
create policy phc_delete on public.pre_hajj_chronic
  for delete using (public.is_staff());

-- ---------- PRE_HAJJ_SCREENING ----------
alter table public.pre_hajj_screening enable row level security;
drop policy if exists phs_select on public.pre_hajj_screening;
create policy phs_select on public.pre_hajj_screening
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phs_insert on public.pre_hajj_screening;
create policy phs_insert on public.pre_hajj_screening
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phs_update on public.pre_hajj_screening;
create policy phs_update on public.pre_hajj_screening
  for update using (public.is_staff());
drop policy if exists phs_delete on public.pre_hajj_screening;
create policy phs_delete on public.pre_hajj_screening
  for delete using (public.is_staff());

-- ---------- PRE_HAJJ_MEDICATION ----------
alter table public.pre_hajj_medication enable row level security;
drop policy if exists phm_select on public.pre_hajj_medication;
create policy phm_select on public.pre_hajj_medication
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phm_insert on public.pre_hajj_medication;
create policy phm_insert on public.pre_hajj_medication
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phm_update on public.pre_hajj_medication;
create policy phm_update on public.pre_hajj_medication
  for update using (public.is_staff());
drop policy if exists phm_delete on public.pre_hajj_medication;
create policy phm_delete on public.pre_hajj_medication
  for delete using (public.is_staff());

-- ---------- PRE_HAJJ_IMMUNIZATION ----------
alter table public.pre_hajj_immunization enable row level security;
drop policy if exists phi_select on public.pre_hajj_immunization;
create policy phi_select on public.pre_hajj_immunization
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phi_insert on public.pre_hajj_immunization;
create policy phi_insert on public.pre_hajj_immunization
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phi_update on public.pre_hajj_immunization;
create policy phi_update on public.pre_hajj_immunization
  for update using (public.is_staff());
drop policy if exists phi_delete on public.pre_hajj_immunization;
create policy phi_delete on public.pre_hajj_immunization
  for delete using (public.is_staff());

-- ---------- PRE_HAJJ_FITNESS ----------
alter table public.pre_hajj_fitness enable row level security;
drop policy if exists phf_select on public.pre_hajj_fitness;
create policy phf_select on public.pre_hajj_fitness
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phf_insert on public.pre_hajj_fitness;
create policy phf_insert on public.pre_hajj_fitness
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phf_update on public.pre_hajj_fitness;
create policy phf_update on public.pre_hajj_fitness
  for update using (public.is_staff());
drop policy if exists phf_delete on public.pre_hajj_fitness;
create policy phf_delete on public.pre_hajj_fitness
  for delete using (public.is_staff());

-- ---------- PRE_HAJJ_EDUCATION ----------
alter table public.pre_hajj_education enable row level security;
drop policy if exists phe_select on public.pre_hajj_education;
create policy phe_select on public.pre_hajj_education
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phe_insert on public.pre_hajj_education;
create policy phe_insert on public.pre_hajj_education
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phe_update on public.pre_hajj_education;
create policy phe_update on public.pre_hajj_education
  for update using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists phe_delete on public.pre_hajj_education;
create policy phe_delete on public.pre_hajj_education
  for delete using (public.is_staff());

-- ---------- PRE_HAJJ_AI_ASSESSMENT ----------
alter table public.pre_hajj_ai_assessment enable row level security;
drop policy if exists pha_select on public.pre_hajj_ai_assessment;
create policy pha_select on public.pre_hajj_ai_assessment
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists pha_insert on public.pre_hajj_ai_assessment;
create policy pha_insert on public.pre_hajj_ai_assessment
  for insert with check (public.is_staff());
drop policy if exists pha_update on public.pre_hajj_ai_assessment;
create policy pha_update on public.pre_hajj_ai_assessment
  for update using (public.is_staff());
drop policy if exists pha_delete on public.pre_hajj_ai_assessment;
create policy pha_delete on public.pre_hajj_ai_assessment
  for delete using (public.is_staff());

-- ---------- CHAT_ROOM ----------
alter table public.chat_room enable row level security;
drop policy if exists cr_select on public.chat_room;
create policy cr_select on public.chat_room
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists cr_insert on public.chat_room;
create policy cr_insert on public.chat_room
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists cr_update on public.chat_room;
create policy cr_update on public.chat_room
  for update using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists cr_delete on public.chat_room;
create policy cr_delete on public.chat_room
  for delete using (public.is_staff());

-- ---------- CHAT_MESSAGE ----------
alter table public.chat_message enable row level security;
drop policy if exists cm_select on public.chat_message;
create policy cm_select on public.chat_message
  for select using (
    public.is_staff() or
    exists (select 1 from public.chat_room where id = chat_message.room_id and jamaah_id = public.current_jamaah_id())
  );
drop policy if exists cm_insert on public.chat_message;
create policy cm_insert on public.chat_message
  for insert with check (
    public.is_staff() or
    exists (select 1 from public.chat_room where id = chat_message.room_id and jamaah_id = public.current_jamaah_id())
  );
drop policy if exists cm_update on public.chat_message;
create policy cm_update on public.chat_message
  for update using (public.is_staff());
drop policy if exists cm_delete on public.chat_message;
create policy cm_delete on public.chat_message
  for delete using (public.is_staff());

-- ---------- TELEMEDICINE_REQUEST ----------
alter table public.telemedicine_request enable row level security;
drop policy if exists tr_select on public.telemedicine_request;
create policy tr_select on public.telemedicine_request
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists tr_insert on public.telemedicine_request;
create policy tr_insert on public.telemedicine_request
  for insert with check (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists tr_update on public.telemedicine_request;
create policy tr_update on public.telemedicine_request
  for update using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists tr_delete on public.telemedicine_request;
create policy tr_delete on public.telemedicine_request
  for delete using (public.is_staff());

-- ---------- TELEMEDICINE_TEMPLATE ----------
alter table public.telemedicine_template enable row level security;
drop policy if exists tt_select on public.telemedicine_template;
create policy tt_select on public.telemedicine_template
  for select using (auth.uid() is not null);
drop policy if exists tt_insert on public.telemedicine_template;
create policy tt_insert on public.telemedicine_template
  for insert with check (public.is_staff());
drop policy if exists tt_update on public.telemedicine_template;
create policy tt_update on public.telemedicine_template
  for update using (public.is_staff());
drop policy if exists tt_delete on public.telemedicine_template;
create policy tt_delete on public.telemedicine_template
  for delete using (public.is_staff());

-- ---------- TELEMEDICINE_SCHEDULE ----------
alter table public.telemedicine_schedule enable row level security;
drop policy if exists ts_select on public.telemedicine_schedule;
create policy ts_select on public.telemedicine_schedule
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists ts_insert on public.telemedicine_schedule;
create policy ts_insert on public.telemedicine_schedule
  for insert with check (public.is_staff());
drop policy if exists ts_update on public.telemedicine_schedule;
create policy ts_update on public.telemedicine_schedule
  for update using (public.is_staff());
drop policy if exists ts_delete on public.telemedicine_schedule;
create policy ts_delete on public.telemedicine_schedule
  for delete using (public.is_staff());

-- ---------- TELEMEDICINE_AI_SUMMARY ----------
alter table public.telemedicine_ai_summary enable row level security;
drop policy if exists tas_select on public.telemedicine_ai_summary;
create policy tas_select on public.telemedicine_ai_summary
  for select using (public.is_staff() or jamaah_id = public.current_jamaah_id());
drop policy if exists tas_insert on public.telemedicine_ai_summary;
create policy tas_insert on public.telemedicine_ai_summary
  for insert with check (public.is_staff());
drop policy if exists tas_update on public.telemedicine_ai_summary;
create policy tas_update on public.telemedicine_ai_summary
  for update using (public.is_staff());
drop policy if exists tas_delete on public.telemedicine_ai_summary;
create policy tas_delete on public.telemedicine_ai_summary
  for delete using (public.is_staff());

-- ============================================================================
-- 8. SEED: default templates
-- ============================================================================
insert into public.telemedicine_template (title, category, content)
values
  ('Pengingat TTV Pagi', 'TEXT', 'Selamat pagi. Silakan isi tekanan darah, suhu, dan saturasi hari ini. Terima kasih.'),
  ('Pengingat Skrining PHQ-9', 'SKRINING', 'Mohon isi skrining PHQ-9 untuk evaluasi kesehatan mental Anda.'),
  ('Pengingat Minum Obat', 'TEXT', 'Jangan lupa minum obat pagi ini sesuai resep dokter.'),
  ('Cek Keluhan Harian', 'TEXT', 'Bagaimana kondisi Bapak/Ibu hari ini? Ada keluhan demam, batuk, atau sesak?')
on conflict do nothing;

-- ============================================================================
-- DONE. Verify with:
--   select tablename from pg_tables where schemaname='public' order by tablename;
--   select tablename, policyname, cmd from pg_policies where schemaname='public' order by tablename;
-- ============================================================================
