import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializePreHajjVital,
  serializePreHajjLab,
  serializePreHajjChronic,
  serializePreHajjScreening,
  serializePreHajjMedication,
  serializePreHajjImmunization,
  serializePreHajjFitness,
  serializePreHajjEducation,
  serializePreHajjAiAssessment,
} from "@/lib/serialize";
import type { PreHajjScreeningJenis } from "@/lib/pre-hajj-types";

// GET /api/jamaah/[id]/pre-haji/ai — LLM Pra-Haji Assessment (istithaah)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const j = await db.jamaah.findUnique({
    where: { id },
    include: {
      preHajjVitals: { orderBy: { createdAt: "desc" } },
      preHajjLabs: { orderBy: { createdAt: "desc" } },
      preHajjChronic: true,
      preHajjScreenings: { orderBy: { createdAt: "desc" } },
      preHajjMedications: { orderBy: { createdAt: "desc" } },
      preHajjImmunizations: { orderBy: { createdAt: "desc" } },
      preHajjFitness: { orderBy: { createdAt: "desc" } },
      preHajjEducation: true,
    },
  });
  if (!j)
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  // Serialize untuk dibaca LLM
  const latestVital = j.preHajjVitals[0]
    ? serializePreHajjVital(j.preHajjVitals[0])
    : null;
  const latestLab = j.preHajjLabs[0]
    ? serializePreHajjLab(j.preHajjLabs[0])
    : null;
  const chronic = j.preHajjChronic
    ? serializePreHajjChronic(j.preHajjChronic)
    : null;
  const medications = j.preHajjMedications.map(serializePreHajjMedication);
  const immunizations = j.preHajjImmunizations.map(serializePreHajjImmunization);
  const education = j.preHajjEducation
    ? serializePreHajjEducation(j.preHajjEducation)
    : null;
  const fitness = j.preHajjFitness.map(serializePreHajjFitness);

  // Latest screening skor per jenis
  const screenings = j.preHajjScreenings.map(serializePreHajjScreening);
  const latestScreening: Record<
    string,
    { jenis: PreHajjScreeningJenis; skor: string | null; createdAt: string }
  > = {};
  for (const s of screenings) {
    const ex = latestScreening[s.jenis];
    if (!ex || new Date(s.createdAt) > new Date(ex.createdAt)) {
      latestScreening[s.jenis] = {
        jenis: s.jenis,
        skor: s.skor,
        createdAt: s.createdAt,
      };
    }
  }

  // BMI dari latest vital
  let bmi: number | null = null;
  if (latestVital?.beratBadan != null && latestVital?.tinggiBadan != null && latestVital.tinggiBadan > 0) {
    const tbM = latestVital.tinggiBadan / 100;
    bmi = Number((latestVital.beratBadan / (tbM * tbM)).toFixed(1));
  }

  // Education completion count
  let educationCount = 0;
  if (education) {
    educationCount = [
      education.diet,
      education.aktivitas,
      education.obat,
      education.hidrasi,
      education.istirahat,
      education.manajemenKronis,
      education.persiapanPerjalanan,
    ].filter(Boolean).length;
  }

  const ringkasanKlinis = {
    identitas: {
      nama: j.nama,
      usia: j.usia,
      kelamin: j.kelamin,
      kloter: j.kloter,
      puskesmas: j.puskesmas,
      dokterKeluarga: j.dokterKeluarga,
      statusIstithaah: j.statusIstithaah ?? "Belum Dinilai",
      golDarah: j.golDarah ?? null,
      riwayatPenyakit: j.riwayatPenyakit ?? null,
      riwayatOperasi: j.riwayatOperasi ?? null,
      alergi: j.alergi ?? null,
      obatRutin: j.obatRutin ?? null,
    },
    chronic,
    tandaVitalTerbaru: latestVital
      ? {
          TD: `${latestVital.tdSistolik ?? "-"}/${latestVital.tdDiastolik ?? "-"}`,
          nadi: latestVital.nadi,
          rr: latestVital.rr,
          suhu: latestVital.suhu,
          spo2: latestVital.spo2,
          beratBadan: latestVital.beratBadan,
          tinggiBadan: latestVital.tinggiBadan,
          lingkarPerut: latestVital.lingkarPerut,
          bmi,
        }
      : null,
    labTerbaru: latestLab,
    hasilSkrining: Object.values(latestScreening),
    obat: medications,
    imunisasi: immunizations.map((i) => ({
      jenis: i.jenis,
      tanggalVaksin: i.tanggalVaksin,
      nomorBatch: i.nomorBatch,
    })),
    kebugaran: fitness[0] ?? null,
    edukasi: education
      ? { selesai: educationCount, total: 7, detail: education }
      : null,
  };

  const systemPrompt =
    "Anda adalah dokter keluarga senior penilai istithaah jamaah haji. Analisis data pra haji dan berikan penilaian kesiapan berangkat. Jawab HANYA JSON valid.";

  const userPrompt = `Analisis data pra haji jamaah berikut dan berikan penilaian istithaah (kesiapan berangkat). Data klinis (JSON):

${JSON.stringify(ringkasanKlinis, null, 2)}

Berikan respons dalam format JSON PERSIS seperti ini:
{
  "ringkasan": "Ringkasan kondisi jamaah pra haji (3-5 kalimat) mencakup status kronis, tanda vital, lab, skrining, edukasi & imunisasi.",
  "faktorRisiko": ["faktor risiko 1", "faktor risiko 2"],
  "kesiapanBerangkat": "Siap" | "Bersyarat" | "Belum Siap",
  "rekomendasi": [
    { "kategori": "Medis|Kronis|Mental|Nutrisi|Aktivitas|Imunisasi|Edukasi|Rujukan", "tindakan": "...", "urutan": 1 }
  ],
  "soap": "Catatan SOAP lengkap (Subjective, Objective, Assessment, Plan).",
  "resumeMedis": "Resume medis ringkas untuk arus dokter keluarga.",
  "suratRujukan": "Isi surat rujukan jika perlu, atau null jika tidak perlu."
}

Pertimbangkan: kestabilan penyakit kronis (hipertensi, diabetes, jantung, PPOK, CKD), hasil lab (Hb, gula darah, HbA1c, kolesterol, kreatinin, eGFR), BMI & lingkar perut, hasil skrining (FRAIL, MNA, Mini-Cog, Morse, Barthel, PHQ-9, GAD-7, APGAR, IPAQ, WHOQOL), kelengkapan imunisasi (Meningitis wajib), dan checklist edukasi. Gunakan bahasa Indonesia medis.`;

  const fallbackRingkasan = `Penilaian AI tidak tersedia. Status istithaah: ${j.statusIstithaah ?? "Belum Dinilai"}.`;

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

    let parsed: {
      ringkasan?: string;
      faktorRisiko?: unknown;
      kesiapanBerangkat?: string;
      rekomendasi?: unknown;
      soap?: string | null;
      resumeMedis?: string | null;
      suratRujukan?: string | null;
    } = {};
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    try {
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const ringkasan =
      typeof parsed.ringkasan === "string" && parsed.ringkasan.trim()
        ? parsed.ringkasan
        : fallbackRingkasan;
    const faktorRisiko = Array.isArray(parsed.faktorRisiko)
      ? parsed.faktorRisiko.map(String)
      : [];
    const kesiapanBerangkat =
      parsed.kesiapanBerangkat === "Siap" ||
      parsed.kesiapanBerangkat === "Bersyarat" ||
      parsed.kesiapanBerangkat === "Belum Siap"
        ? parsed.kesiapanBerangkat
        : "Belum Siap";
    const rekomendasi = Array.isArray(parsed.rekomendasi)
      ? parsed.rekomendasi
          .map((r: Record<string, unknown>) => ({
            kategori: String(r?.kategori ?? ""),
            tindakan: String(r?.tindakan ?? ""),
            urutan: Number(r?.urutan ?? 0),
          }))
      : [];
    const soap = typeof parsed.soap === "string" ? parsed.soap : null;
    const resumeMedis =
      typeof parsed.resumeMedis === "string" ? parsed.resumeMedis : null;
    const suratRujukan =
      typeof parsed.suratRujukan === "string" ? parsed.suratRujukan : null;

    const created = await db.preHajjAiAssessment.create({
      data: {
        jamaahId: id,
        ringkasan,
        faktorRisiko: JSON.stringify(faktorRisiko),
        kesiapanBerangkat,
        rekomendasi: JSON.stringify(rekomendasi),
        soap,
        resumeMedis,
        suratRujukan,
      },
    });

    return NextResponse.json({
      assessment: serializePreHajjAiAssessment(created),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memanggil AI";
    const created = await db.preHajjAiAssessment.create({
      data: {
        jamaahId: id,
        ringkasan: fallbackRingkasan,
        faktorRisiko: JSON.stringify([]),
        kesiapanBerangkat: "Belum Siap",
        rekomendasi: JSON.stringify([]),
        soap: null,
        resumeMedis: null,
        suratRujukan: null,
      },
    });
    return NextResponse.json(
      {
        assessment: serializePreHajjAiAssessment(created),
        error: msg,
      },
      { status: 200 }
    );
  }
}
