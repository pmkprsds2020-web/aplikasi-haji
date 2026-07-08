"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";

// ============================================================================
// useSupabaseJamaahDetail — loads jamaah + ALL clinical data from Supabase
// ----------------------------------------------------------------------------
// Replaces the Prisma API routes (/api/jamaah/[id], /api/jamaah/[id]/pre-haji)
// with direct Supabase queries. After any INSERT, call refresh() to reload
// everything from Supabase — the UI always reflects the actual database state.
// ============================================================================

export interface SupabaseJamaah {
  id: string;
  user_id: string | null;
  doctor_id: string | null;
  nama: string;
  nik: string;
  kloter: string;
  porsi: string;
  usia: number;
  kelamin: string;
  alamat: string;
  hp: string;
  kontak_keluarga: string;
  tanggal_tiba: string;
  bandara: string;
  kabupaten_kota: string;
  puskesmas: string;
  dokter_keluarga: string;
  paspor: string | null;
  embarkasi: string | null;
  gol_darah: string | null;
  riwayat_penyakit: string | null;
  riwayat_operasi: string | null;
  alergi: string | null;
  obat_rutin: string | null;
  status_istithaah: string | null;
  tanggal_berangkat: string | null;
  tanggal_pulang: string | null;
  risk_level: string;
  risk_summary: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseScreening {
  id: string;
  jamaah_id: string;
  jenis: string;
  data: string;
  skor: string | null;
  catatan: string | null;
  hari_ke: number;
  created_at: string;
}

export interface SupabaseVitalSign {
  id: string;
  jamaah_id: string;
  td_sistolik: number | null;
  td_diastolik: number | null;
  nadi: number | null;
  rr: number | null;
  suhu: number | null;
  spo2: number | null;
  berat_badan: number | null;
  gula_darah: number | null;
  hari_ke: number;
  catatan: string | null;
  created_at: string;
}

export interface SupabasePascaLab {
  id: string;
  jamaah_id: string;
  hb: number | null;
  leukosit: number | null;
  gdp: number | null;
  gd2pp: number | null;
  hba1c: number | null;
  kolesterol: number | null;
  ldl: number | null;
  hdl: number | null;
  trigliserida: number | null;
  sgot: number | null;
  sgpt: number | null;
  ureum: number | null;
  kreatinin: number | null;
  catatan: string | null;
  created_at: string;
}

export interface SupabasePreHajjVital {
  id: string;
  jamaah_id: string;
  td_sistolik: number | null;
  td_diastolik: number | null;
  nadi: number | null;
  rr: number | null;
  suhu: number | null;
  spo2: number | null;
  berat_badan: number | null;
  tinggi_badan: number | null;
  lingkar_perut: number | null;
  catatan: string | null;
  created_at: string;
}

export interface SupabasePreHajjLab {
  id: string;
  jamaah_id: string;
  hb: number | null;
  gdp: number | null;
  gd2pp: number | null;
  hba1c: number | null;
  kolesterol: number | null;
  hdl: number | null;
  ldl: number | null;
  trigliserida: number | null;
  asam_urat: number | null;
  sgot: number | null;
  sgpt: number | null;
  kreatinin: number | null;
  egfr: number | null;
  urinalisis: string | null;
  catatan: string | null;
  created_at: string;
}

export interface SupabasePreHajjChronic {
  id: string;
  jamaah_id: string;
  hipertensi: string;
  diabetes: string;
  ppok: string;
  ckd: string;
  jantung: string;
  stroke: string;
  kanker: string;
  obat_rutin: string | null;
  target_terapi: string | null;
  updated_at: string;
}

export interface SupabasePreHajjScreening {
  id: string;
  jamaah_id: string;
  jenis: string;
  data: string;
  skor: string | null;
  catatan: string | null;
  created_at: string;
}

export interface SupabasePreHajjMedication {
  id: string;
  jamaah_id: string;
  nama_obat: string;
  dosis: string | null;
  frekuensi: string | null;
  indikasi: string | null;
  catatan: string | null;
  created_at: string;
}

export interface SupabasePreHajjImmunization {
  id: string;
  jamaah_id: string;
  jenis: string;
  tanggal_vaksin: string | null;
  nomor_batch: string | null;
  catatan: string | null;
  created_at: string;
}

export interface SupabasePreHajjFitness {
  id: string;
  jamaah_id: string;
  target_langkah: number | null;
  jalan_kaki: number | null;
  aerobik: number | null;
  kekuatan: number | null;
  pernafasan: number | null;
  catatan: string | null;
  created_at: string;
}

export interface SupabasePreHajjEducation {
  id: string;
  jamaah_id: string;
  diet: boolean;
  aktivitas: boolean;
  obat: boolean;
  hidrasi: boolean;
  istirahat: boolean;
  manajemen_kronis: boolean;
  persiapan_perjalanan: boolean;
  catatan: string | null;
  updated_at: string;
}

export interface SupabaseJamaahDetail extends SupabaseJamaah {
  screenings: SupabaseScreening[];
  vital_signs: SupabaseVitalSign[];
  pasca_hajj_labs: SupabasePascaLab[];
  pre_hajj_vitals: SupabasePreHajjVital[];
  pre_hajj_labs: SupabasePreHajjLab[];
  pre_hajj_chronic: SupabasePreHajjChronic | null;
  pre_hajj_screenings: SupabasePreHajjScreening[];
  pre_hajj_medications: SupabasePreHajjMedication[];
  pre_hajj_immunizations: SupabasePreHajjImmunization[];
  pre_hajj_fitness: SupabasePreHajjFitness[];
  pre_hajj_education: SupabasePreHajjEducation | null;
}

const TABLES = [
  { key: "screenings", table: "screening" },
  { key: "vital_signs", table: "vital_sign" },
  { key: "pasca_hajj_labs", table: "pasca_hajj_lab" },
  { key: "pre_hajj_vitals", table: "pre_hajj_vital" },
  { key: "pre_hajj_labs", table: "pre_hajj_lab" },
  { key: "pre_hajj_screenings", table: "pre_hajj_screening" },
  { key: "pre_hajj_medications", table: "pre_hajj_medication" },
  { key: "pre_hajj_immunizations", table: "pre_hajj_immunization" },
  { key: "pre_hajj_fitness", table: "pre_hajj_fitness" },
] as const;

export function useSupabaseJamaahDetail(jamaahId: string | null) {
  const supabase = React.useMemo(() => createClient(), []);
  const [detail, setDetail] = React.useState<SupabaseJamaahDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = React.useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  React.useEffect(() => {
    if (!jamaahId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    (async () => {

      // 1. Load jamaah
      const { data: j, error: jErr } = await supabase
        .from("jamaah")
        .select("*")
        .eq("id", jamaahId)
        .maybeSingle();

      if (jErr || !j) {
        console.error("[useSupabaseJamaahDetail] Failed to load jamaah:", jErr);
        if (active) {
          setDetail(null);
          setLoading(false);
        }
        return;
      }

      // 2. Load all child tables in parallel
      const childResults = await Promise.all(
        TABLES.map(async ({ key, table }) => {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .eq("jamaah_id", jamaahId)
            .order("created_at", { ascending: false });
          if (error) {
            console.error(`[useSupabaseJamaahDetail] Failed to load ${table}:`, error);
          }
          return { key, data: data ?? [] };
        })
      );

      // 3. Load single-record tables (chronic, education)
      const { data: chronic } = await supabase
        .from("pre_hajj_chronic")
        .select("*")
        .eq("jamaah_id", jamaahId)
        .maybeSingle();

      const { data: education } = await supabase
        .from("pre_hajj_education")
        .select("*")
        .eq("jamaah_id", jamaahId)
        .maybeSingle();

      if (!active) return;

      // 4. Assemble detail object
      const detailObj: SupabaseJamaahDetail = {
        ...j,
      } as SupabaseJamaahDetail;

      for (const { key, data } of childResults) {
        (detailObj as Record<string, unknown>)[key] = data;
      }
      detailObj.pre_hajj_chronic = chronic as SupabasePreHajjChronic | null;
      detailObj.pre_hajj_education = education as SupabasePreHajjEducation | null;

      setDetail(detailObj);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [jamaahId, supabase, refreshKey]);

  return { detail, loading, refresh };
}
