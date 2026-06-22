import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeJamaah,
  serializeScreening,
  serializeVital,
} from "@/lib/serialize";
import { computeRiskForJamaah } from "@/lib/risk";
import { SCREENING_META } from "@/lib/screening-meta";

// GET /api/ai/summary/[id] — analisis AI kondisi & rekomendasi tindak lanjut per jamaah
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const j = await db.jamaah.findUnique({
    where: { id },
    include: { screenings: true, vitalSigns: true },
  });
  if (!j) return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const screenings = j.screenings.map(serializeScreening);
  const vitals = j.vitalSigns.map(serializeVital);
  const detail = { ...serializeJamaah(j), screenings, vitalSigns: vitals };
  const risk = computeRiskForJamaah(detail);

  // Ambil skrining terbaru per jenis
  const latest: Record<string, typeof screenings[number]> = {};
  for (const s of screenings) {
    const ex = latest[s.jenis];
    if (!ex || new Date(s.createdAt) > new Date(ex.createdAt)) latest[s.jenis] = s;
  }
  const latestVital = vitals[0] ?? null;

  const ringkasanKlinis = {
    identitas: {
      nama: j.nama, usia: j.usia, kelamin: j.kelamin, kloter: j.kloter,
      puskesmas: j.puskesmas, dokterKeluarga: j.dokterKeluarga,
      tiba: j.tanggalTiba.toISOString().slice(0, 10),
    },
    tandaVitalTerbaru: latestVital
      ? {
          hariKe: latestVital.hariKe,
          TD: `${latestVital.tdSistolik ?? "-"}/${latestVital.tdDiastolik ?? "-"}`,
          nadi: latestVital.nadi, RR: latestVital.rr, suhu: latestVital.suhu,
          SpO2: latestVital.spo2, gulaDarah: latestVital.gulaDarah,
          beratBadan: latestVital.beratBadan,
        }
      : null,
    hasilSkrining: Object.entries(latest).map(([jenis, s]) => ({
      modul: SCREENING_META[jenis as keyof typeof SCREENING_META]?.judul ?? jenis,
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
      parsed = { ringkasan: raw, prioritas: "SEDANG", rekomendasi: [], perluHomeVisit: false };
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
        levelRisiko: risk.level,
        ringkasanKlinis,
        analisis: {
          ringkasan: "Analisis AI tidak tersedia saat ini. " + risk.summary,
          prioritas: risk.level === "MERAH" ? "URGENT" : risk.level === "KUNING" ? "SEDANG" : "RUTIN",
          rekomendasi: [],
          perluHomeVisit: risk.level === "MERAH",
          alasanHomeVisit: risk.level === "MERAH" ? "Risiko tinggi terdeteksi" : "",
        },
        error: msg,
      },
      { status: 200 }
    );
  }
}
