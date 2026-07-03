import type { JamaahData } from "./types";
import type { PreHajjBundle } from "./pre-hajj-types";

export interface TabCompleteness {
  profil: number; // 0-100
  praHaji: number;
  pascaHaji: number;
  overall: number;
}

// Hitung kelengkapan data jamaah (untuk progress bar)
export function computeCompleteness(
  jamaah: JamaahData,
  preHajj: PreHajjBundle | null,
  pascaScreeningCount: number,
  pascaVitalCount: number
): TabCompleteness {
  // Profil: 12 field kunci
  const profilFields = [
    jamaah.paspor, jamaah.embarkasi, jamaah.golDarah, jamaah.riwayatPenyakit,
    jamaah.riwayatOperasi, jamaah.alergi, jamaah.obatRutin, jamaah.statusIstithaah,
    jamaah.tanggalBerangkat, jamaah.tanggalPulang, jamaah.hp, jamaah.kontakKeluarga,
  ];
  const profilFilled = profilFields.filter(
    (v) => v !== null && v !== undefined && v !== "" && v !== "Belum Dinilai"
  ).length;
  const profil = Math.round((profilFilled / profilFields.length) * 100);

  // Pra Haji: 9 modul
  let praScore = 0;
  if (preHajj) {
    if (preHajj.vitals.length > 0) praScore++;
    if (preHajj.labs.length > 0) praScore++;
    if (preHajj.chronic) praScore++;
    if (preHajj.screenings.length > 0) praScore++;
    if (preHajj.medications.length > 0) praScore++;
    if (preHajj.immunizations.length > 0) praScore++;
    if (preHajj.fitness.length > 0) praScore++;
    if (preHajj.education) {
      const edu = preHajj.education;
      const eduDone = [edu.diet, edu.aktivitas, edu.obat, edu.hidrasi, edu.istirahat, edu.manajemenKronis, edu.persiapanPerjalanan].filter(Boolean).length;
      if (eduDone >= 4) praScore++;
    }
    // imunisasi meningitis wajib
    const hasMeningitis = preHajj.immunizations.some((i) => i.jenis === "MENINGITIS");
    if (hasMeningitis) praScore++;
  }
  const praHaji = Math.round((praScore / 9) * 100);

  // Pasca Haji: screening + vital
  let pascaScore = 0;
  if (pascaScreeningCount > 0) pascaScore += 50;
  if (pascaVitalCount > 0) pascaScore += 50;
  const pascaHaji = pascaScore;

  const overall = Math.round((profil + praHaji + pascaHaji) / 3);

  return { profil, praHaji, pascaHaji, overall };
}

export type CompletenessBadge = "lengkap" | "sebagian" | "belum" | "tindak-lanjut";

export function completenessBadge(pct: number): {
  label: string;
  variant: CompletenessBadge;
  className: string;
} {
  if (pct >= 80) return { label: "Lengkap", variant: "lengkap", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900" };
  if (pct >= 40) return { label: "Sebagian", variant: "sebagian", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900" };
  return { label: "Belum Lengkap", variant: "belum", className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900" };
}

// Status istithaah badge
export function istithaahStyle(status: string | null | undefined): { label: string; className: string } {
  const s = (status ?? "Belum Dinilai").toLowerCase();
  if (s.includes("laik") && !s.includes("belum") && !s.includes("tidak"))
    return { label: "Laik", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" };
  if (s.includes("bersyarat"))
    return { label: "Bersyarat", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" };
  if (s.includes("tidak"))
    return { label: "Tidak Laik", className: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" };
  return { label: "Belum Dinilai", className: "bg-muted text-muted-foreground" };
}
