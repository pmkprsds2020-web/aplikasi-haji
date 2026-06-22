import { db } from "./db";
import { computeRiskForJamaah } from "./risk";
import type { JamaahDetail, JamaahData, ScreeningData, VitalSignData } from "./types";

// Serialisasi record Jamaah Prisma → bentuk client (dengan parse JSON data)
export function serializeJamaah(j: {
  id: string; nama: string; nik: string; kloter: string; porsi: string;
  usia: number; kelamin: string; alamat: string; hp: string; kontakKeluarga: string;
  tanggalTiba: Date; bandara: string; kabupatenKota: string; puskesmas: string;
  dokterKeluarga: string; riskLevel: string; riskSummary: string;
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
