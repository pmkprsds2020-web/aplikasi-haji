import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeJamaah,
  serializeScreening,
  serializeVital,
} from "@/lib/serialize";
import { computeRiskForJamaah } from "@/lib/risk";

// GET /api/ai/cohort — analisis AI seluruh kloter/wilayah kerja Puskesmas
export async function GET(_req: NextRequest) {
  const all = await db.jamaah.findMany({
    include: {
      screenings: { orderBy: { createdAt: "desc" } },
      vitalSigns: { orderBy: { createdAt: "desc" } },
    },
  });

  const cohort = all.map((j) => {
    const screenings = j.screenings.map(serializeScreening);
    const vitals = j.vitalSigns.map(serializeVital);
    const detail = { ...serializeJamaah(j), screenings, vitalSigns: vitals };
    const risk = computeRiskForJamaah(detail);
    // ambil skor skrining terbaru per jenis
    const latest: Record<string, string | null> = {};
    for (const s of screenings) {
      const ex = latest[s.jenis] !== undefined;
      if (!ex) latest[s.jenis] = s.skor;
    }
    return {
      nama: j.nama,
      usia: j.usia,
      kelamin: j.kelamin,
      kloter: j.kloter,
      puskesmas: j.puskesmas,
      tibaHariKe: Math.floor((Date.now() - j.tanggalTiba.getTime()) / 86400000),
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
      parsed = { ringkasanWilayah: raw, daftarPrioritasHomeVisit: [], rekomendasiProgram: [] };
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
}
