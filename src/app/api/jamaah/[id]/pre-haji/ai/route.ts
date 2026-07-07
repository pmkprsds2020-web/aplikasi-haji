import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ===== Row shapes (snake_case from Supabase) =====

interface JamaahRow {
  id: string;
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
  created_at: string;
  updated_at: string;
}

interface PreHajjVitalRow {
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

interface PreHajjLabRow {
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

interface PreHajjChronicRow {
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

interface PreHajjScreeningRow {
  id: string;
  jamaah_id: string;
  jenis: string;
  data: string;
  skor: string | null;
  catatan: string | null;
  created_at: string;
}

interface PreHajjMedicationRow {
  id: string;
  jamaah_id: string;
  nama_obat: string;
  dosis: string | null;
  frekuensi: string | null;
  indikasi: string | null;
  catatan: string | null;
  created_at: string;
}

interface PreHajjImmunizationRow {
  id: string;
  jamaah_id: string;
  jenis: string;
  tanggal_vaksin: string | null;
  nomor_batch: string | null;
  catatan: string | null;
  created_at: string;
}

interface PreHajjFitnessRow {
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

interface PreHajjEducationRow {
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

interface PreHajjAiAssessmentRow {
  id: string;
  jamaah_id: string;
  ringkasan: string;
  faktor_risiko: string;
  kesiapan_berangkat: string;
  rekomendasi: string;
  soap: string | null;
  resume_medis: string | null;
  surat_rujukan: string | null;
  created_at: string;
}

// ===== Inline serializers (snake_case → camelCase) =====

function serializeVital(v: PreHajjVitalRow) {
  return {
    id: v.id,
    jamaahId: v.jamaah_id,
    tdSistolik: v.td_sistolik,
    tdDiastolik: v.td_diastolik,
    nadi: v.nadi,
    rr: v.rr,
    suhu: v.suhu,
    spo2: v.spo2,
    beratBadan: v.berat_badan,
    tinggiBadan: v.tinggi_badan,
    lingkarPerut: v.lingkar_perut,
    catatan: v.catatan,
    createdAt: v.created_at,
  };
}

function serializeLab(l: PreHajjLabRow) {
  return {
    id: l.id,
    jamaahId: l.jamaah_id,
    hb: l.hb,
    gdp: l.gdp,
    gd2pp: l.gd2pp,
    hba1c: l.hba1c,
    kolesterol: l.kolesterol,
    hdl: l.hdl,
    ldl: l.ldl,
    trigliserida: l.trigliserida,
    asamUrat: l.asam_urat,
    sgot: l.sgot,
    sgpt: l.sgpt,
    kreatinin: l.kreatinin,
    egfr: l.egfr,
    urinalisis: l.urinalisis,
    catatan: l.catatan,
    createdAt: l.created_at,
  };
}

function serializeChronic(c: PreHajjChronicRow) {
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
    obatRutin: c.obat_rutin,
    targetTerapi: c.target_terapi,
  };
}

function serializeScreening(s: PreHajjScreeningRow) {
  let parsed: Record<string, unknown> = {};
  try {
    if (s.data) parsed = JSON.parse(s.data);
  } catch {
    parsed = {};
  }
  return {
    id: s.id,
    jamaahId: s.jamaah_id,
    jenis: s.jenis as any,
    data: parsed,
    skor: s.skor,
    catatan: s.catatan,
    createdAt: s.created_at,
  };
}

function serializeMedication(m: PreHajjMedicationRow) {
  return {
    id: m.id,
    jamaahId: m.jamaah_id,
    namaObat: m.nama_obat,
    dosis: m.dosis,
    frekuensi: m.frekuensi,
    indikasi: m.indikasi,
    catatan: m.catatan,
    createdAt: m.created_at,
  };
}

function serializeImmunization(i: PreHajjImmunizationRow) {
  return {
    id: i.id,
    jamaahId: i.jamaah_id,
    jenis: i.jenis,
    tanggalVaksin: i.tanggal_vaksin,
    nomorBatch: i.nomor_batch,
    catatan: i.catatan,
    createdAt: i.created_at,
  };
}

function serializeFitness(f: PreHajjFitnessRow) {
  return {
    id: f.id,
    jamaahId: f.jamaah_id,
    targetLangkah: f.target_langkah,
    jalanKaki: f.jalan_kaki,
    aerobik: f.aerobik,
    kekuatan: f.kekuatan,
    pernafasan: f.pernafasan,
    catatan: f.catatan,
    createdAt: f.created_at,
  };
}

function serializeEducation(e: PreHajjEducationRow) {
  return {
    id: e.id,
    jamaahId: e.jamaah_id,
    diet: e.diet,
    aktivitas: e.aktivitas,
    obat: e.obat,
    hidrasi: e.hidrasi,
    istirahat: e.istirahat,
    manajemenKronis: e.manajemen_kronis,
    persiapanPerjalanan: e.persiapan_perjalanan,
    catatan: e.catatan,
  };
}

function serializeAiAssessment(a: PreHajjAiAssessmentRow) {
  let faktorRisiko: string[] = [];
  try {
    const p = a.faktor_risiko ? JSON.parse(a.faktor_risiko) : [];
    if (Array.isArray(p)) faktorRisiko = p.map(String);
  } catch {
    faktorRisiko = [];
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
    faktorRisiko,
    kesiapanBerangkat: a.kesiapan_berangkat,
    rekomendasi,
    soap: a.soap,
    resumeMedis: a.resume_medis,
    suratRujukan: a.surat_rujukan,
    createdAt: a.created_at,
  };
}

// ===== Main handler =====

// GET /api/jamaah/[id]/pre-haji/ai — LLM Pra-Haji Assessment (istithaah)
// Always returns 200 with { assessment } — never 404.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    // Parallel fetches: jamaah + all pre_hajj_* tables
    const [
      jamaahRes,
      vitalRes,
      labRes,
      chronicRes,
      screeningRes,
      medicationRes,
      immunizationRes,
      fitnessRes,
      educationRes,
    ] = await Promise.all([
      supabase.from("jamaah").select("*").eq("id", id).maybeSingle(),
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
        .maybeSingle(),
    ]);

    if (jamaahRes.error) console.error("[pre-haji/ai] jamaah select error:", jamaahRes.error);
    if (vitalRes.error) console.error("[pre-haji/ai] vital select error:", vitalRes.error);
    if (labRes.error) console.error("[pre-haji/ai] lab select error:", labRes.error);
    if (chronicRes.error) console.error("[pre-haji/ai] chronic select error:", chronicRes.error);
    if (screeningRes.error) console.error("[pre-haji/ai] screening select error:", screeningRes.error);
    if (medicationRes.error) console.error("[pre-haji/ai] medication select error:", medicationRes.error);
    if (immunizationRes.error) console.error("[pre-haji/ai] immunization select error:", immunizationRes.error);
    if (fitnessRes.error) console.error("[pre-haji/ai] fitness select error:", fitnessRes.error);
    if (educationRes.error) console.error("[pre-haji/ai] education select error:", educationRes.error);

    const j = jamaahRes.data as JamaahRow | null;
    const vitalRows = (vitalRes.data ?? []) as PreHajjVitalRow[];
    const labRows = (labRes.data ?? []) as PreHajjLabRow[];
    const chronicRow = chronicRes.data as PreHajjChronicRow | null;
    const screeningRows = (screeningRes.data ?? []) as PreHajjScreeningRow[];
    const medicationRows = (medicationRes.data ?? []) as PreHajjMedicationRow[];
    const immunizationRows = (immunizationRes.data ?? []) as PreHajjImmunizationRow[];
    const fitnessRows = (fitnessRes.data ?? []) as PreHajjFitnessRow[];
    const educationRow = educationRes.data as PreHajjEducationRow | null;

    // Serialize untuk dibaca LLM
    const latestVital = vitalRows[0] ? serializeVital(vitalRows[0]) : null;
    const latestLab = labRows[0] ? serializeLab(labRows[0]) : null;
    const chronic = chronicRow ? serializeChronic(chronicRow) : null;
    const medications = medicationRows.map(serializeMedication);
    const immunizations = immunizationRows.map(serializeImmunization);
    const education = educationRow ? serializeEducation(educationRow) : null;
    const fitness = fitnessRows.map(serializeFitness);

    // Latest screening skor per jenis
    const screenings = screeningRows.map(serializeScreening);
    const latestScreening: Record<
      string,
      { jenis: string; skor: string | null; createdAt: string }
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
    if (
      latestVital?.beratBadan != null &&
      latestVital?.tinggiBadan != null &&
      latestVital.tinggiBadan > 0
    ) {
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
        nama: j?.nama ?? null,
        usia: j?.usia ?? null,
        kelamin: j?.kelamin ?? null,
        kloter: j?.kloter ?? null,
        puskesmas: j?.puskesmas ?? null,
        dokterKeluarga: j?.dokter_keluarga ?? null,
        statusIstithaah: j?.status_istithaah ?? "Belum Dinilai",
        golDarah: j?.gol_darah ?? null,
        riwayatPenyakit: j?.riwayat_penyakit ?? null,
        riwayatOperasi: j?.riwayat_operasi ?? null,
        alergi: j?.alergi ?? null,
        obatRutin: j?.obat_rutin ?? null,
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

    const fallbackRingkasan = `Penilaian AI tidak tersedia. Status istithaah: ${j?.status_istithaah ?? "Belum Dinilai"}.`;

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
        ? parsed.rekomendasi.map((r: Record<string, unknown>) => ({
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

      const { data: created, error: insErr } = await supabase
        .from("pre_hajj_ai_assessment")
        .insert({
          jamaah_id: id,
          ringkasan,
          faktor_risiko: JSON.stringify(faktorRisiko),
          kesiapan_berangkat: kesiapanBerangkat,
          rekomendasi: JSON.stringify(rekomendasi),
          soap,
          resume_medis: resumeMedis,
          surat_rujukan: suratRujukan,
        } as never)
        .select("*")
        .single();

      if (insErr || !created) {
        console.error("[pre-haji/ai] insert error:", insErr);
        // Return a safe in-memory fallback (still 200)
        const fallbackAssessment = {
          id: "fallback",
          jamaahId: id,
          ringkasan: fallbackRingkasan,
          faktorRisiko: [] as string[],
          kesiapanBerangkat: "Belum Siap",
          rekomendasi: [] as Array<{ kategori: string; tindakan: string; urutan: number }>,
          soap: null,
          resumeMedis: null,
          suratRujukan: null,
          createdAt: new Date().toISOString(),
        };
        return NextResponse.json(
          { assessment: fallbackAssessment, error: insErr?.message ?? "Gagal menyimpan" },
          { status: 200 }
        );
      }

      return NextResponse.json({
        assessment: serializeAiAssessment(created as PreHajjAiAssessmentRow),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memanggil AI";
      const { data: created, error: insErr } = await supabase
        .from("pre_hajj_ai_assessment")
        .insert({
          jamaah_id: id,
          ringkasan: fallbackRingkasan,
          faktor_risiko: JSON.stringify([]),
          kesiapan_berangkat: "Belum Siap",
          rekomendasi: JSON.stringify([]),
          soap: null,
          resume_medis: null,
          surat_rujukan: null,
        } as never)
        .select("*")
        .single();

      if (insErr || !created) {
        console.error("[pre-haji/ai] fallback insert error:", insErr);
        // Still return 200 with an in-memory fallback assessment
        const fallbackAssessment = {
          id: "fallback",
          jamaahId: id,
          ringkasan: fallbackRingkasan,
          faktorRisiko: [] as string[],
          kesiapanBerangkat: "Belum Siap",
          rekomendasi: [] as Array<{ kategori: string; tindakan: string; urutan: number }>,
          soap: null,
          resumeMedis: null,
          suratRujukan: null,
          createdAt: new Date().toISOString(),
        };
        return NextResponse.json(
          { assessment: fallbackAssessment, error: msg },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          assessment: serializeAiAssessment(created as PreHajjAiAssessmentRow),
          error: msg,
        },
        { status: 200 }
      );
    }
  } catch (e) {
    console.error("[pre-haji/ai] unhandled error:", e);
    // Always 200 — return a safe fallback assessment
    const fallbackAssessment = {
      id: "fallback",
      jamaahId: id,
      ringkasan: "Penilaian AI tidak tersedia.",
      faktorRisiko: [] as string[],
      kesiapanBerangkat: "Belum Siap",
      rekomendasi: [] as Array<{ kategori: string; tindakan: string; urutan: number }>,
      soap: null,
      resumeMedis: null,
      suratRujukan: null,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json(
      {
        assessment: fallbackAssessment,
        error: e instanceof Error ? e.message : "Internal error",
      },
      { status: 200 }
    );
  }
}
