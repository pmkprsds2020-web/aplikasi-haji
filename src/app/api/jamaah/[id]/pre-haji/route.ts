import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  PreHajjBundle,
  PreHajjVitalData,
  PreHajjLabData,
  PreHajjChronicData,
  PreHajjScreeningData,
  PreHajjScreeningJenis,
  PreHajjMedicationData,
  PreHajjImmunizationData,
  PreHajjFitnessData,
  PreHajjEducationData,
  PreHajjAiAssessmentData,
} from "@/lib/pre-hajj-types";

// ===== Mappers =====

const num = (x: unknown): number | null =>
  x === null || x === undefined ? null : Number(x);

function mapVital(v: any): PreHajjVitalData {
  return {
    id: v.id,
    jamaahId: v.jamaah_id,
    tdSistolik: num(v.td_sistolik),
    tdDiastolik: num(v.td_diastolik),
    nadi: num(v.nadi),
    rr: num(v.rr),
    suhu: num(v.suhu),
    spo2: num(v.spo2),
    beratBadan: num(v.berat_badan),
    tinggiBadan: num(v.tinggi_badan),
    lingkarPerut: num(v.lingkar_perut),
    catatan: v.catatan ?? null,
    createdAt: v.created_at,
  };
}

function mapLab(l: any): PreHajjLabData {
  return {
    id: l.id,
    jamaahId: l.jamaah_id,
    hb: num(l.hb),
    gdp: num(l.gdp),
    gd2pp: num(l.gd2pp),
    hba1c: num(l.hba1c),
    kolesterol: num(l.kolesterol),
    hdl: num(l.hdl),
    ldl: num(l.ldl),
    trigliserida: num(l.trigliserida),
    asamUrat: num(l.asam_urat),
    sgot: num(l.sgot),
    sgpt: num(l.sgpt),
    kreatinin: num(l.kreatinin),
    egfr: num(l.egfr),
    urinalisis: l.urinalisis ?? null,
    catatan: l.catatan ?? null,
    createdAt: l.created_at,
  };
}

function mapChronic(c: any): PreHajjChronicData {
  return {
    id: c.id,
    jamaahId: c.jamaah_id,
    hipertensi: c.hipertensi,
    diabetes: c.diabetes,
    ppok: c.ppok,
    ckd: c.ckd,
    jantung: c.jantung,
    stroke: c.stroke,
    kanker: c.kanker,
    obatRutin: c.obat_rutin ?? null,
    targetTerapi: c.target_terapi ?? null,
  };
}

function mapScreening(s: any): PreHajjScreeningData {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = s.data ? JSON.parse(s.data) : {};
  } catch {
    parsed = {};
  }
  return {
    id: s.id,
    jamaahId: s.jamaah_id,
    jenis: s.jenis as PreHajjScreeningJenis,
    data: parsed,
    skor: s.skor ?? null,
    catatan: s.catatan ?? null,
    createdAt: s.created_at,
  };
}

function mapMedication(m: any): PreHajjMedicationData {
  return {
    id: m.id,
    jamaahId: m.jamaah_id,
    namaObat: m.nama_obat,
    dosis: m.dosis ?? null,
    frekuensi: m.frekuensi ?? null,
    indikasi: m.indikasi ?? null,
    catatan: m.catatan ?? null,
    createdAt: m.created_at,
  };
}

function mapImmunization(i: any): PreHajjImmunizationData {
  return {
    id: i.id,
    jamaahId: i.jamaah_id,
    jenis: i.jenis,
    tanggalVaksin: i.tanggal_vaksin ?? null,
    nomorBatch: i.nomor_batch ?? null,
    catatan: i.catatan ?? null,
    createdAt: i.created_at,
  };
}

function mapFitness(f: any): PreHajjFitnessData {
  return {
    id: f.id,
    jamaahId: f.jamaah_id,
    targetLangkah: num(f.target_langkah),
    jalanKaki: num(f.jalan_kaki),
    aerobik: num(f.aerobik),
    kekuatan: num(f.kekuatan),
    pernafasan: num(f.pernafasan),
    catatan: f.catatan ?? null,
    createdAt: f.created_at,
  };
}

function mapEducation(e: any): PreHajjEducationData {
  return {
    id: e.id,
    jamaahId: e.jamaah_id,
    diet: Boolean(e.diet),
    aktivitas: Boolean(e.aktivitas),
    obat: Boolean(e.obat),
    hidrasi: Boolean(e.hidrasi),
    istirahat: Boolean(e.istirahat),
    manajemenKronis: Boolean(e.manajemen_kronis),
    persiapanPerjalanan: Boolean(e.persiapan_perjalanan),
    catatan: e.catatan ?? null,
  };
}

function mapAiAssessment(a: any): PreHajjAiAssessmentData {
  let faktor: string[] = [];
  try {
    const p = a.faktor_risiko ? JSON.parse(a.faktor_risiko) : [];
    if (Array.isArray(p)) faktor = p.map(String);
  } catch {
    faktor = [];
  }
  let rekomendasi: Array<{ kategori: string; tindakan: string; urutan: number }> = [];
  try {
    const p = a.rekomendasi ? JSON.parse(a.rekomendasi) : [];
    if (Array.isArray(p)) {
      rekomendasi = p.map((r: Record<string, unknown>) => ({
        kategori: String(r?.kategori ?? ""),
        tindakan: String(r?.tindakan ?? ""),
        urutan: Number(r?.urutan ?? 0),
      }));
    }
  } catch {
    rekomendasi = [];
  }
  return {
    id: a.id,
    jamaahId: a.jamaah_id,
    ringkasan: a.ringkasan,
    faktorRisiko: faktor,
    kesiapanBerangkat: a.kesiapan_berangkat,
    rekomendasi,
    soap: a.soap ?? null,
    resumeMedis: a.resume_medis ?? null,
    suratRujukan: a.surat_rujukan ?? null,
    createdAt: a.created_at,
  };
}

// GET /api/jamaah/[id]/pre-haji — bundle semua data pra haji
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch jamaah + all 9 pre_hajj_* tables in parallel
    const [
      jRes,
      vitRes,
      labRes,
      chrRes,
      scrRes,
      medRes,
      immRes,
      fitRes,
      eduRes,
      aiRes,
    ] = await Promise.all([
      supabase.from("jamaah").select("id").eq("id", id).maybeSingle(),
      supabase
        .from("pre_hajj_vital")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pre_hajj_lab")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pre_hajj_chronic")
        .select("*")
        .eq("jamaah_id", id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("pre_hajj_screening")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pre_hajj_medication")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pre_hajj_immunization")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pre_hajj_fitness")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pre_hajj_education")
        .select("*")
        .eq("jamaah_id", id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("pre_hajj_ai_assessment")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
    ]);

    // Surface any DB error
    const errors = [
      jRes,
      vitRes,
      labRes,
      chrRes,
      scrRes,
      medRes,
      immRes,
      fitRes,
      eduRes,
      aiRes,
    ].filter((r: any) => r && r.error);
    if (errors.length) {
      const msg = (errors[0] as any).error.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Never 404 — return empty bundle if jamaah missing
    const bundle: PreHajjBundle = {
      vitals: (vitRes.data ?? []).map(mapVital),
      labs: (labRes.data ?? []).map(mapLab),
      chronic: chrRes.data ? mapChronic(chrRes.data) : null,
      screenings: (scrRes.data ?? []).map(mapScreening),
      medications: (medRes.data ?? []).map(mapMedication),
      immunizations: (immRes.data ?? []).map(mapImmunization),
      fitness: (fitRes.data ?? []).map(mapFitness),
      education: eduRes.data ? mapEducation(eduRes.data) : null,
      aiAssessments: (aiRes.data ?? []).map(mapAiAssessment),
    };

    return NextResponse.json({ bundle });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat data pra haji";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
