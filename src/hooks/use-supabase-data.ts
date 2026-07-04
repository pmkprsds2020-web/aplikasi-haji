"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";

// ============================================================================
// useSupabaseData — Supabase data-access hook (replaces Prisma API routes)
// ----------------------------------------------------------------------------
// All data is loaded from Supabase directly. RLS ensures users only see
// their own data. No Prisma, no local state as primary store.
//
// CRUD operations:
//   • loadJamaahList() — GET all jamaah (doctor sees assigned patients)
//   • loadJamaahDetail(id) — GET single jamaah + all related data
//   • createJamaah(data) — INSERT new jamaah
//   • updateJamaah(id, data) — UPDATE jamaah
//   • deleteJamaah(id) — DELETE jamaah (soft delete via is_active=false)
//   • createScreening(jamaahId, data) — INSERT screening
//   • createVitalSign(jamaahId, data) — INSERT vital sign
//   • createPascaLab(jamaahId, data) — INSERT pasca haji lab
//   • createPreHajjVital(jamaahId, data) — INSERT pre-hajj vital
//   • createPreHajjLab(jamaahId, data) — INSERT pre-hajj lab
//   • upsertPreHajjChronic(jamaahId, data) — UPSERT chronic
//   • createPreHajjScreening(jamaahId, data) — INSERT pre-hajj screening
//   • createPreHajjMedication(jamaahId, data) — INSERT medication
//   • deletePreHajjMedication(id) — DELETE medication
//   • createPreHajjImmunization(jamaahId, data) — INSERT immunization
//   • deletePreHajjImmunization(id) — DELETE immunization
//   • createPreHajjFitness(jamaahId, data) — INSERT fitness
//   • upsertPreHajjEducation(jamaahId, data) — UPSERT education
// ============================================================================

const supabase = createClient();

// ===== Types (snake_case from Supabase) =====
export interface JamaahRow {
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

export interface JamaahDetail extends JamaahRow {
  screenings: ScreeningRow[];
  vital_signs: VitalSignRow[];
  pasca_hajj_labs: PascaHajjLabRow[];
  pre_hajj_vitals: PreHajjVitalRow[];
  pre_hajj_labs: PreHajjLabRow[];
  pre_hajj_chronic: PreHajjChronicRow | null;
  pre_hajj_screenings: PreHajjScreeningRow[];
  pre_hajj_medications: PreHajjMedicationRow[];
  pre_hajj_immunizations: PreHajjImmunizationRow[];
  pre_hajj_fitness: PreHajjFitnessRow[];
  pre_hajj_education: PreHajjEducationRow | null;
}

export interface ScreeningRow {
  id: string; jamaah_id: string; jenis: string; data: string;
  skor: string | null; catatan: string | null; hari_ke: number; created_at: string;
}
export interface VitalSignRow {
  id: string; jamaah_id: string; td_sistolik: number | null; td_diastolik: number | null;
  nadi: number | null; rr: number | null; suhu: number | null; spo2: number | null;
  berat_badan: number | null; gula_darah: number | null; hari_ke: number;
  catatan: string | null; created_at: string;
}
export interface PascaHajjLabRow {
  id: string; jamaah_id: string; hb: number | null; leukosit: number | null;
  gdp: number | null; gd2pp: number | null; hba1c: number | null;
  kolesterol: number | null; ldl: number | null; hdl: number | null;
  trigliserida: number | null; sgot: number | null; sgpt: number | null;
  ureum: number | null; kreatinin: number | null; catatan: string | null; created_at: string;
}
export interface PreHajjVitalRow {
  id: string; jamaah_id: string; td_sistolik: number | null; td_diastolik: number | null;
  nadi: number | null; rr: number | null; suhu: number | null; spo2: number | null;
  berat_badan: number | null; tinggi_badan: number | null; lingkar_perut: number | null;
  catatan: string | null; created_at: string;
}
export interface PreHajjLabRow {
  id: string; jamaah_id: string; hb: number | null; gdp: number | null; gd2pp: number | null;
  hba1c: number | null; kolesterol: number | null; hdl: number | null; ldl: number | null;
  trigliserida: number | null; asam_urat: number | null; sgot: number | null; sgpt: number | null;
  kreatinin: number | null; egfr: number | null; urinalisis: string | null; catatan: string | null;
  created_at: string;
}
export interface PreHajjChronicRow {
  id: string; jamaah_id: string; hipertensi: string; diabetes: string; ppok: string;
  ckd: string; jantung: string; stroke: string; kanker: string;
  obat_rutin: string | null; target_terapi: string | null; updated_at: string;
}
export interface PreHajjScreeningRow {
  id: string; jamaah_id: string; jenis: string; data: string;
  skor: string | null; catatan: string | null; created_at: string;
}
export interface PreHajjMedicationRow {
  id: string; jamaah_id: string; nama_obat: string; dosis: string | null;
  frekuensi: string | null; indikasi: string | null; catatan: string | null; created_at: string;
}
export interface PreHajjImmunizationRow {
  id: string; jamaah_id: string; jenis: string; tanggal_vaksin: string | null;
  nomor_batch: string | null; catatan: string | null; created_at: string;
}
export interface PreHajjFitnessRow {
  id: string; jamaah_id: string; target_langkah: number | null; jalan_kaki: number | null;
  aerobik: number | null; kekuatan: number | null; pernafasan: number | null;
  catatan: string | null; created_at: string;
}
export interface PreHajjEducationRow {
  id: string; jamaah_id: string; diet: boolean; aktivitas: boolean; obat: boolean;
  hidrasi: boolean; istirahat: boolean; manajemen_kronis: boolean;
  persiapan_perjalanan: boolean; catatan: string | null; updated_at: string;
}

// ===== Helper: convert null/empty to null =====
function n(v: unknown): unknown {
  if (v === "" || v === undefined || v === null) return null;
  return v;
}
function num(v: unknown): number | null {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ===== Hook =====
export function useSupabaseData() {
  const { user } = useSupabaseAuth();

  // ===== LOAD: jamaah list =====
  const loadJamaahList = React.useCallback(async (search?: string, riskFilter?: string) => {
    let q = supabase.from("jamaah").select("*").eq("is_active", true).order("risk_level", { ascending: false }).order("tanggal_tiba", { ascending: false });
    if (search) {
      q = q.or(`nama.ilike.%${search}%,nik.ilike.%${search}%,kloter.ilike.%${search}%,porsi.ilike.%${search}%`);
    }
    if (riskFilter && riskFilter !== "ALL") {
      q = q.eq("risk_level", riskFilter);
    }
    const { data, error } = await q;
    if (error) { console.error("[supabase] loadJamaahList:", error); return []; }
    return (data ?? []) as JamaahRow[];
  }, []);

  // ===== LOAD: jamaah detail (all related data) =====
  const loadJamaahDetail = React.useCallback(async (id: string): Promise<JamaahDetail | null> => {
    console.log("[supabase] loadJamaahDetail:", id);
    const { data: j, error: jErr } = await supabase.from("jamaah").select("*").eq("id", id).maybeSingle();
    if (jErr || !j) { console.error("[supabase] loadJamaahDetail jamaah:", jErr); return null; }

    const [screenings, vitals, pascaLabs, preVitals, preLabs, preChronic, preScreenings, preMeds, preImmun, preFitness, preEdu] = await Promise.all([
      supabase.from("screening").select("*").eq("jamaah_id", id).order("created_at", { ascending: false }),
      supabase.from("vital_sign").select("*").eq("jamaah_id", id).order("created_at", { ascending: false }),
      supabase.from("pasca_hajj_lab").select("*").eq("jamaah_id", id).order("created_at", { ascending: false }),
      supabase.from("pre_hajj_vital").select("*").eq("jamaah_id", id).order("created_at", { ascending: false }),
      supabase.from("pre_hajj_lab").select("*").eq("jamaah_id", id).order("created_at", { ascending: false }),
      supabase.from("pre_hajj_chronic").select("*").eq("jamaah_id", id).maybeSingle(),
      supabase.from("pre_hajj_screening").select("*").eq("jamaah_id", id).order("created_at", { ascending: false }),
      supabase.from("pre_hajj_medication").select("*").eq("jamaah_id", id).order("created_at", { ascending: false }),
      supabase.from("pre_hajj_immunization").select("*").eq("jamaah_id", id).order("created_at", { ascending: false }),
      supabase.from("pre_hajj_fitness").select("*").eq("jamaah_id", id).order("created_at", { ascending: false }),
      supabase.from("pre_hajj_education").select("*").eq("jamaah_id", id).maybeSingle(),
    ]);

    return {
      ...j,
      screenings: (screenings.data ?? []) as ScreeningRow[],
      vital_signs: (vitals.data ?? []) as VitalSignRow[],
      pasca_hajj_labs: (pascaLabs.data ?? []) as PascaHajjLabRow[],
      pre_hajj_vitals: (preVitals.data ?? []) as PreHajjVitalRow[],
      pre_hajj_labs: (preLabs.data ?? []) as PreHajjLabRow[],
      pre_hajj_chronic: (preChronic.data ?? null) as PreHajjChronicRow | null,
      pre_hajj_screenings: (preScreenings.data ?? []) as PreHajjScreeningRow[],
      pre_hajj_medications: (preMeds.data ?? []) as PreHajjMedicationRow[],
      pre_hajj_immunizations: (preImmun.data ?? []) as PreHajjImmunizationRow[],
      pre_hajj_fitness: (preFitness.data ?? []) as PreHajjFitnessRow[],
      pre_hajj_education: (preEdu.data ?? null) as PreHajjEducationRow | null,
    } as JamaahDetail;
  }, []);

  // ===== CREATE: jamaah =====
  const createJamaah = React.useCallback(async (data: Record<string, unknown>): Promise<JamaahRow | null> => {
    const { data: row, error } = await supabase.from("jamaah").insert({
      nama: data.nama, nik: data.nik, kloter: data.kloter, porsi: data.porsi,
      usia: num(data.usia), kelamin: data.kelamin, alamat: data.alamat ?? "",
      hp: data.hp ?? "", kontak_keluarga: data.kontakKeluarga ?? "",
      tanggal_tiba: data.tanggalTiba, bandara: data.bandara ?? "",
      kabupaten_kota: data.kabupatenKota ?? "", puskesmas: data.puskesmas ?? "",
      dokter_keluarga: data.dokterKeluarga ?? "", doctor_id: user?.id ?? null,
      paspor: n(data.paspor), embarkasi: n(data.embarkasi), gol_darah: n(data.golDarah),
      riwayat_penyakit: n(data.riwayatPenyakit), riwayat_operasi: n(data.riwayatOperasi),
      alergi: n(data.alergi), obat_rutin: n(data.obatRutin),
      status_istithaah: data.statusIstithaah ?? "Belum Dinilai",
      tanggal_berangkat: n(data.tanggalBerangkat), tanggal_pulang: n(data.tanggalPulang),
    }).select("*").single();
    if (error) { console.error("[supabase] createJamaah:", error); return null; }
    return row as JamaahRow;
  }, [user?.id]);

  // ===== UPDATE: jamaah =====
  const updateJamaah = React.useCallback(async (id: string, data: Record<string, unknown>): Promise<JamaahRow | null> => {
    const { data: row, error } = await supabase.from("jamaah").update({
      nama: data.nama, nik: data.nik, kloter: data.kloter, porsi: data.porsi,
      usia: num(data.usia), kelamin: data.kelamin, alamat: data.alamat,
      hp: data.hp, kontak_keluarga: data.kontakKeluarga,
      tanggal_tiba: data.tanggalTiba, bandara: data.bandara,
      kabupaten_kota: data.kabupatenKota, puskesmas: data.puskesmas,
      dokter_keluarga: data.dokterKeluarga,
      paspor: n(data.paspor), embarkasi: n(data.embarkasi), gol_darah: n(data.golDarah),
      riwayat_penyakit: n(data.riwayatPenyakit), riwayat_operasi: n(data.riwayatOperasi),
      alergi: n(data.alergi), obat_rutin: n(data.obatRutin),
      status_istithaah: data.statusIstithaah,
      tanggal_berangkat: n(data.tanggalBerangkat), tanggal_pulang: n(data.tanggalPulang),
      updated_at: new Date().toISOString(),
    }).eq("id", id).select("*").single();
    if (error) { console.error("[supabase] updateJamaah:", error); return null; }
    return row as JamaahRow;
  }, []);

  // ===== DELETE: jamaah (soft delete) =====
  const deleteJamaah = React.useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("jamaah").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { console.error("[supabase] deleteJamaah:", error); return false; }
    return true;
  }, []);

  // ===== CREATE: screening (pasca haji) =====
  const createScreening = React.useCallback(async (jamaahId: string, data: { jenis: string; data: Record<string, unknown>; skor: string; catatan?: string; hariKe: number }): Promise<ScreeningRow | null> => {
    const { data: row, error } = await supabase.from("screening").insert({
      jamaah_id: jamaahId, jenis: data.jenis, data: JSON.stringify(data.data),
      skor: data.skor, catatan: data.catatan ?? null, hari_ke: data.hariKe,
    }).select("*").single();
    if (error) { console.error("[supabase] createScreening:", error); return null; }
    return row as ScreeningRow;
  }, []);

  // ===== CREATE: vital sign (pasca haji) =====
  const createVitalSign = React.useCallback(async (jamaahId: string, data: Record<string, unknown>, hariKe: number): Promise<VitalSignRow | null> => {
    const { data: row, error } = await supabase.from("vital_sign").insert({
      jamaah_id: jamaahId,
      td_sistolik: num(data.tdSistolik), td_diastolik: num(data.tdDiastolik),
      nadi: num(data.nadi), rr: num(data.rr), suhu: num(data.suhu),
      spo2: num(data.spo2), berat_badan: num(data.beratBadan),
      gula_darah: num(data.gulaDarah), hari_ke: hariKe, catatan: n(data.catatan),
    }).select("*").single();
    if (error) { console.error("[supabase] createVitalSign:", error); return null; }
    return row as VitalSignRow;
  }, []);

  // ===== CREATE: pasca haji lab =====
  const createPascaLab = React.useCallback(async (jamaahId: string, data: Record<string, unknown>): Promise<PascaHajjLabRow | null> => {
    const { data: row, error } = await supabase.from("pasca_hajj_lab").insert({
      jamaah_id: jamaahId,
      hb: num(data.hb), leukosit: num(data.leukosit), gdp: num(data.gdp),
      gd2pp: num(data.gd2pp), hba1c: num(data.hba1c), kolesterol: num(data.kolesterol),
      ldl: num(data.ldl), hdl: num(data.hdl), trigliserida: num(data.trigliserida),
      sgot: num(data.sgot), sgpt: num(data.sgpt), ureum: num(data.ureum),
      kreatinin: num(data.kreatinin), catatan: n(data.catatan),
    }).select("*").single();
    if (error) { console.error("[supabase] createPascaLab:", error); return null; }
    return row as PascaHajjLabRow;
  }, []);

  // ===== CREATE: pre-hajj vital =====
  const createPreHajjVital = React.useCallback(async (jamaahId: string, data: Record<string, unknown>): Promise<PreHajjVitalRow | null> => {
    const { data: row, error } = await supabase.from("pre_hajj_vital").insert({
      jamaah_id: jamaahId,
      td_sistolik: num(data.tdSistolik), td_diastolik: num(data.tdDiastolik),
      nadi: num(data.nadi), rr: num(data.rr), suhu: num(data.suhu),
      spo2: num(data.spo2), berat_badan: num(data.beratBadan),
      tinggi_badan: num(data.tinggiBadan), lingkar_perut: num(data.lingkarPerut),
      catatan: n(data.catatan),
    }).select("*").single();
    if (error) { console.error("[supabase] createPreHajjVital:", error); return null; }
    return row as PreHajjVitalRow;
  }, []);

  // ===== CREATE: pre-hajj lab =====
  const createPreHajjLab = React.useCallback(async (jamaahId: string, data: Record<string, unknown>): Promise<PreHajjLabRow | null> => {
    const { data: row, error } = await supabase.from("pre_hajj_lab").insert({
      jamaah_id: jamaahId,
      hb: num(data.hb), gdp: num(data.gdp), gd2pp: num(data.gd2pp), hba1c: num(data.hba1c),
      kolesterol: num(data.kolesterol), hdl: num(data.hdl), ldl: num(data.ldl),
      trigliserida: num(data.trigliserida), asam_urat: num(data.asamUrat),
      sgot: num(data.sgot), sgpt: num(data.sgpt), kreatinin: num(data.kreatinin),
      egfr: num(data.egfr), urinalisis: n(data.urinalisis), catatan: n(data.catatan),
    }).select("*").single();
    if (error) { console.error("[supabase] createPreHajjLab:", error); return null; }
    return row as PreHajjLabRow;
  }, []);

  // ===== UPSERT: pre-hajj chronic =====
  const upsertPreHajjChronic = React.useCallback(async (jamaahId: string, data: Record<string, unknown>): Promise<PreHajjChronicRow | null> => {
    const payload = {
      jamaah_id: jamaahId,
      hipertensi: data.hipertensi ?? "Tidak", diabetes: data.diabetes ?? "Tidak",
      ppok: data.ppok ?? "Tidak", ckd: data.ckd ?? "Tidak",
      jantung: data.jantung ?? "Tidak", stroke: data.stroke ?? "Tidak",
      kanker: data.kanker ?? "Tidak", obat_rutin: n(data.obatRutin),
      target_terapi: n(data.targetTerapi), updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await supabase.from("pre_hajj_chronic").upsert(payload, { onConflict: "jamaah_id" }).select("*").single();
    if (error) { console.error("[supabase] upsertPreHajjChronic:", error); return null; }
    return row as PreHajjChronicRow;
  }, []);

  // ===== CREATE: pre-hajj screening =====
  const createPreHajjScreening = React.useCallback(async (jamaahId: string, data: { jenis: string; data: Record<string, unknown>; skor: string; catatan?: string }): Promise<PreHajjScreeningRow | null> => {
    const { data: row, error } = await supabase.from("pre_hajj_screening").insert({
      jamaah_id: jamaahId, jenis: data.jenis, data: JSON.stringify(data.data),
      skor: data.skor, catatan: data.catatan ?? null,
    }).select("*").single();
    if (error) { console.error("[supabase] createPreHajjScreening:", error); return null; }
    return row as PreHajjScreeningRow;
  }, []);

  // ===== CREATE: pre-hajj medication =====
  const createPreHajjMedication = React.useCallback(async (jamaahId: string, data: Record<string, unknown>): Promise<PreHajjMedicationRow | null> => {
    const { data: row, error } = await supabase.from("pre_hajj_medication").insert({
      jamaah_id: jamaahId, nama_obat: data.namaObat, dosis: n(data.dosis),
      frekuensi: n(data.frekuensi), indikasi: n(data.indikasi), catatan: n(data.catatan),
    }).select("*").single();
    if (error) { console.error("[supabase] createPreHajjMedication:", error); return null; }
    return row as PreHajjMedicationRow;
  }, []);

  // ===== DELETE: pre-hajj medication =====
  const deletePreHajjMedication = React.useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("pre_hajj_medication").delete().eq("id", id);
    if (error) { console.error("[supabase] deletePreHajjMedication:", error); return false; }
    return true;
  }, []);

  // ===== CREATE: pre-hajj immunization =====
  const createPreHajjImmunization = React.useCallback(async (jamaahId: string, data: Record<string, unknown>): Promise<PreHajjImmunizationRow | null> => {
    const { data: row, error } = await supabase.from("pre_hajj_immunization").insert({
      jamaah_id: jamaahId, jenis: data.jenis,
      tanggal_vaksin: n(data.tanggalVaksin), nomor_batch: n(data.nomorBatch), catatan: n(data.catatan),
    }).select("*").single();
    if (error) { console.error("[supabase] createPreHajjImmunization:", error); return null; }
    return row as PreHajjImmunizationRow;
  }, []);

  // ===== DELETE: pre-hajj immunization =====
  const deletePreHajjImmunization = React.useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("pre_hajj_immunization").delete().eq("id", id);
    if (error) { console.error("[supabase] deletePreHajjImmunization:", error); return false; }
    return true;
  }, []);

  // ===== CREATE: pre-hajj fitness =====
  const createPreHajjFitness = React.useCallback(async (jamaahId: string, data: Record<string, unknown>): Promise<PreHajjFitnessRow | null> => {
    const { data: row, error } = await supabase.from("pre_hajj_fitness").insert({
      jamaah_id: jamaahId, target_langkah: num(data.targetLangkah),
      jalan_kaki: num(data.jalanKaki), aerobik: num(data.aerobik),
      kekuatan: num(data.kekuatan), pernafasan: num(data.pernafasan), catatan: n(data.catatan),
    }).select("*").single();
    if (error) { console.error("[supabase] createPreHajjFitness:", error); return null; }
    return row as PreHajjFitnessRow;
  }, []);

  // ===== UPSERT: pre-hajj education =====
  const upsertPreHajjEducation = React.useCallback(async (jamaahId: string, data: Record<string, unknown>): Promise<PreHajjEducationRow | null> => {
    const payload = {
      jamaah_id: jamaahId,
      diet: !!data.diet, aktivitas: !!data.aktivitas, obat: !!data.obat,
      hidrasi: !!data.hidrasi, istirahat: !!data.istirahat,
      manajemen_kronis: !!data.manajemenKronis, persiapan_perjalanan: !!data.persiapanPerjalanan,
      catatan: n(data.catatan), updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await supabase.from("pre_hajj_education").upsert(payload, { onConflict: "jamaah_id" }).select("*").single();
    if (error) { console.error("[supabase] upsertPreHajjEducation:", error); return null; }
    return row as PreHajjEducationRow;
  }, []);

  // ===== LOAD: dashboard stats =====
  const loadDashboardStats = React.useCallback(async () => {
    const { data, error } = await supabase.from("jamaah").select("risk_level").eq("is_active", true);
    if (error) { console.error("[supabase] loadDashboardStats:", error); return { total: 0, merah: 0, kuning: 0, hijau: 0 }; }
    const rows = data ?? [];
    return {
      total: rows.length,
      merah: rows.filter((r: { risk_level: string }) => r.risk_level === "MERAH").length,
      kuning: rows.filter((r: { risk_level: string }) => r.risk_level === "KUNING").length,
      hijau: rows.filter((r: { risk_level: string }) => r.risk_level === "HIJAU").length,
    };
  }, []);

  return {
    // Load
    loadJamaahList,
    loadJamaahDetail,
    loadDashboardStats,
    // Create
    createJamaah,
    createScreening,
    createVitalSign,
    createPascaLab,
    createPreHajjVital,
    createPreHajjLab,
    createPreHajjScreening,
    createPreHajjMedication,
    createPreHajjImmunization,
    createPreHajjFitness,
    // Update
    updateJamaah,
    // Upsert
    upsertPreHajjChronic,
    upsertPreHajjEducation,
    // Delete
    deleteJamaah,
    deletePreHajjMedication,
    deletePreHajjImmunization,
  };
}
