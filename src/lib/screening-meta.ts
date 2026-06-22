import type { JenisSkrining, Dimensi } from "./types";

export interface ScreeningMeta {
  jenis: JenisSkrining;
  judul: string;
  singkat: string;
  dimensi: Dimensi;
  instrumen: string;
  hasil: string[]; // kemungkinan hasil/skor
  icon: string; // nama ikon lucide
  warna: string; // tailwind accent
}

// Metadata 11 modul skrining (TTV terpisah sebagai monitoring vital)
// Dikelompokkan berdasarkan dimensi Biopsikososial Spiritual
export const SCREENING_META: Record<JenisSkrining, ScreeningMeta> = {
  INFECTIOUS: {
    jenis: "INFECTIOUS",
    judul: "Skrining Penyakit Menular",
    singkat: "ISPA, Pneumonia, COVID-19, MERS-CoV, Gastroenteritis",
    dimensi: "BIOLOGIS",
    instrumen: "Checklist gejala infeksi pasca haji",
    hasil: ["Rendah", "Sedang", "Tinggi"],
    icon: "Bug",
    warna: "rose",
  },
  CHRONIC: {
    jenis: "CHRONIC",
    judul: "Monitoring Penyakit Kronis",
    singkat: "Diabetes, Hipertensi, Jantung, PPOK/Asthma, Gagal Ginjal",
    dimensi: "BIOLOGIS",
    instrumen: "Status kontrol penyakit kronis",
    hasil: ["Stabil", "Perlu Pemantauan", "Tidak Terkontrol"],
    icon: "HeartPulse",
    warna: "red",
  },
  FRAILTY: {
    jenis: "FRAILTY",
    judul: "Skrining Frailty Lansia",
    singkat: "FRAIL Scale — Fatigue, Resistance, Ambulation, Illness, Loss of Weight",
    dimensi: "BIOLOGIS",
    instrumen: "FRAIL Scale (0–5)",
    hasil: ["Robust", "Pre-frail", "Frail"],
    icon: "Accessibility",
    warna: "amber",
  },
  FALL_RISK: {
    jenis: "FALL_RISK",
    judul: "Skrining Risiko Jatuh",
    singkat: "Riwayat jatuh, keseimbangan, alat bantu jalan",
    dimensi: "BIOLOGIS",
    instrumen: "3-Question Fall Risk",
    hasil: ["Rendah", "Sedang", "Tinggi"],
    icon: "PersonStanding",
    warna: "orange",
  },
  NUTRITION: {
    jenis: "NUTRITION",
    judul: "Skrining Nutrisi",
    singkat: "Mini Nutritional Assessment Short Form (MNA-SF)",
    dimensi: "BIOLOGIS",
    instrumen: "MNA-SF (0–14)",
    hasil: ["Normal", "Risiko Malnutrisi", "Malnutrisi"],
    icon: "Apple",
    warna: "lime",
  },
  MENTAL: {
    jenis: "MENTAL",
    judul: "Skrining Kesehatan Mental",
    singkat: "PHQ-9 (depresi) & GAD-7 (kecemasan)",
    dimensi: "PSIKOLOGIS",
    instrumen: "PHQ-9 + GAD-7",
    hasil: ["Minimal", "Ringan", "Sedang", "Sedang-Berat", "Berat"],
    icon: "Brain",
    warna: "violet",
  },
  SLEEP: {
    jenis: "SLEEP",
    judul: "Skrining Kualitas Tidur",
    singkat: "Insomnia Severity Index (ISI) singkat",
    dimensi: "PSIKOLOGIS",
    instrumen: "ISI Singkat",
    hasil: ["Tidak Ada Insomnia", "Insomnia Subklinis", "Insomnia Sedang", "Insomnia Berat"],
    icon: "Moon",
    warna: "indigo",
  },
  ACTIVITY: {
    jenis: "ACTIVITY",
    judul: "Skrining Aktivitas Fisik",
    singkat: "Kemandirian berjalan & aktivitas sehari-hari",
    dimensi: "BIOLOGIS",
    instrumen: "ADL sederhana",
    hasil: ["Mandiri", "Bantuan Sebagian", "Ketergantungan"],
    icon: "Footprints",
    warna: "cyan",
  },
  SPIRITUAL: {
    jenis: "SPIRITUAL",
    judul: "Skrining Spiritual Pasca Haji",
    singkat: "Ibadah rutin, ketenangan, hambatan ibadah",
    dimensi: "SPIRITUAL",
    instrumen: "Spiritual Assessment Singkat",
    hasil: ["Baik", "Perlu Pendampingan"],
    icon: "Sparkles",
    warna: "teal",
  },
  FAMILY_APGAR: {
    jenis: "FAMILY_APGAR",
    judul: "Family Assessment (APGAR)",
    singkat: "Adaptation, Partnership, Growth, Affection, Resolve",
    dimensi: "SOSIAL",
    instrumen: "APGAR Family (0–10)",
    hasil: ["Fungsional", "Disfungsi Sedang", "Disfungsi Berat"],
    icon: "Users",
    warna: "sky",
  },
  FOLLOWUP: {
    jenis: "FOLLOWUP",
    judul: "Skrining Kebutuhan Tindak Lanjut",
    singkat: "Kontrol dokter, home visit, gizi, rehabilitasi, konseling",
    dimensi: "SOSIAL",
    instrumen: "Checklist kebutuhan rujukan",
    hasil: ["Tidak Ada", "Perlu Tindak Lanjut"],
    icon: "ClipboardCheck",
    warna: "emerald",
  },
};

export const SCREENING_ORDER: JenisSkrining[] = [
  "INFECTIOUS",
  "CHRONIC",
  "FRAILTY",
  "FALL_RISK",
  "NUTRITION",
  "MENTAL",
  "SLEEP",
  "ACTIVITY",
  "SPIRITUAL",
  "FAMILY_APGAR",
  "FOLLOWUP",
];

export const DIMENSI_META: Record<Dimensi, { label: string; warna: string; icon: string }> = {
  BIOLOGIS: { label: "Biologis", warna: "emerald", icon: "HeartPulse" },
  PSIKOLOGIS: { label: "Psikologis", warna: "violet", icon: "Brain" },
  SOSIAL: { label: "Sosial", warna: "sky", icon: "Users" },
  SPIRITUAL: { label: "Spiritual", warna: "teal", icon: "Sparkles" },
};

// Jadwal monitoring berkala yang direkomendasikan
export const MONITORING_SCHEDULE = [
  { hariKe: 1, judul: "Hari 1", kegiatan: "Skrining awal pasca pulang", fokus: ["INFECTIOUS", "FRAILTY", "FALL_RISK", "FAMILY_APGAR"], deskripsi: "Skrining awal gejala infeksi, frailty, risiko jatuh, dan dukungan keluarga segera setelah tiba." },
  { hariKe: 7, judul: "Hari 7", kegiatan: "Monitoring gejala infeksi", fokus: ["INFECTIOUS", "MENTAL", "SLEEP", "SPIRITUAL"], deskripsi: "Pemantauan gejala infeksi saluran napas, kesehatan mental, kualitas tidur, dan adaptasi spiritual." },
  { hariKe: 14, judul: "Hari 14", kegiatan: "Monitoring penyakit kronis", fokus: ["CHRONIC", "NUTRITION", "ACTIVITY"], deskripsi: "Evaluasi kontrol penyakit kronis, status nutrisi, dan aktivitas fisik." },
  { hariKe: 30, judul: "Hari 30", kegiatan: "Evaluasi komprehensif", fokus: ["INFECTIOUS", "CHRONIC", "FRAILTY", "MENTAL", "SPIRITUAL", "FOLLOWUP"], deskripsi: "Evaluasi menyeluruh seluruh dimensi biopsikososial spiritual dan kebutuhan tindak lanjut." },
] as const;
