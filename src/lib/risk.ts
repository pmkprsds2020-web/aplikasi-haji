import type {
  JamaahDetail,
  RiskFlag,
  RiskLevel,
  ScreeningData,
  VitalSignData,
} from "./types";

// Ambil skrining terbaru per jenis
export function latestScreenings(
  screenings: ScreeningData[]
): Record<string, ScreeningData> {
  const map: Record<string, ScreeningData> = {};
  for (const s of screenings) {
    const existing = map[s.jenis];
    if (!existing || new Date(s.createdAt) > new Date(existing.createdAt)) {
      map[s.jenis] = s;
    }
  }
  return map;
}

export function latestVital(vitals: VitalSignData[]): VitalSignData | null {
  if (!vitals.length) return null;
  return [...vitals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

const bool = (v: unknown): boolean => v === true || v === "true" || v === 1 || v === "1" || v === "ya";

// Hitung seluruh flag risiko dari data jamaah
export function computeRiskFlags(detail: {
  screenings: ScreeningData[];
  vitalSigns: VitalSignData[];
  usia?: number;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const ls = latestScreenings(detail.screenings);
  const v = latestVital(detail.vitalSigns);

  // ===== Tanda Vital =====
  if (v) {
    if (v.spo2 !== null && v.spo2 < 94) {
      flags.push({ level: "MERAH", sumber: "Tanda Vital", detail: `SpO₂ ${v.spo2}% (<94%) — hipoksia` });
    } else if (v.spo2 !== null && v.spo2 < 96) {
      flags.push({ level: "KUNING", sumber: "Tanda Vital", detail: `SpO₂ ${v.spo2}% (borderline)` });
    }
    if (v.suhu !== null && v.suhu >= 38) {
      flags.push({ level: "MERAH", sumber: "Tanda Vital", detail: `Demam ${v.suhu}°C (≥38°C)` });
    } else if (v.suhu !== null && v.suhu >= 37.5) {
      flags.push({ level: "KUNING", sumber: "Tanda Vital", detail: `Suhu ${v.suhu}°C (subfebris)` });
    }
    if (v.tdSistolik !== null && (v.tdSistolik >= 180 || (v.tdDiastolik !== null && v.tdDiastolik >= 110))) {
      flags.push({ level: "MERAH", sumber: "Tanda Vital", detail: `Hipertensi krisis ${v.tdSistolik}/${v.tdDiastolik ?? "-"} mmHg` });
    } else if (v.tdSistolik !== null && (v.tdSistolik >= 140 || (v.tdDiastolik !== null && v.tdDiastolik >= 90))) {
      flags.push({ level: "KUNING", sumber: "Tanda Vital", detail: `Hipertensi ${v.tdSistolik}/${v.tdDiastolik ?? "-"} mmHg` });
    }
    if (v.nadi !== null && v.nadi > 120) {
      flags.push({ level: "MERAH", sumber: "Tanda Vital", detail: `Takikardi ${v.nadi}×/menit` });
    } else if (v.nadi !== null && v.nadi > 100) {
      flags.push({ level: "KUNING", sumber: "Tanda Vital", detail: `Nadi ${v.nadi}×/menit (sedikit cepat)` });
    }
    if (v.rr !== null && v.rr >= 25) {
      flags.push({ level: "MERAH", sumber: "Tanda Vital", detail: `Napas cepat ${v.rr}×/menit (dispnea)` });
    }
    if (v.gulaDarah !== null && (v.gulaDarah >= 250 || v.gulaDarah < 60)) {
      flags.push({ level: "MERAH", sumber: "Tanda Vital", detail: `Gula darah ${v.gulaDarah} mg/dL (tidak terkontrol)` });
    } else if (v.gulaDarah !== null && (v.gulaDarah >= 180 || v.gulaDarah < 70)) {
      flags.push({ level: "KUNING", sumber: "Tanda Vital", detail: `Gula darah ${v.gulaDarah} mg/dL` });
    }
  }

  // ===== Penyakit Menular =====
  const inf = ls.INFECTIOUS?.data as Record<string, unknown> | undefined;
  if (inf) {
    const demam = bool(inf.ispa_demam) || bool(inf.covid_demam) || bool(inf.mers_demam);
    const sesak = bool(inf.ispa_sesak) || bool(inf.covid_sesak) || bool(inf.mers_sesak) || bool(inf.pneu_napasCepat);
    const kontakMers = bool(inf.mers_kontak);
    if (demam && sesak) {
      flags.push({ level: "MERAH", sumber: "Penyakit Menular", detail: "Demam + sesak napas — suspek ISPA/pneumonia berat" });
    }
    if (kontakMers && (demam || bool(inf.mers_batuk))) {
      flags.push({ level: "MERAH", sumber: "Penyakit Menular", detail: "Riwayat kontak MERS-CoV dengan gejala — perlu investigasi" });
    }
    if (demam && !sesak) {
      flags.push({ level: "KUNING", sumber: "Penyakit Menular", detail: "Demam tanpa sesak — pantau infeksi" });
    }
    const diare = bool(inf.gastro_diare);
    if (diare && (bool(inf.gastro_muntah) || bool(inf.gastro_nyeri))) {
      flags.push({ level: "KUNING", sumber: "Penyakit Menular", detail: "Gejala gastroenteritis" });
    }
    const skorInf = String(ls.INFECTIOUS.skor ?? "").toLowerCase();
    if (skorInf.includes("tinggi")) {
      flags.push({ level: "MERAH", sumber: "Penyakit Menular", detail: "Skor risiko infeksi Tinggi" });
    } else if (skorInf.includes("sedang")) {
      flags.push({ level: "KUNING", sumber: "Penyakit Menular", detail: "Skor risiko infeksi Sedang" });
    }
  }

  // ===== Penyakit Kronis =====
  const chr = ls.CHRONIC?.data as Record<string, unknown> | undefined;
  if (chr) {
    if (bool(chr.jantung_nyeriDada)) {
      flags.push({ level: "MERAH", sumber: "Penyakit Kronis", detail: "Nyeri dada — evaluasi kardiovaskular segera" });
    }
    if (bool(chr.jantung_sesak) && bool(chr.jantung_bengkak)) {
      flags.push({ level: "MERAH", sumber: "Penyakit Kronis", detail: "Sesak + bengkak tungkai — suspek dekompensasi jantung" });
    }
    if (bool(chr.ppok_sesak) && num(chr.ppok_frekuensi) !== null && (num(chr.ppok_frekuensi) ?? 0) >= 3) {
      flags.push({ level: "KUNING", sumber: "Penyakit Kronis", detail: "PPOK sering sesak — optimasi terapi" });
    }
    if (bool(chr.dm_hipo)) {
      flags.push({ level: "MERAH", sumber: "Penyakit Kronis", detail: "Keluhan hipoglikemia — evaluasi terapi DM" });
    }
    if (bool(chr.ht_tidakPatuh) || bool(chr.dm_tidakPatuh)) {
      flags.push({ level: "KUNING", sumber: "Penyakit Kronis", detail: "Ketidakpatuhan obat penyakit kronis" });
    }
    if (bool(chr.ginjal_edema)) {
      flags.push({ level: "KUNING", sumber: "Penyakit Kronis", detail: "Edema pada gagal ginjal — kontrol dipercepat" });
    }
    const skorChr = String(ls.CHRONIC.skor ?? "").toLowerCase();
    if (skorChr.includes("tidak terkontrol")) {
      flags.push({ level: "MERAH", sumber: "Penyakit Kronis", detail: "Penyakit kronis tidak terkontrol" });
    } else if (skorChr.includes("pemantauan")) {
      flags.push({ level: "KUNING", sumber: "Penyakit Kronis", detail: "Penyakit kronis perlu pemantauan" });
    }
  }

  // ===== Frailty =====
  const fr = ls.FRAILTY?.data as Record<string, unknown> | undefined;
  if (fr) {
    const skor = String(ls.FRAILTY.skor ?? "").toLowerCase();
    if (skor.includes("frail") && !skor.includes("pre")) {
      flags.push({ level: "MERAH", sumber: "Frailty", detail: "Frail (FRAIL scale) — lansia rentan" });
    } else if (skor.includes("pre")) {
      flags.push({ level: "KUNING", sumber: "Frailty", detail: "Pre-frail — pencegahan progresif" });
    }
  }

  // ===== Risiko Jatuh =====
  const fall = ls.FALL_RISK?.data as Record<string, unknown> | undefined;
  if (fall) {
    const skor = String(ls.FALL_RISK.skor ?? "").toLowerCase();
    if (skor.includes("tinggi")) {
      flags.push({ level: "MERAH", sumber: "Risiko Jatuh", detail: "Risiko jatuh Tinggi" });
    } else if (skor.includes("sedang")) {
      flags.push({ level: "KUNING", sumber: "Risiko Jatuh", detail: "Risiko jatuh Sedang" });
    }
  }

  // ===== Nutrisi =====
  const nut = ls.NUTRITION?.data as Record<string, unknown> | undefined;
  if (nut) {
    const skor = String(ls.NUTRITION.skor ?? "").toLowerCase();
    if (skor.includes("malnutrisi") && !skor.includes("risiko")) {
      flags.push({ level: "MERAH", sumber: "Nutrisi", detail: "Malnutrisi (MNA-SF)" });
    } else if (skor.includes("risiko")) {
      flags.push({ level: "KUNING", sumber: "Nutrisi", detail: "Risiko malnutrisi" });
    }
  }

  // ===== Mental =====
  const ment = ls.MENTAL?.data as Record<string, unknown> | undefined;
  if (ment) {
    const phq = num(ment.phq9_total);
    const gad = num(ment.gad7_total);
    if (phq !== null && phq >= 15) {
      flags.push({ level: "MERAH", sumber: "Kesehatan Mental", detail: `Depresi PHQ-9 ${phq} (sedang-berat/berat)` });
    } else if (phq !== null && phq >= 5) {
      flags.push({ level: "KUNING", sumber: "Kesehatan Mental", detail: `Depresi PHQ-9 ${phq} (ringan-sedang)` });
    }
    if (gad !== null && gad >= 15) {
      flags.push({ level: "MERAH", sumber: "Kesehatan Mental", detail: `Kecemasan GAD-7 ${gad} (berat)` });
    } else if (gad !== null && gad >= 8) {
      flags.push({ level: "KUNING", sumber: "Kesehatan Mental", detail: `Kecemasan GAD-7 ${gad} (sedang)` });
    }
    if (bool(ment.phq9_bunuhDiri) && num(ment.phq9_bunuhDiri) !== null) {
      const v9 = num(ment.phq9_bunuhDiri);
      if (v9 && v9 >= 1) {
        flags.push({ level: "MERAH", sumber: "Kesehatan Mental", detail: "Pikiran menyakiti diri — intervensi krisis" });
      }
    }
  }

  // ===== Tidur =====
  const slp = ls.SLEEP?.data as Record<string, unknown> | undefined;
  if (slp) {
    const skor = String(ls.SLEEP.skor ?? "").toLowerCase();
    if (skor.includes("berat")) {
      flags.push({ level: "MERAH", sumber: "Kualitas Tidur", detail: "Insomnia berat (ISI)" });
    } else if (skor.includes("sedang") || skor.includes("subklinis")) {
      flags.push({ level: "KUNING", sumber: "Kualitas Tidur", detail: "Gangguan tidur (ISI)" });
    }
  }

  // ===== Aktivitas =====
  const act = ls.ACTIVITY?.data as Record<string, unknown> | undefined;
  if (act) {
    const skor = String(ls.ACTIVITY.skor ?? "").toLowerCase();
    if (skor.includes("ketergantungan")) {
      flags.push({ level: "MERAH", sumber: "Aktivitas Fisik", detail: "Ketergantungan ADL" });
    } else if (skor.includes("bantuan")) {
      flags.push({ level: "KUNING", sumber: "Aktivitas Fisik", detail: "Perlu bantuan sebagian ADL" });
    }
  }

  // ===== Spiritual =====
  const spi = ls.SPIRITUAL?.data as Record<string, unknown> | undefined;
  if (spi) {
    const skor = String(ls.SPIRITUAL.skor ?? "").toLowerCase();
    if (skor.includes("pendampingan")) {
      flags.push({ level: "KUNING", sumber: "Spiritual", detail: "Perlu pendampingan spiritual" });
    }
  }

  // ===== Family APGAR =====
  const fam = ls.FAMILY_APGAR?.data as Record<string, unknown> | undefined;
  if (fam) {
    const skor = String(ls.FAMILY_APGAR.skor ?? "").toLowerCase();
    if (skor.includes("berat")) {
      flags.push({ level: "MERAH", sumber: "Keluarga", detail: "Disfungsi keluarga berat (APGAR rendah)" });
    } else if (skor.includes("sedang")) {
      flags.push({ level: "KUNING", sumber: "Keluarga", detail: "Disfungsi keluarga sedang" });
    }
  }

  return flags;
}

export function aggregateRisk(flags: RiskFlag[]): RiskLevel {
  if (flags.some((f) => f.level === "MERAH")) return "MERAH";
  if (flags.some((f) => f.level === "KUNING")) return "KUNING";
  return "HIJAU";
}

export function riskSummary(flags: RiskFlag[]): string {
  const merah = flags.filter((f) => f.level === "MERAH");
  const kuning = flags.filter((f) => f.level === "KUNING");
  if (merah.length) {
    return `Risiko Tinggi: ${merah.map((f) => f.detail).join("; ")}`;
  }
  if (kuning.length) {
    return `Perlu Pemantauan: ${kuning.map((f) => f.detail).join("; ")}`;
  }
  return "Tidak ada keluhan, kondisi stabil.";
}

export function computeRiskForJamaah(detail: JamaahDetail): {
  level: RiskLevel;
  summary: string;
  flags: RiskFlag[];
} {
  const flags = computeRiskFlags({
    screenings: detail.screenings,
    vitalSigns: detail.vitalSigns,
    usia: detail.usia,
  });
  return {
    level: aggregateRisk(flags),
    summary: riskSummary(flags),
    flags,
  };
}
