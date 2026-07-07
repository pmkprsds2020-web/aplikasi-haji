import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
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

// GET /api/ai/cohort — analisis AI seluruh kloter/wilayah kerja Puskesmas
export async function GET(_req: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Fetch all jamaah + screenings + vitals in parallel
    const [jRes, scrRes, vitRes] = await Promise.all([
      supabase.from("jamaah").select("*"),
      supabase.from("screening").select("*"),
      supabase.from("vital_sign").select("*"),
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

    const jamaahRows = jRes.data ?? [];
    const screeningRows = scrRes.data ?? [];
    const vitalRows = vitRes.data ?? [];

    // Index screenings & vitals by jamaah_id
    const scrByJamaah: Record<string, any[]> = {};
    for (const s of screeningRows) {
      const arr = scrByJamaah[s.jamaah_id] ?? [];
      arr.push(s);
      scrByJamaah[s.jamaah_id] = arr;
    }
    const vitByJamaah: Record<string, any[]> = {};
    for (const v of vitalRows) {
      const arr = vitByJamaah[v.jamaah_id] ?? [];
      arr.push(v);
      vitByJamaah[v.jamaah_id] = arr;
    }

    const cohort = jamaahRows.map((j: any) => {
      const screenings = (scrByJamaah[j.id] ?? []).map(mapScreening);
      const vitals = (vitByJamaah[j.id] ?? []).map(mapVital);
      const detail: JamaahDetail = {
        ...mapJamaah(j),
        screenings,
        vitalSigns: vitals,
        pascaHajjLabs: [],
      };
      const risk = computeRiskForJamaah(detail);

      // Ambil skor skrining terbaru per jenis
      const latest: Record<string, string | null> = {};
      for (const s of screenings) {
        if (latest[s.jenis] === undefined) latest[s.jenis] = s.skor;
      }

      const tibaMs = j.tanggal_tiba
        ? new Date(j.tanggal_tiba).getTime()
        : Date.now();
      return {
        nama: j.nama,
        usia: Number(j.usia),
        kelamin: j.kelamin,
        kloter: j.kloter,
        puskesmas: j.puskesmas,
        tibaHariKe: Math.max(0, Math.floor((Date.now() - tibaMs) / 86400000)),
        levelRisiko: risk.level,
        ringkasanRisiko: risk.summary,
        flagUtama: risk.flags.slice(0, 3).map((f) => f.detail),
        skorSkrining: latest,
      };
    });

    const statistik = {
      total: cohort.length,
      merah: cohort.filter((c) => c.levelRisiko === "MERAH").length,
      kuning: cohort.filter((c) => c.levelRisiko === "KUNING").length,
      hijau: cohort.filter((c) => c.levelRisiko === "HIJAU").length,
    };

    const systemPrompt = `Anda adalah dokter keluarga senior & epidemiolog yang memimpin program monitoring pasca kepulangan jamaah haji tingkat Puskesmas. Anda menganalisis data agregat kloter dan memberikan rekomendasi kesehatan masyarakat. Jawab HANYA dengan JSON valid tanpa teks tambahan.`;

    const userPrompt = `Analisis cohort jamaah haji pasca kepulangan berikut. Statistik: ${JSON.stringify(statistik)}. Data per jamaah (ringkas):

${JSON.stringify(cohort, null, 2)}

Berikan respons dalam format JSON PERSIS seperti ini:
{
  "ringkasanWilayah": "Gambaran umum kondisi kesehatan kloter/wilayah kerja Puskesmas dalam 3-4 kalimat.",
  "temuanUtama": ["temuan epidemiologis/klinis penting 1", "..."],
  "daftarPrioritasHomeVisit": [
    { "nama": "...", "alasan": "...", "urgensi": "URGENT|TINGGI|SEDANG" }
  ],
  "suspekInfeksiSaluranNapas": ["nama jamaah yang perlu investigasi ISPA/pneumonia/MERS"],
  "rekomendasiProgram": [
    { "program": "nama program/skrining", "target": "siapa", "aksi": "apa" }
  ],
  "peringatanDini": ["peringatan dini kasus/sistem"]
}

Urutkan daftarPrioritasHomeVisit dari yang paling mendesak. Gunakan bahasa Indonesia.`;

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
      let parsed: Record<string, unknown> = {};
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      try {
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
      } catch {
        parsed = {
          ringkasanWilayah: raw,
          daftarPrioritasHomeVisit: [],
          rekomendasiProgram: [],
        };
      }
      return NextResponse.json({ statistik, cohort, analisis: parsed, raw });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memanggil AI";
      // Fallback: susun prioritas home visit berdasarkan risiko (tanpa AI)
      const prioritas = cohort
        .filter((c) => c.levelRisiko !== "HIJAU")
        .sort((a, b) => (a.levelRisiko === "MERAH" ? -1 : 1))
        .map((c) => ({
          nama: c.nama,
          alasan: c.ringkasanRisiko,
          urgensi: c.levelRisiko === "MERAH" ? "URGENT" : "TINGGI",
        }));
      return NextResponse.json({
        statistik,
        cohort,
        analisis: {
          ringkasanWilayah: `Dari ${statistik.total} jamaah, ${statistik.merah} berisiko tinggi, ${statistik.kuning} perlu pemantauan, ${statistik.hijau} stabil. Monitoring berkelanjutan diperlukan terutama untuk deteksi dini penyakit menular.`,
          temuanUtama: [],
          daftarPrioritasHomeVisit: prioritas,
          suspekInfeksiSaluranNapas: [],
          rekomendasiProgram: [],
          peringatanDini: [],
        },
        error: msg,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat analisis cohort";
    // Always return safe shape { statistik, cohort, analisis }
    return NextResponse.json({
      statistik: { total: 0, merah: 0, kuning: 0, hijau: 0 },
      cohort: [],
      analisis: {
        ringkasanWilayah: "Analisis AI tidak tersedia saat ini.",
        temuanUtama: [],
        daftarPrioritasHomeVisit: [],
        suspekInfeksiSaluranNapas: [],
        rekomendasiProgram: [],
        peringatanDini: [],
      },
      error: msg,
    });
  }
}
