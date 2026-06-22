// Tipe bersama untuk aplikasi Monitoring Kepulangan Jamaah Haji

export type RiskLevel = "HIJAU" | "KUNING" | "MERAH";

export type JenisSkrining =
  | "INFECTIOUS"
  | "CHRONIC"
  | "FRAILTY"
  | "FALL_RISK"
  | "NUTRITION"
  | "MENTAL"
  | "SLEEP"
  | "ACTIVITY"
  | "SPIRITUAL"
  | "FAMILY_APGAR"
  | "FOLLOWUP";

export type Dimensi = "BIOLOGIS" | "PSIKOLOGIS" | "SOSIAL" | "SPIRITUAL";

// Data jamaah (bentuk client)
export interface JamaahData {
  id: string;
  nama: string;
  nik: string;
  kloter: string;
  porsi: string;
  usia: number;
  kelamin: "L" | "P";
  alamat: string;
  hp: string;
  kontakKeluarga: string;
  tanggalTiba: string; // ISO
  bandara: string;
  kabupatenKota: string;
  puskesmas: string;
  dokterKeluarga: string;
  riskLevel: RiskLevel;
  riskSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningData {
  id: string;
  jamaahId: string;
  jenis: JenisSkrining;
  data: Record<string, unknown>;
  skor: string | null;
  catatan: string | null;
  hariKe: number;
  createdAt: string;
}

export interface VitalSignData {
  id: string;
  jamaahId: string;
  tdSistolik: number | null;
  tdDiastolik: number | null;
  nadi: number | null;
  rr: number | null;
  suhu: number | null;
  spo2: number | null;
  beratBadan: number | null;
  gulaDarah: number | null;
  hariKe: number;
  catatan: string | null;
  createdAt: string;
}

// Detail jamaah lengkap dengan semua skrining & TTV
export interface JamaahDetail extends JamaahData {
  screenings: ScreeningData[];
  vitalSigns: VitalSignData[];
}

export interface RiskFlag {
  level: RiskLevel;
  sumber: string; // dari modul mana
  detail: string;
}
