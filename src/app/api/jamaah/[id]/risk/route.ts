import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeRiskForJamaah } from "@/lib/risk";
import type {
  JamaahData,
  JamaahDetail,
  ScreeningData,
  VitalSignData,
} from "@/lib/types";

// ===== Snake_case (Supabase) → camelCase (client) mappers =====

function mapJamaah(j: any): JamaahData {
  return {
    id: j.id,
    nama: j.nama,
    nik: j.nik,
    kloter: j.kloter,
    porsi: j.porsi,
    usia: Number(j.usia),
    kelamin: j.kelamin as "L" | "P",
    alamat: j.alamat ?? "",
    hp: j.hp ?? "",
    kontakKeluarga: j.kontak_keluarga ?? "",
    tanggalTiba: j.tanggal_tiba,
    bandara: j.bandara ?? "",
    kabupatenKota: j.kabupaten_kota ?? "",
    puskesmas: j.puskesmas ?? "",
    dokterKeluarga: j.dokter_keluarga ?? "",
    paspor: j.paspor ?? null,
    embarkasi: j.embarkasi ?? null,
    golDarah: j.gol_darah ?? null,
    riwayatPenyakit: j.riwayat_penyakit ?? null,
    riwayatOperasi: j.riwayat_operasi ?? null,
    alergi: j.alergi ?? null,
    obatRutin: j.obat_rutin ?? null,
    statusIstithaah: j.status_istithaah ?? null,
    tanggalBerangkat: j.tanggal_berangkat ?? null,
    tanggalPulang: j.tanggal_pulang ?? null,
    riskLevel: j.risk_level as JamaahData["riskLevel"],
    riskSummary: j.risk_summary ?? "",
    createdAt: j.created_at,
    updatedAt: j.updated_at,
  };
}

function mapScreening(s: any): ScreeningData {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = s.data ? JSON.parse(s.data) : {};
  } catch {
    parsed = {};
  }
  return {
    id: s.id,
    jamaahId: s.jamaah_id,
    jenis: s.jenis as ScreeningData["jenis"],
    data: parsed,
    skor: s.skor ?? null,
    catatan: s.catatan ?? null,
    hariKe: Number(s.hari_ke) || 0,
    createdAt: s.created_at,
  };
}

function mapVital(v: any): VitalSignData {
  const num = (x: unknown) =>
    x === null || x === undefined ? null : Number(x);
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
    gulaDarah: num(v.gula_darah),
    hariKe: Number(v.hari_ke) || 0,
    catatan: v.catatan ?? null,
    createdAt: v.created_at,
  };
}

// GET /api/jamaah/[id]/risk — hitung ulang & kembalikan flag risiko detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const [jRes, scrRes, vitRes] = await Promise.all([
      supabase.from("jamaah").select("*").eq("id", id).maybeSingle(),
      supabase.from("screening").select("*").eq("jamaah_id", id),
      supabase.from("vital_sign").select("*").eq("jamaah_id", id),
    ]);

    if (jRes.error) {
      return NextResponse.json({ error: jRes.error.message }, { status: 500 });
    }
    if (scrRes.error) {
      return NextResponse.json({ error: scrRes.error.message }, { status: 500 });
    }
    if (vitRes.error) {
      return NextResponse.json({ error: vitRes.error.message }, { status: 500 });
    }

    if (!jRes.data) {
      // Never return 404 — return a safe fallback
      return NextResponse.json({
        level: "HIJAU",
        summary: "Jamaah tidak ditemukan — tidak ada data risiko.",
        flags: [],
      });
    }

    const detail: JamaahDetail = {
      ...mapJamaah(jRes.data),
      screenings: (scrRes.data ?? []).map(mapScreening),
      vitalSigns: (vitRes.data ?? []).map(mapVital),
      pascaHajjLabs: [],
    };

    const result = computeRiskForJamaah(detail);

    // Simpan risk terbaru ke Supabase
    const { error: updErr } = await supabase
      .from("jamaah")
      .update({
        risk_level: result.level,
        risk_summary: result.summary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghitung risiko";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
