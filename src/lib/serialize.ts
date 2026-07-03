import { db } from "./db";
import { computeRiskForJamaah } from "./risk";
import type { JamaahDetail, JamaahData, ScreeningData, VitalSignData } from "./types";
import type {
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
} from "./pre-hajj-types";
import type {
  ChatRoomData,
  ChatMessageData,
  ChatSenderType,
  ChatMessageType,
  TelemedicineRequestData,
  TelemedicineCategory,
  RequestStatus,
  FormField,
  TelemedicineTemplateData,
  TelemedicineScheduleData,
  TelemedicineAiSummaryData,
  AlertLevel,
} from "./telemedicine-types";

// Helper untuk konversi angka aman (SQLite/Prisma → number | null)
function num(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

// Serialisasi record Jamaah Prisma → bentuk client (dengan parse JSON data)
export function serializeJamaah(j: {
  id: string; nama: string; nik: string; kloter: string; porsi: string;
  usia: number; kelamin: string; alamat: string; hp: string; kontakKeluarga: string;
  tanggalTiba: Date; bandara: string; kabupatenKota: string; puskesmas: string;
  dokterKeluarga: string; riskLevel: string; riskSummary: string;
  paspor?: string | null; embarkasi?: string | null; golDarah?: string | null;
  riwayatPenyakit?: string | null; riwayatOperasi?: string | null; alergi?: string | null;
  obatRutin?: string | null; statusIstithaah?: string | null;
  tanggalBerangkat?: Date | null; tanggalPulang?: Date | null;
  createdAt: Date; updatedAt: Date;
}): JamaahData {
  return {
    id: j.id, nama: j.nama, nik: j.nik, kloter: j.kloter, porsi: j.porsi,
    usia: j.usia, kelamin: j.kelamin as "L" | "P", alamat: j.alamat, hp: j.hp,
    kontakKeluarga: j.kontakKeluarga, tanggalTiba: j.tanggalTiba.toISOString(),
    bandara: j.bandara, kabupatenKota: j.kabupatenKota, puskesmas: j.puskesmas,
    dokterKeluarga: j.dokterKeluarga, riskLevel: j.riskLevel as JamaahData["riskLevel"],
    riskSummary: j.riskSummary, createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
    paspor: j.paspor ?? null,
    embarkasi: j.embarkasi ?? null,
    golDarah: j.golDarah ?? null,
    riwayatPenyakit: j.riwayatPenyakit ?? null,
    riwayatOperasi: j.riwayatOperasi ?? null,
    alergi: j.alergi ?? null,
    obatRutin: j.obatRutin ?? null,
    statusIstithaah: j.statusIstithaah ?? null,
    tanggalBerangkat: j.tanggalBerangkat ? j.tanggalBerangkat.toISOString() : null,
    tanggalPulang: j.tanggalPulang ? j.tanggalPulang.toISOString() : null,
  };
}

export function serializeScreening(s: {
  id: string; jamaahId: string; jenis: string; data: string; skor: string | null;
  catatan: string | null; hariKe: number; createdAt: Date;
}): ScreeningData {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = s.data ? JSON.parse(s.data) : {};
  } catch {
    parsed = {};
  }
  return {
    id: s.id, jamaahId: s.jamaahId, jenis: s.jenis as ScreeningData["jenis"],
    data: parsed, skor: s.skor, catatan: s.catatan, hariKe: s.hariKe,
    createdAt: s.createdAt.toISOString(),
  };
}

export function serializeVital(v: {
  id: string; jamaahId: string; tdSistolik: number | null; tdDiastolik: number | null;
  nadi: number | null; rr: number | null; suhu: number | null; spo2: number | null;
  beratBadan: number | null; gulaDarah: number | null; hariKe: number;
  catatan: string | null; createdAt: Date;
}): VitalSignData {
  return {
    id: v.id, jamaahId: v.jamaahId, tdSistolik: v.tdSistolik, tdDiastolik: v.tdDiastolik,
    nadi: v.nadi, rr: v.rr, suhu: v.suhu, spo2: v.spo2, beratBadan: v.beratBadan,
    gulaDarah: v.gulaDarah, hariKe: v.hariKe, catatan: v.catatan,
    createdAt: v.createdAt.toISOString(),
  };
}

// Hitung ulang & simpan riskLevel + riskSummary jamaah
export async function recomputeAndSaveRisk(jamaahId: string): Promise<void> {
  const j = await db.jamaah.findUnique({
    where: { id: jamaahId },
    include: { screenings: true, vitalSigns: true },
  });
  if (!j) return;
  const detail: JamaahDetail = {
    ...serializeJamaah(j),
    screenings: j.screenings.map(serializeScreening),
    vitalSigns: j.vitalSigns.map(serializeVital),
  };
  const { level, summary } = computeRiskForJamaah(detail);
  await db.jamaah.update({
    where: { id: jamaahId },
    data: { riskLevel: level, riskSummary: summary },
  });
}

// ===== PRA HAJI SERIALIZERS =====

export function serializePreHajjVital(v: {
  id: string; jamaahId: string;
  tdSistolik: number | null; tdDiastolik: number | null;
  nadi: number | null; rr: number | null; suhu: number | null; spo2: number | null;
  beratBadan: number | null; tinggiBadan: number | null; lingkarPerut: number | null;
  catatan: string | null; createdAt: Date;
}): PreHajjVitalData {
  return {
    id: v.id, jamaahId: v.jamaahId,
    tdSistolik: num(v.tdSistolik), tdDiastolik: num(v.tdDiastolik),
    nadi: num(v.nadi), rr: num(v.rr), suhu: num(v.suhu), spo2: num(v.spo2),
    beratBadan: num(v.beratBadan), tinggiBadan: num(v.tinggiBadan),
    lingkarPerut: num(v.lingkarPerut),
    catatan: v.catatan, createdAt: v.createdAt.toISOString(),
  };
}

export function serializePreHajjLab(l: {
  id: string; jamaahId: string;
  hb: number | null; gdp: number | null; gd2pp: number | null; hba1c: number | null;
  kolesterol: number | null; hdl: number | null; ldl: number | null; trigliserida: number | null;
  asamUrat: number | null; sgot: number | null; sgpt: number | null; kreatinin: number | null;
  egfr: number | null; urinalisis: string | null; catatan: string | null; createdAt: Date;
}): PreHajjLabData {
  return {
    id: l.id, jamaahId: l.jamaahId,
    hb: num(l.hb), gdp: num(l.gdp), gd2pp: num(l.gd2pp), hba1c: num(l.hba1c),
    kolesterol: num(l.kolesterol), hdl: num(l.hdl), ldl: num(l.ldl), trigliserida: num(l.trigliserida),
    asamUrat: num(l.asamUrat), sgot: num(l.sgot), sgpt: num(l.sgpt), kreatinin: num(l.kreatinin),
    egfr: num(l.egfr),
    urinalisis: l.urinalisis, catatan: l.catatan, createdAt: l.createdAt.toISOString(),
  };
}

export function serializePreHajjChronic(c: {
  id: string; jamaahId: string;
  hipertensi: string; diabetes: string; ppok: string; ckd: string;
  jantung: string; stroke: string; kanker: string;
  obatRutin: string | null; targetTerapi: string | null;
}): PreHajjChronicData {
  return {
    id: c.id, jamaahId: c.jamaahId,
    hipertensi: c.hipertensi, diabetes: c.diabetes, ppok: c.ppok, ckd: c.ckd,
    jantung: c.jantung, stroke: c.stroke, kanker: c.kanker,
    obatRutin: c.obatRutin, targetTerapi: c.targetTerapi,
  };
}

export function serializePreHajjScreening(s: {
  id: string; jamaahId: string; jenis: string; data: string;
  skor: string | null; catatan: string | null; createdAt: Date;
}): PreHajjScreeningData {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = s.data ? JSON.parse(s.data) : {};
  } catch {
    parsed = {};
  }
  return {
    id: s.id, jamaahId: s.jamaahId,
    jenis: s.jenis as PreHajjScreeningJenis,
    data: parsed, skor: s.skor, catatan: s.catatan,
    createdAt: s.createdAt.toISOString(),
  };
}

export function serializePreHajjMedication(m: {
  id: string; jamaahId: string; namaObat: string;
  dosis: string | null; frekuensi: string | null; indikasi: string | null;
  catatan: string | null; createdAt: Date;
}): PreHajjMedicationData {
  return {
    id: m.id, jamaahId: m.jamaahId, namaObat: m.namaObat,
    dosis: m.dosis, frekuensi: m.frekuensi, indikasi: m.indikasi,
    catatan: m.catatan, createdAt: m.createdAt.toISOString(),
  };
}

export function serializePreHajjImmunization(i: {
  id: string; jamaahId: string; jenis: string;
  tanggalVaksin: Date | null; nomorBatch: string | null;
  catatan: string | null; createdAt: Date;
}): PreHajjImmunizationData {
  return {
    id: i.id, jamaahId: i.jamaahId, jenis: i.jenis,
    tanggalVaksin: i.tanggalVaksin ? i.tanggalVaksin.toISOString() : null,
    nomorBatch: i.nomorBatch, catatan: i.catatan,
    createdAt: i.createdAt.toISOString(),
  };
}

export function serializePreHajjFitness(f: {
  id: string; jamaahId: string;
  targetLangkah: number | null; jalanKaki: number | null;
  aerobik: number | null; kekuatan: number | null; pernafasan: number | null;
  catatan: string | null; createdAt: Date;
}): PreHajjFitnessData {
  return {
    id: f.id, jamaahId: f.jamaahId,
    targetLangkah: num(f.targetLangkah), jalanKaki: num(f.jalanKaki),
    aerobik: num(f.aerobik), kekuatan: num(f.kekuatan), pernafasan: num(f.pernafasan),
    catatan: f.catatan, createdAt: f.createdAt.toISOString(),
  };
}

export function serializePreHajjEducation(e: {
  id: string; jamaahId: string;
  diet: boolean; aktivitas: boolean; obat: boolean; hidrasi: boolean;
  istirahat: boolean; manajemenKronis: boolean; persiapanPerjalanan: boolean;
  catatan: string | null;
}): PreHajjEducationData {
  return {
    id: e.id, jamaahId: e.jamaahId,
    diet: e.diet, aktivitas: e.aktivitas, obat: e.obat, hidrasi: e.hidrasi,
    istirahat: e.istirahat, manajemenKronis: e.manajemenKronis,
    persiapanPerjalanan: e.persiapanPerjalanan, catatan: e.catatan,
  };
}

export function serializePreHajjAiAssessment(a: {
  id: string; jamaahId: string; ringkasan: string;
  faktorRisiko: string; kesiapanBerangkat: string; rekomendasi: string;
  soap: string | null; resumeMedis: string | null; suratRujukan: string | null;
  createdAt: Date;
}): PreHajjAiAssessmentData {
  let faktor: string[] = [];
  try {
    const p = a.faktorRisiko ? JSON.parse(a.faktorRisiko) : [];
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
    id: a.id, jamaahId: a.jamaahId, ringkasan: a.ringkasan,
    faktorRisiko: faktor, kesiapanBerangkat: a.kesiapanBerangkat,
    rekomendasi, soap: a.soap, resumeMedis: a.resumeMedis,
    suratRujukan: a.suratRujukan, createdAt: a.createdAt.toISOString(),
  };
}

// ===== TELEMEDICINE SERIALIZERS =====

export function serializeChatRoom(r: {
  id: string; jamaahId: string; doctorId: string;
  lastMessageAt: Date; unreadByDoctor: number; unreadByJamaah: number;
  createdAt: Date;
}): ChatRoomData {
  return {
    id: r.id, jamaahId: r.jamaahId, doctorId: r.doctorId,
    lastMessageAt: r.lastMessageAt.toISOString(),
    unreadByDoctor: r.unreadByDoctor, unreadByJamaah: r.unreadByJamaah,
    createdAt: r.createdAt.toISOString(),
  };
}

export function serializeChatMessage(m: {
  id: string; roomId: string; senderType: string; senderName: string | null;
  type: string; content: string; attachmentUrl: string | null;
  attachmentName: string | null; requestId: string | null;
  readByDoctor: boolean; readByJamaah: boolean; createdAt: Date;
}): ChatMessageData {
  return {
    id: m.id, roomId: m.roomId,
    senderType: m.senderType as ChatSenderType,
    senderName: m.senderName,
    type: m.type as ChatMessageType,
    content: m.content, attachmentUrl: m.attachmentUrl,
    attachmentName: m.attachmentName, requestId: m.requestId,
    readByDoctor: m.readByDoctor, readByJamaah: m.readByJamaah,
    createdAt: m.createdAt.toISOString(),
  };
}

export function serializeTelemedicineRequest(r: {
  id: string; roomId: string; jamaahId: string; category: string;
  subType: string | null; title: string; fields: string; status: string;
  scheduledFor: Date | null; submittedAt: Date | null; response: string | null;
  skor: string | null; hariKe: number | null; createdAt: Date;
}): TelemedicineRequestData {
  let fields: FormField[] = [];
  try {
    const p = r.fields ? JSON.parse(r.fields) : [];
    if (Array.isArray(p)) {
      fields = p.map((f: Record<string, unknown>) => ({
        key: String(f?.key ?? ""),
        label: String(f?.label ?? ""),
        type: (f?.type as FormField["type"]) ?? "text",
        ...(f?.unit !== undefined ? { unit: String(f.unit) } : {}),
        ...(Array.isArray(f?.options) ? { options: f.options as { value: string; label: string }[] } : {}),
        ...(f?.required !== undefined ? { required: Boolean(f.required) } : {}),
        ...(f?.placeholder !== undefined ? { placeholder: String(f.placeholder) } : {}),
      }));
    }
  } catch {
    fields = [];
  }
  let response: Record<string, unknown> | null = null;
  if (r.response) {
    try {
      const p = JSON.parse(r.response);
      response = (p && typeof p === "object" && !Array.isArray(p)) ? p as Record<string, unknown> : null;
    } catch {
      response = null;
    }
  }
  return {
    id: r.id, roomId: r.roomId, jamaahId: r.jamaahId,
    category: r.category as TelemedicineCategory,
    subType: r.subType, title: r.title, fields,
    status: r.status as RequestStatus,
    scheduledFor: r.scheduledFor ? r.scheduledFor.toISOString() : null,
    submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
    response, skor: r.skor, hariKe: r.hariKe,
    createdAt: r.createdAt.toISOString(),
  };
}

export function serializeTelemedicineTemplate(t: {
  id: string; title: string; category: string; content: string; createdAt: Date;
}): TelemedicineTemplateData {
  return {
    id: t.id, title: t.title, category: t.category, content: t.content,
    createdAt: t.createdAt.toISOString(),
  };
}

export function serializeTelemedicineSchedule(s: {
  id: string; jamaahId: string; category: string; subType: string | null;
  title: string; hariKe: number | null; timeOfDay: string | null;
  active: boolean; lastSentAt: Date | null; createdAt: Date;
}): TelemedicineScheduleData {
  return {
    id: s.id, jamaahId: s.jamaahId,
    category: s.category as TelemedicineCategory,
    subType: s.subType, title: s.title, hariKe: s.hariKe,
    timeOfDay: s.timeOfDay, active: s.active,
    lastSentAt: s.lastSentAt ? s.lastSentAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
  };
}

export function serializeTelemedicineAiSummary(a: {
  id: string; jamaahId: string; roomId: string; ringkasan: string;
  soap: string | null; assessment: string | null; plan: string | null;
  prioritas: string | null; rekomendasi: string | null; alerts: string | null;
  createdAt: Date;
}): TelemedicineAiSummaryData {
  let rekomendasi: Array<{ kategori: string; tindakan: string; urutan: number }> | null = null;
  if (a.rekomendasi !== null && a.rekomendasi !== undefined) {
    try {
      const p = JSON.parse(a.rekomendasi);
      if (Array.isArray(p)) {
        rekomendasi = p.map((r: Record<string, unknown>) => ({
          kategori: String(r?.kategori ?? ""),
          tindakan: String(r?.tindakan ?? ""),
          urutan: Number(r?.urutan ?? 0),
        }));
      }
    } catch {
      rekomendasi = null;
    }
  }
  let alerts: Array<{ level: AlertLevel; detail: string }> | null = null;
  if (a.alerts !== null && a.alerts !== undefined) {
    try {
      const p = JSON.parse(a.alerts);
      if (Array.isArray(p)) {
        alerts = p.map((r: Record<string, unknown>) => ({
          level: (r?.level as AlertLevel) ?? "YELLOW",
          detail: String(r?.detail ?? ""),
        }));
      }
    } catch {
      alerts = null;
    }
  }
  return {
    id: a.id, jamaahId: a.jamaahId, roomId: a.roomId,
    ringkasan: a.ringkasan, soap: a.soap, assessment: a.assessment,
    plan: a.plan, prioritas: a.prioritas, rekomendasi, alerts,
    createdAt: a.createdAt.toISOString(),
  };
}
