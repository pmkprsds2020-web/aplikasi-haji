// ============================================================================
// Screening form field definitions for telemedicine.
// Generates the correct FormField[] array for each JenisSkrining type.
// Used by skrining-form-dialog.tsx when sending form requests to jamaah.
// ============================================================================

export interface TelemedicineFormField {
  key: string;
  label: string;
  type: "text" | "number" | "textarea" | "yesno" | "select";
  unit?: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

// Generate form fields for a given screening jenis
export function getScreeningFormFields(jenis: string): TelemedicineFormField[] {
  switch (jenis) {
    case "INFECTIOUS":
      return [
        // ISPA
        { key: "ispa_demam", label: "Demam (ISPA)", type: "yesno" },
        { key: "ispa_batuk", label: "Batuk (ISPA)", type: "yesno" },
        { key: "ispa_pilek", label: "Pilek", type: "yesno" },
        { key: "ispa_tenggorok", label: "Sakit tenggorokan", type: "yesno" },
        { key: "ispa_sesak", label: "Sesak napas (ISPA)", type: "yesno" },
        // Pneumonia
        { key: "pneu_napasCepat", label: "Napas cepat (Pneumonia)", type: "yesno" },
        { key: "pneu_nyeriDada", label: "Nyeri dada", type: "yesno" },
        { key: "pneu_batukDahak", label: "Batuk berdahak", type: "yesno" },
        // COVID-19
        { key: "covid_demam", label: "Demam (COVID-19)", type: "yesno" },
        { key: "covid_batuk", label: "Batuk (COVID-19)", type: "yesno" },
        { key: "covid_hilangPenciuman", label: "Kehilangan penciuman", type: "yesno" },
        { key: "covid_sesak", label: "Sesak (COVID-19)", type: "yesno" },
        // MERS
        { key: "mers_demam", label: "Demam (MERS)", type: "yesno" },
        { key: "mers_batuk", label: "Batuk (MERS)", type: "yesno" },
        { key: "mers_sesak", label: "Sesak (MERS)", type: "yesno" },
        { key: "mers_kontak", label: "Riwayat kontak MERS", type: "yesno" },
        // Gastroenteritis
        { key: "gastro_diare", label: "Diare", type: "yesno" },
        { key: "gastro_mual", label: "Mual", type: "yesno" },
        { key: "gastro_muntah", label: "Muntah", type: "yesno" },
        { key: "gastro_nyeri", label: "Nyeri perut", type: "yesno" },
      ];

    case "CHRONIC":
      return [
        // Diabetes
        { key: "dm_gulaDarah", label: "Gula darah sewaktu", type: "number", unit: "mg/dL" },
        { key: "dm_tidakPatuh", label: "Tidak patuh minum obat DM", type: "yesno" },
        { key: "dm_hipo", label: "Keluhan hipoglikemia", type: "yesno" },
        // Hipertensi
        { key: "ht_sistolik", label: "Tekanan darah sistolik", type: "number", unit: "mmHg" },
        { key: "ht_diastolik", label: "Tekanan darah diastolik", type: "number", unit: "mmHg" },
        { key: "ht_tidakPatuh", label: "Tidak patuh minum obat HT", type: "yesno" },
        // PPOK
        { key: "ppok_sesak", label: "Sesak (PPOK)", type: "yesno" },
        { key: "ppok_frekuensi", label: "Frekuensi serangan PPOK", type: "number", unit: "kali/minggu" },
        // Jantung
        { key: "jantung_nyeriDada", label: "Nyeri dada (Jantung)", type: "yesno" },
        { key: "jantung_sesak", label: "Sesak (Jantung)", type: "yesno" },
        { key: "jantung_bengkak", label: "Bengkak tungkai", type: "yesno" },
        // Gagal Ginjal
        { key: "ginjal_edema", label: "Edema (Ginjal)", type: "yesno" },
      ];

    case "FRAILTY":
      return [
        { key: "fatigue", label: "Fatigue (mudah lelah)", type: "yesno" },
        { key: "resistance", label: "Resistance (sulit naik 10 tangga)", type: "yesno" },
        { key: "ambulation", label: "Ambulation (sulit jalan beberapa ratus meter)", type: "yesno" },
        { key: "illness", label: "Illness (>5 penyakit kronis)", type: "yesno" },
        { key: "lossWeight", label: "Loss of weight (penurunan BB >5%)", type: "yesno" },
      ];

    case "FALL_RISK":
      return [
        { key: "jatuh_6bln", label: "Pernah jatuh dalam 6 bulan terakhir", type: "yesno" },
        { key: "butuh_bantuan", label: "Butuh bantuan berjalan", type: "yesno" },
        { key: "pusing", label: "Sering pusing/vertigo", type: "yesno" },
        { key: "obat_penenang", label: "Mengkonsumsi obat penenang", type: "yesno" },
        { key: "gangguan_penglihatan", label: "Gangguan penglihatan", type: "yesno" },
      ];

    case "NUTRITION":
      return [
        { key: "nafsuMakan", label: "Nafsu makan", type: "select", options: [
          { value: "0", label: "Anoreksia berat" }, { value: "1", label: "Nafsu makan menurun" }, { value: "2", label: "Normal" }
        ] },
        { key: "penurunanBB", label: "Penurunan berat badan (3 bln)", type: "select", options: [
          { value: "0", label: ">3kg" }, { value: "1", label: "Tidak tahu" }, { value: "2", label: "1-3kg" }, { value: "3", label: "Tidak turun" }
        ] },
        { key: "mobilitas", label: "Mobilitas", type: "select", options: [
          { value: "0", label: "Bed/chair bound" }, { value: "1", label: "Mampu keluar" }, { value: "2", label: "Berjalan mandiri" }
        ] },
        { key: "stresAkut", label: "Stres akut (3 bln)", type: "select", options: [
          { value: "0", label: "Ya" }, { value: "2", label: "Tidak" }
        ] },
        { key: "neuropsikologis", label: "Masalah neuropsikologis", type: "select", options: [
          { value: "0", label: "Demensia berat" }, { value: "1", label: "Demensia ringan" }, { value: "2", label: "Tidak ada" }
        ] },
        { key: "imt", label: "IMT (kg/m²)", type: "select", options: [
          { value: "0", label: "<19" }, { value: "1", label: "19-21" }, { value: "2", label: "21-23" }, { value: "3", label: "≥23" }
        ] },
      ];

    case "MENTAL":
      // PHQ-9 (9 items) + GAD-7 (7 items) — each scored 0-3
      return [
        ...["1", "2", "3", "4", "5", "6", "7", "8"].map((i) => ({
          key: `phq9_${i}`, label: `PHQ-9 #${i}: ${["Minat/kesenangan berkurang", "Merasa murung/sedih", "Sulit tidur", "Lelah/tidak bertenaga", "Nafsu makan berubah", "Merasa gagal", "Sulit konsentrasi", "Gerakan lambat/gelisah"][Number(i) - 1]}`,
          type: "select" as const,
          options: [
            { value: "0", label: "0 - Tidak" }, { value: "1", label: "1 - Hari" }, { value: "2", label: "2 - Hari" }, { value: "3", label: "3+ Hari" }
          ],
        })),
        { key: "phq9_9", label: "Pikiran menyakiti diri", type: "select", options: [
          { value: "0", label: "0 - Tidak" }, { value: "1", label: "1 - Hari" }, { value: "2", label: "2 - Hari" }, { value: "3", label: "3+ Hari" }
        ] },
        ...["1", "2", "3", "4", "5", "6"].map((i) => ({
          key: `gad7_${i}`, label: `GAD-7 #${i}: ${["Gugup/cemas", "Khawatir berlebihan", "Sulit mengendalikan kekhawatiran", "Sulit relaksasi", "Gelisah/jengkel", "Takut sesuatu buruk"][Number(i) - 1]}`,
          type: "select" as const,
          options: [
            { value: "0", label: "0 - Tidak" }, { value: "1", label: "1 - Hari" }, { value: "2", label: "2 - Hari" }, { value: "3", label: "3+ Hari" }
          ],
        })),
      ];

    case "SLEEP":
      return [
        { key: "sulitTidur", label: "Sulit tertidur", type: "select", options: [
          { value: "0", label: "Tidak" }, { value: "1", label: "Ringan" }, { value: "2", label: "Sedang" }, { value: "3", label: "Berat" }, { value: "4", label: "Sangat Berat" }
        ] },
        { key: "seringTerbangun", label: "Sering terbangun tengah malam", type: "select", options: [
          { value: "0", label: "Tidak" }, { value: "1", label: "Ringan" }, { value: "2", label: "Sedang" }, { value: "3", label: "Berat" }, { value: "4", label: "Sangat Berat" }
        ] },
        { key: "tidakNyenyak", label: "Tidur tidak nyenyak / tidak segar", type: "select", options: [
          { value: "0", label: "Tidak" }, { value: "1", label: "Ringan" }, { value: "2", label: "Sedang" }, { value: "3", label: "Berat" }, { value: "4", label: "Sangat Berat" }
        ] },
      ];

    case "ACTIVITY":
      return [
        { key: "makan", label: "Makan (ADL)", type: "select", options: [
          { value: "0", label: "Ketergantungan" }, { value: "1", label: "Bantuan sebagian" }, { value: "2", label: "Mandiri" }
        ] },
        { key: "mandi", label: "Mandi (ADL)", type: "select", options: [
          { value: "0", label: "Ketergantungan" }, { value: "1", label: "Bantuan sebagian" }, { value: "2", label: "Mandiri" }
        ] },
        { key: "berpakaian", label: "Berpakaian (ADL)", type: "select", options: [
          { value: "0", label: "Ketergantungan" }, { value: "1", label: "Bantuan sebagian" }, { value: "2", label: "Mandiri" }
        ] },
        { key: " toileting", label: "Toileting (ADL)", type: "select", options: [
          { value: "0", label: "Ketergantungan" }, { value: "1", label: "Bantuan sebagian" }, { value: "2", label: "Mandiri" }
        ] },
        { key: "berjalan", label: "Berjalan (ADL)", type: "select", options: [
          { value: "0", label: "Ketergantungan" }, { value: "1", label: "Bantuan sebagian" }, { value: "2", label: "Mandiri" }
        ] },
      ];

    case "SPIRITUAL":
      return [
        { key: "ibadah_teratur", label: "Melaksanakan ibadah teratur", type: "yesno" },
        { key: "tenang_spiritual", label: "Merasa tenang secara spiritual", type: "yesno" },
        { key: "butuh_pendampingan", label: "Butuh pendampingan spiritual", type: "yesno" },
        { key: "catatan_spiritual", label: "Catatan spiritual", type: "textarea", placeholder: "Catatan..." },
      ];

    case "FAMILY_APGAR":
      return [
        { key: "apgar_puas", label: "Puas dengan bantuan keluarga", type: "select", options: [
          { value: "0", label: "Tidak pernah" }, { value: "1", label: "Kadang" }, { value: "2", label: "Hampir selalu" }
        ] },
        { key: "apgar_diskusi", label: "Bisa berdiskusi masalah", type: "select", options: [
          { value: "0", label: "Tidak pernah" }, { value: "1", label: "Kadang" }, { value: "2", label: "Hampir selalu" }
        ] },
        { key: "apgar_keputusan", label: "Dilibatkan dalam keputusan", type: "select", options: [
          { value: "0", label: "Tidak pernah" }, { value: "1", label: "Kadang" }, { value: "2", label: "Hampir selalu" }
        ] },
        { key: "apgar_waktu", label: "Diberi waktu untuk perhatian", type: "select", options: [
          { value: "0", label: "Tidak pernah" }, { value: "1", label: "Kadang" }, { value: "2", label: "Hampir selalu" }
        ] },
        { key: "apgar_ekspresi", label: "Bebas mengekspresikan perasaan", type: "select", options: [
          { value: "0", label: "Tidak pernah" }, { value: "1", label: "Kadang" }, { value: "2", label: "Hampir selalu" }
        ] },
      ];

    case "FOLLOWUP":
      return [
        { key: "keluhan", label: "Keluhan saat ini", type: "textarea", placeholder: "Jelaskan keluhan..." },
        { key: "skor", label: "Skor (jika ada)", type: "number" },
        { key: "catatan", label: "Catatan untuk dokter", type: "textarea", placeholder: "Catatan..." },
      ];

    default:
      return [
        { key: "keluhan", label: "Keluhan utama", type: "textarea", placeholder: "Jelaskan keluhan..." },
        { key: "skor", label: "Skor (jika ada)", type: "number" },
        { key: "catatan", label: "Catatan untuk dokter", type: "textarea", placeholder: "Catatan..." },
      ];
  }
}
