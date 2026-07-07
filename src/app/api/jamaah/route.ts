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
    email: j.email ?? null,
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
  return {
    id: v.id,
    jamaahId: v.jamaah_id,
    tdSistolik: v.td_sistolik !== null && v.td_sistolik !== undefined ? Number(v.td_sistolik) : null,
    tdDiastolik: v.td_diastolik !== null && v.td_diastolik !== undefined ? Number(v.td_diastolik) : null,
    nadi: v.nadi !== null && v.nadi !== undefined ? Number(v.nadi) : null,
    rr: v.rr !== null && v.rr !== undefined ? Number(v.rr) : null,
    suhu: v.suhu !== null && v.suhu !== undefined ? Number(v.suhu) : null,
    spo2: v.spo2 !== null && v.spo2 !== undefined ? Number(v.spo2) : null,
    beratBadan: v.berat_badan !== null && v.berat_badan !== undefined ? Number(v.berat_badan) : null,
    gulaDarah: v.gula_darah !== null && v.gula_darah !== undefined ? Number(v.gula_darah) : null,
    hariKe: Number(v.hari_ke) || 0,
    catatan: v.catatan ?? null,
    createdAt: v.created_at,
  };
}

// GET /api/jamaah — daftar ringkas semua jamaah
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const risk = req.nextUrl.searchParams.get("risk"); // HIJAU|KUNING|MERAH
    const puskesmas = req.nextUrl.searchParams.get("puskesmas");

    let query = supabase.from("jamaah").select("*");
    if (q) {
      query = query.or(
        `nama.ilike.%${q}%,nik.ilike.%${q}%,kloter.ilike.%${q}%,porsi.ilike.%${q}%`
      );
    }
    if (risk) query = query.eq("risk_level", risk);
    if (puskesmas) query = query.eq("puskesmas", puskesmas);
    // Risk: MERAH > KUNING > HIJAU (desc alphabetical), then newest arrival first
    query = query
      .order("risk_level", { ascending: false })
      .order("tanggal_tiba", { ascending: false });

    const { data: list, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = list ?? [];
    const ids = rows.map((r: any) => r.id);

    // Hitung ringkasan skrining per jamaah (distinct jenis)
    const counts: Record<string, Set<string>> = {};
    if (ids.length) {
      const { data: screenings, error: sErr } = await supabase
        .from("screening")
        .select("jamaah_id, jenis")
        .in("jamaah_id", ids);
      if (sErr) {
        return NextResponse.json({ error: sErr.message }, { status: 500 });
      }
      for (const s of screenings ?? []) {
        counts[s.jamaah_id] ??= new Set();
        counts[s.jamaah_id].add(s.jenis);
      }
    }

    return NextResponse.json({
      jamaah: rows.map((j: any) => ({
        ...mapJamaah(j),
        screeningCount: counts[j.id]?.size ?? 0,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat daftar jamaah";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/jamaah — tambah jamaah baru
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const required = [
      "nama",
      "nik",
      "kloter",
      "porsi",
      "usia",
      "kelamin",
      "tanggalTiba",
    ];
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === "") {
        return NextResponse.json(
          { error: `Field ${f} wajib diisi` },
          { status: 400 }
        );
      }
    }

    const insertRow: Record<string, unknown> = {
      nama: body.nama,
      nik: body.nik,
      kloter: body.kloter,
      porsi: body.porsi,
      usia: Number(body.usia),
      kelamin: body.kelamin,
      alamat: body.alamat ?? "",
      hp: body.hp ?? "",
      kontak_keluarga: body.kontakKeluarga ?? "",
      tanggal_tiba: body.tanggalTiba
        ? new Date(body.tanggalTiba).toISOString()
        : null,
      bandara: body.bandara ?? "",
      kabupaten_kota: body.kabupatenKota ?? "",
      puskesmas: body.puskesmas ?? "",
      dokter_keluarga: body.dokterKeluarga ?? "",
      paspor: body.paspor ?? null,
      embarkasi: body.embarkasi ?? null,
      gol_darah: body.golDarah ?? null,
      riwayat_penyakit: body.riwayatPenyakit ?? null,
      riwayat_operasi: body.riwayatOperasi ?? null,
      alergi: body.alergi ?? null,
      obat_rutin: body.obatRutin ?? null,
      status_istithaah: body.statusIstithaah ?? "Belum Dinilai",
      tanggal_berangkat: body.tanggalBerangkat
        ? new Date(body.tanggalBerangkat).toISOString()
        : null,
      tanggal_pulang: body.tanggalPulang
        ? new Date(body.tanggalPulang).toISOString()
        : null,
      risk_level: "HIJAU",
      risk_summary: "Tidak ada keluhan, kondisi stabil.",
    };

    const { data: created, error } = await supabase
      .from("jamaah")
      .insert(insertRow)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Recompute risk (no screenings/vitals yet → HIJAU, but keep behavior parity)
    try {
      const [scrRes, vitRes] = await Promise.all([
        supabase.from("screening").select("*").eq("jamaah_id", created.id),
        supabase.from("vital_sign").select("*").eq("jamaah_id", created.id),
      ]);
      const detail: JamaahDetail = {
        ...mapJamaah(created),
        screenings: (scrRes.data ?? []).map(mapScreening),
        vitalSigns: (vitRes.data ?? []).map(mapVital),
        pascaHajjLabs: [],
      };
      const result = computeRiskForJamaah(detail);
      const { error: updErr } = await supabase
        .from("jamaah")
        .update({ risk_level: result.level, risk_summary: result.summary })
        .eq("id", created.id);
      if (!updErr) {
        created.risk_level = result.level;
        created.risk_summary = result.summary;
      }
    } catch {
      // ignore risk recompute errors
    }

    return NextResponse.json({ jamaah: mapJamaah(created) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal membuat jamaah";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
