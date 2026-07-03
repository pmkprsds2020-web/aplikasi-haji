// Tipe & kontrak untuk modul Pra Haji (Electronic Hajj Health Record)
// Kontrak bersama untuk backend API & frontend UI

export type PreHajjScreeningJenis =
  | "FRAIL"
  | "MNA"
  | "MINICOG"
  | "MORSE"
  | "BARTHEL"
  | "PHQ9"
  | "GAD7"
  | "APGAR"
  | "IPAQ"
  | "WHOQOL";

export interface PreHajjVitalData {
  id: string;
  jamaahId: string;
  tdSistolik: number | null;
  tdDiastolik: number | null;
  nadi: number | null;
  rr: number | null;
  suhu: number | null;
  spo2: number | null;
  beratBadan: number | null;
  tinggiBadan: number | null;
  lingkarPerut: number | null;
  catatan: string | null;
  createdAt: string;
}

export interface PreHajjLabData {
  id: string;
  jamaahId: string;
  hb: number | null;
  gdp: number | null;
  gd2pp: number | null;
  hba1c: number | null;
  kolesterol: number | null;
  hdl: number | null;
  ldl: number | null;
  trigliserida: number | null;
  asamUrat: number | null;
  sgot: number | null;
  sgpt: number | null;
  kreatinin: number | null;
  egfr: number | null;
  urinalisis: string | null;
  catatan: string | null;
  createdAt: string;
}

export interface PreHajjChronicData {
  id: string;
  jamaahId: string;
  hipertensi: string;
  diabetes: string;
  ppok: string;
  ckd: string;
  jantung: string;
  stroke: string;
  kanker: string;
  obatRutin: string | null;
  targetTerapi: string | null;
}

export interface PreHajjScreeningData {
  id: string;
  jamaahId: string;
  jenis: PreHajjScreeningJenis;
  data: Record<string, unknown>;
  skor: string | null;
  catatan: string | null;
  createdAt: string;
}

export interface PreHajjMedicationData {
  id: string;
  jamaahId: string;
  namaObat: string;
  dosis: string | null;
  frekuensi: string | null;
  indikasi: string | null;
  catatan: string | null;
  createdAt: string;
}

export interface PreHajjImmunizationData {
  id: string;
  jamaahId: string;
  jenis: string; // MENINGITIS|INFLUENZA|COVID|PNEUMOKOKUS|HEPATITIS
  tanggalVaksin: string | null;
  nomorBatch: string | null;
  catatan: string | null;
  createdAt: string;
}

export interface PreHajjFitnessData {
  id: string;
  jamaahId: string;
  targetLangkah: number | null;
  jalanKaki: number | null;
  aerobik: number | null;
  kekuatan: number | null;
  pernafasan: number | null;
  catatan: string | null;
  createdAt: string;
}

export interface PreHajjEducationData {
  id: string;
  jamaahId: string;
  diet: boolean;
  aktivitas: boolean;
  obat: boolean;
  hidrasi: boolean;
  istirahat: boolean;
  manajemenKronis: boolean;
  persiapanPerjalanan: boolean;
  catatan: string | null;
}

export interface PreHajjAiAssessmentData {
  id: string;
  jamaahId: string;
  ringkasan: string;
  faktorRisiko: string[];
  kesiapanBerangkat: string; // Siap|Bersyarat|Belum Siap
  rekomendasi: Array<{ kategori: string; tindakan: string; urutan: number }>;
  soap: string | null;
  resumeMedis: string | null;
  suratRujukan: string | null;
  createdAt: string;
}

// Agregat semua data pra haji (respons /api/jamaah/[id]/pre-haji)
export interface PreHajjBundle {
  vitals: PreHajjVitalData[];
  labs: PreHajjLabData[];
  chronic: PreHajjChronicData | null;
  screenings: PreHajjScreeningData[];
  medications: PreHajjMedicationData[];
  immunizations: PreHajjImmunizationData[];
  fitness: PreHajjFitnessData[];
  education: PreHajjEducationData | null;
  aiAssessments: PreHajjAiAssessmentData[];
}

// Metadata instrumen skrining pra haji
export interface PreHajjScreeningMeta {
  jenis: PreHajjScreeningJenis;
  judul: string;
  singkat: string;
  instrumen: string;
  icon: string; // nama ikon lucide
  hasilOptions: string[];
}

export const PRE_HAJJ_SCREENING_META: Record<
  PreHajjScreeningJenis,
  PreHajjScreeningMeta
> = {
  FRAIL: {
    jenis: "FRAIL",
    judul: "FRAIL Scale",
    singkat: "Skrining frailty lansia (Fatigue, Resistance, Ambulation, Illness, Loss of Weight)",
    instrumen: "FRAIL Scale (0–5)",
    icon: "Accessibility",
    hasilOptions: ["Robust", "Pre-frail", "Frail"],
  },
  MNA: {
    jenis: "MNA",
    judul: "Mini Nutritional Assessment",
    singkat: "Skrining nutrisi lansia (MNA-SF)",
    instrumen: "MNA-SF (0–14)",
    icon: "Apple",
    hasilOptions: ["Normal", "Risiko Malnutrisi", "Malnutrisi"],
  },
  MINICOG: {
    jenis: "MINICOG",
    judul: "Mini-Cog",
    singkat: "Skrining gangguan kognitif (3-item recall + clock draw)",
    instrumen: "Mini-Cog (0–5)",
    icon: "Brain",
    hasilOptions: ["Normal", "Gangguan Kognitif"],
  },
  MORSE: {
    jenis: "MORSE",
    judul: "Morse Fall Scale",
    singkat: "Skrining risiko jatuh (6 item)",
    instrumen: "Morse Fall Scale (0–125)",
    icon: "PersonStanding",
    hasilOptions: ["Rendah", "Sedang", "Tinggi"],
  },
  BARTHEL: {
    jenis: "BARTHEL",
    judul: "Barthel Index",
    singkat: "Indeks aktivitas kehidupan sehari-hari (ADL)",
    instrumen: "Barthel ADL Index (0–100)",
    icon: "Footprints",
    hasilOptions: ["Ketergantungan Total", "Ketergantungan Berat", "Ketergantungan Sedang", "Bantuan Ringan", "Mandiri"],
  },
  PHQ9: {
    jenis: "PHQ9",
    judul: "PHQ-9",
    singkat: "Skrining depresi (9 item)",
    instrumen: "PHQ-9 (0–27)",
    icon: "Brain",
    hasilOptions: ["Minimal", "Ringan", "Sedang", "Sedang-Berat", "Berat"],
  },
  GAD7: {
    jenis: "GAD7",
    judul: "GAD-7",
    singkat: "Skrining kecemasan (7 item)",
    instrumen: "GAD-7 (0–21)",
    icon: "Brain",
    hasilOptions: ["Minimal", "Ringan", "Sedang", "Berat"],
  },
  APGAR: {
    jenis: "APGAR",
    judul: "Family APGAR",
    singkat: "Penilaian fungsi keluarga (5 item)",
    instrumen: "APGAR Family (0–10)",
    icon: "Users",
    hasilOptions: ["Fungsional", "Disfungsi Sedang", "Disfungsi Berat"],
  },
  IPAQ: {
    jenis: "IPAQ",
    judul: "IPAQ (Short)",
    singkat: "International Physical Activity Questionnaire — aktivitas fisik",
    instrumen: "IPAQ Short (MET-menit/minggu)",
    icon: "Footprints",
    hasilOptions: ["Rendah", "Sedang", "Tinggi"],
  },
  WHOQOL: {
    jenis: "WHOQOL",
    judul: "WHOQOL-BREF",
    singkat: "Kualitas hidup (4 domain)",
    instrumen: "WHOQOL-BREF (0–100)",
    icon: "HeartPulse",
    hasilOptions: ["Rendah", "Sedang", "Tinggi"],
  },
};

export const PRE_HAJJ_SCREENING_ORDER: PreHajjScreeningJenis[] = [
  "FRAIL", "MNA", "MINICOG", "MORSE", "BARTHEL",
  "PHQ9", "GAD7", "APGAR", "IPAQ", "WHOQOL",
];

// Sub-tab Pra Haji
export type PreHajjSubTab =
  | "ringkasan"
  | "ttv"
  | "lab"
  | "kronis"
  | "skrining"
  | "obat"
  | "imunisasi"
  | "kebugaran"
  | "edukasi";

export const PRE_HAJJ_SUBTABS: {
  key: PreHajjSubTab;
  label: string;
  icon: string;
}[] = [
  { key: "ringkasan", label: "Ringkasan", icon: "LayoutDashboard" },
  { key: "ttv", label: "TTV", icon: "Activity" },
  { key: "lab", label: "Lab", icon: "TestTube" },
  { key: "kronis", label: "Kronis", icon: "HeartPulse" },
  { key: "skrining", label: "Skrining", icon: "ClipboardList" },
  { key: "obat", label: "Obat", icon: "Pill" },
  { key: "imunisasi", label: "Imunisasi", icon: "Syringe" },
  { key: "kebugaran", label: "Kebugaran", icon: "Footprints" },
  { key: "edukasi", label: "Edukasi", icon: "GraduationCap" },
];

// API CONTRACT (yang harus diimplementasi backend):
// GET  /api/jamaah/[id]/pre-haji            → { bundle: PreHajjBundle }
// POST /api/jamaah/[id]/pre-haji/vital      → body: PreHajjVitalData (tanpa id/jamaahId/createdAt) → { vital }
// POST /api/jamaah/[id]/pre-haji/lab        → body: PreHajjLabData partial → { lab }
// PUT  /api/jamaah/[id]/pre-haji/chronic    → body: PreHajjChronicData partial → { chronic }
// POST /api/jamaah/[id]/pre-haji/screening  → body: { jenis, data, skor, catatan } → { screening }
// POST /api/jamaah/[id]/pre-haji/medication → body: PreHajjMedicationData partial → { medication }
// DELETE /api/jamaah/[id]/pre-haji/medication/[medId]
// POST /api/jamaah/[id]/pre-haji/immunization → body: { jenis, tanggalVaksin, nomorBatch, catatan } → { immunization }
// DELETE /api/jamaah/[id]/pre-haji/immunization/[immId]
// POST /api/jamaah/[id]/pre-haji/fitness    → body: PreHajjFitnessData partial → { fitness }
// PUT  /api/jamaah/[id]/pre-haji/education  → body: PreHajjEducationData partial → { education }
// GET  /api/jamaah/[id]/pre-haji/ai         → { assessment: PreHajjAiAssessmentData } (LLM + simpan)
