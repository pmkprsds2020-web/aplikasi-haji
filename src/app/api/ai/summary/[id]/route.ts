import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeRiskForJamaah } from "@/lib/risk";
import { SCREENING_META } from "@/lib/screening-meta";
import type {
  JamaahData,
  JamaahDetail,
  ScreeningData,
  VitalSignData,
  RiskLevel,
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

// GET /api/ai/summary/[id] — analisis AI kondisi & rekomendasi tindak lanjut per jamaah
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const [jRes, scrRes, vitRes] = await Promise.all([
      supabase.from("jamaah").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("screening")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("vital_sign")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (jRes.error) {
      return NextResponse.json(
        {
          levelRisiko: "HIJAU",
          ringkasanKlinis: null,
          analisis: {
            ringkasan: "Data jamaah tidak dapat dimuat: " + jRes.error.message,
            prioritas: "RUTIN",
            rekomendasi: [],
            perluHomeVisit: false,
            alasanHomeVisit: "",
          },
          error: jRes.error.message,
        },
        { status: 200 }
      );
    }
    if (scrRes.error || vitRes.error) {
      const msg = scrRes.error?.message ?? vitRes.error?.message ?? "DB error";
      return NextResponse.json(
        {
          levelRisiko: "HIJAU",
          ringkasanKlinis: null,
          analisis: {
            ringkasan: "Data klinis tidak dapat dimuat: " + msg,
            prioritas: "RUTIN",
            rekomendasi: [],
            perluHomeVisit: false,
            alasanHomeVisit: "",
          },
          error: msg,
        },
        { status: 200 }
      );
    }

    // Never return 404 — fallback safe shape
    if (!jRes.data) {
      return NextResponse.json({
        levelRisiko: "HIJAU",
        ringkasanKlinis: null,
        analisis: {
          ringkasan: "Jamaah tidak ditemukan. Tidak ada data untuk dianalisis.",
          prioritas: "RUTIN",
          rekomendasi: [],
          perluHomeVisit: false,
          alasanHomeVisit: "",
        },
      });
    }

    const j = jRes.data;
    const screenings = (scrRes.data ?? []).map(mapScreening);
    const vitals = (vitRes.data ?? []).map(mapVital);
    const detail: JamaahDetail = {
      ...mapJamaah(j),
      screenings,
      vitalSigns: vitals,
      pascaHajjLabs: [],
    };
    const risk = computeRiskForJamaah(detail);

    // Ambil skrining terbaru per jenis
    const latest: Record<string, (typeof screenings)[number]> = {};
    for (const s of screenings) {
      const ex = latest[s.jenis];
      if (!ex || new Date(s.createdAt) > new Date(ex.createdAt))
        latest[s.jenis] = s;
    }
    const latestVital = vitals[0] ?? null;

    const ringkasanKlinis = {
      identitas: {
        nama: j.nama,
        usia: Number(j.usia),
        kelamin: j.kelamin,
        kloter: j.kloter,
        puskesmas: j.puskesmas,
        dokterKeluarga: j.dokter_keluarga,
        tiba: j.tanggal_tiba ? String(j.tanggal_tiba).slice(0, 10) : null,
      },
      tandaVitalTerbaru: latestVital
        ? {
            hariKe: latestVital.hariKe,
            TD: `${latestVital.tdSistolik ?? "-"}/${latestVital.tdDiastolik ?? "-"}`,
            nadi: latestVital.nadi,
            RR: latestVital.rr,
            suhu: latestVital.suhu,
            SpO2: latestVital.spo2,
            gulaDarah: latestVital.gulaDarah,
            beratBadan: latestVital.beratBadan,
          }
        : null,
      hasilSkrining: Object.entries(latest).map(([jenis, s]) => ({
        modul:
          SCREENING_META[jenis as keyof typeof SCREENING_META]?.judul ?? jenis,
        skor: s.skor,
        data: s.data,
        hariKe: s.hariKe,
        catatan: s.catatan,
      })),
      flagRisiko: risk.flags,
      levelRisiko: risk.level,
    };

    const systemPrompt = `Anda adalah dokter keluarga senior yang ahli dalam monitoring pasca kepulangan jamaah haji dengan pendekatan Biopsikososial Spiritual Kedokteran Keluarga. Anda menganalisis data klinis jamaah dan memberikan ringkasan kondisi serta rekomendasi tindak lanjut berdasarkan pedoman Kementerian Kesehatan Republik Indonesia. Jawab HANYA dengan JSON valid tanpa teks tambahan.`;

    const userPrompt = `Analisis jamaah haji berikut dan berikan rekomendasi. Data klinis (JSON):

${JSON.stringify(ringkasanKlinis, null, 2)}

Berikan respons dalam format JSON PERSIS seperti ini:
{
  "ringkasan": "Ringkasan kondisi jamaah dalam 3-5 kalimat mencakup dimensi biologis, psikologis, sosial, spiritual.",
  "prioritas": "URGENT" | "TINGGI" | "SEDANG" | "RUTIN",
  "diagnosisSementara": ["..."],
  "rekomendasi": [
    { "kategori": "Medis|Kronis|Mental|Nutrisi|Aktivitas|Spiritual|Keluarga|Rujukan", "tindakan": "...", "urutan": 1 }
  ],
  "jadwalKontrol": "Rekomendasi jadwal kontrol/tindak lanjut (hari ke-)",
  "perluHomeVisit": true|false,
  "alasanHomeVisit": "..."
}

Fokus pada deteksi dini penyakit menular pasca haji (ISPA, pneumonia, COVID-19, MERS-CoV), stabilitas penyakit kronis, frailty lansia, kesehatan mental, dukungan keluarga, dan spiritual. Gunakan bahasa Indonesia medis yang jelas.`;

    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        thinking: { type: "disabled" },
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      // Ekstrak JSON dari respons
      let parsed: Record<string, unknown> = {};
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      try {
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
      } catch {
        parsed = {
          ringkasan: raw,
          prioritas: "SEDANG",
          rekomendasi: [],
          perluHomeVisit: false,
        };
      }
      return NextResponse.json({
        levelRisiko: risk.level,
        ringkasanKlinis,
        analisis: parsed,
        raw,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memanggil AI";
      return NextResponse.json(
        {
          levelRisiko: risk.level as RiskLevel,
          ringkasanKlinis,
          analisis: {
            ringkasan:
              "Analisis AI tidak tersedia saat ini. " + risk.summary,
            prioritas:
              risk.level === "MERAH"
                ? "URGENT"
                : risk.level === "KUNING"
                ? "SEDANG"
                : "RUTIN",
            rekomendasi: [],
            perluHomeVisit: risk.level === "MERAH",
            alasanHomeVisit:
              risk.level === "MERAH" ? "Risiko tinggi terdeteksi" : "",
          },
          error: msg,
        },
        { status: 200 }
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat analisis AI";
    // Always return 200 with safe fallback — never 404
    return NextResponse.json({
      levelRisiko: "HIJAU",
      ringkasanKlinis: null,
      analisis: {
        ringkasan: "Analisis AI tidak tersedia: " + msg,
        prioritas: "RUTIN",
        rekomendasi: [],
        perluHomeVisit: false,
        alasanHomeVisit: "",
      },
      error: msg,
    });
  }
}
