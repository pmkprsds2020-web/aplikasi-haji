// Seed data — Monitoring Kepulangan Jamaah Haji
// Jalankan: bun run prisma/seed.ts
import { db } from "../src/lib/db";

async function main() {
  console.log("🧹 Membersihkan data lama...");
  await db.vitalSign.deleteMany();
  await db.screening.deleteMany();
  await db.jamaah.deleteMany();

  const tibaOffset = (hari: number) => new Date(Date.now() - hari * 86400000);

  type SeedJamaah = {
    nama: string; nik: string; kloter: string; porsi: string; usia: number;
    kelamin: "L" | "P"; alamat: string; hp: string; kontakKeluarga: string;
    bandara: string; kabupatenKota: string; puskesmas: string; dokterKeluarga: string;
    tibaHari: number;
  };

  const jamaahList: SeedJamaah[] = [
    { nama: "H. Ahmad Suryana", nik: "3201010101800001", kloter: "JKT-08", porsi: "H-2024-001234", usia: 68, kelamin: "L", alamat: "Jl. Melati No. 12, Bekasi", hp: "081234560001", kontakKeluarga: "Andi (anak) 081299880001", bandara: "Soekarno-Hatta", kabupatenKota: "Kota Bekasi", puskesmas: "Puskesmas Bekasi Selatan", dokterKeluarga: "dr. Rina Kartika", tibaHari: 3 },
    { nama: "Hj. Siti Aminah", nik: "3202020202700002", kloter: "JKT-08", porsi: "H-2024-001235", usia: 65, kelamin: "P", alamat: "Jl. Mawar No. 8, Bekasi", hp: "081234560002", kontakKeluarga: "Dewi (anak) 081299880002", bandara: "Soekarno-Hatta", kabupatenKota: "Kota Bekasi", puskesmas: "Puskesmas Bekasi Selatan", dokterKeluarga: "dr. Rina Kartika", tibaHari: 3 },
    { nama: "H. Bambang Wijaya", nik: "3203030303720003", kloter: "JKT-12", porsi: "H-2024-002345", usia: 72, kelamin: "L", alamat: "Jl. Anggrek No. 45, Jakarta Timur", hp: "081234560003", kontakKeluarga: "Rizki (anak) 081299880003", bandara: "Soekarno-Hatta", kabupatenKota: "Kota Jakarta Timur", puskesmas: "Puskesmas Jatinegara", dokterKeluarga: "dr. Hartono, Sp.JP", tibaHari: 6 },
    { nama: "Hj. Fatimah Zahra", nik: "3204040404700004", kloter: "JKT-12", porsi: "H-2024-002346", usia: 70, kelamin: "P", alamat: "Jl. Kenanga No. 22, Jakarta Timur", hp: "081234560004", kontakKeluarga: "Hendra (anak) 081299880004", bandara: "Soekarno-Hatta", kabupatenKota: "Kota Jakarta Timur", puskesmas: "Puskesmas Jatinegara", dokterKeluarga: "dr. Hartono, Sp.JP", tibaHari: 6 },
    { nama: "H. Slamet Riyadi", nik: "3205050505750005", kloter: "SUB-03", porsi: "H-2024-003456", usia: 75, kelamin: "L", alamat: "Jl. Cempaka No. 3, Bandung", hp: "081234560005", kontakKeluarga: "Bagus (anak) 081299880005", bandara: "Husein Sastranegara", kabupatenKota: "Kota Bandung", puskesmas: "Puskesmas Coblong", dokterKeluarga: "dr. Tya Pratiwi", tibaHari: 10 },
    { nama: "Hj. Khadijah Nur", nik: "3206060606630006", kloter: "SUB-03", porsi: "H-2024-003457", usia: 63, kelamin: "P", alamat: "Jl. Dahlia No. 17, Bandung", hp: "081234560006", kontakKeluarga: "Fajar (anak) 081299880006", bandara: "Husein Sastranegara", kabupatenKota: "Kota Bandung", puskesmas: "Puskesmas Coblong", dokterKeluarga: "dr. Tya Pratiwi", tibaHari: 10 },
    { nama: "H. Yusuf Mansur", nik: "3207070707690007", kloter: "JKT-15", porsi: "H-2024-004567", usia: 69, kelamin: "L", alamat: "Jl. Flamboyan No. 9, Depok", hp: "081234560007", kontakKeluarga: "Lina (anak) 081299880007", bandara: "Soekarno-Hatta", kabupatenKota: "Kota Depok", puskesmas: "Puskesmas Beji", dokterKeluarga: "dr. Surya Atmaja", tibaHari: 1 },
    { nama: "Hj. Maryam Salma", nik: "3208080808670008", kloter: "JKT-15", porsi: "H-2024-004568", usia: 67, kelamin: "P", alamat: "Jl. Bougenville No. 14, Depok", hp: "081234560008", kontakKeluarga: "Galih (anak) 081299880008", bandara: "Soekarno-Hatta", kabupatenKota: "Kota Depok", puskesmas: "Puskesmas Beji", dokterKeluarga: "dr. Surya Atmaja", tibaHari: 1 },
    { nama: "H. Abdul Rahman", nik: "3209090909740009", kloter: "SUB-05", porsi: "H-2024-005678", usia: 74, kelamin: "L", alamat: "Jl. Teratai No. 6, Bandung", hp: "081234560009", kontakKeluarga: "Yusuf (anak) 081299880009", bandara: "Husein Sastranegara", kabupatenKota: "Kota Bandung", puskesmas: "Puskesmas Sukajadi", dokterKeluarga: "dr. Maya Sari", tibaHari: 14 },
    { nama: "Hj. Aisyah Putri", nik: "3201010102660010", kloter: "SUB-05", porsi: "H-2024-005679", usia: 66, kelamin: "P", alamat: "Jl. Sakura No. 11, Bandung", hp: "081234560010", kontakKeluarga: "Rama (anak) 081299880010", bandara: "Husein Sastranegara", kabupatenKota: "Kota Bandung", puskesmas: "Puskesmas Sukajadi", dokterKeluarga: "dr. Maya Sari", tibaHari: 14 },
  ];

  const created = [];
  for (const j of jamaahList) {
    created.push(
      await db.jamaah.create({
        data: {
          nama: j.nama, nik: j.nik, kloter: j.kloter, porsi: j.porsi, usia: j.usia,
          kelamin: j.kelamin, alamat: j.alamat, hp: j.hp, kontakKeluarga: j.kontakKeluarga,
          tanggalTiba: tibaOffset(j.tibaHari), bandara: j.bandara, kabupatenKota: j.kabupatenKota,
          puskesmas: j.puskesmas, dokterKeluarga: j.dokterKeluarga,
        },
      })
    );
  }

  // Helper untuk membuat skrining
  const addScreening = (jamaahId: string, jenis: string, hariKe: number, data: object, skor: string, catatan = "", ageDays = 0) =>
    db.screening.create({
      data: {
        jamaahId, jenis, hariKe, data: JSON.stringify(data), skor, catatan,
        createdAt: new Date(Date.now() - ageDays * 86400000),
      },
    });

  const addVital = (jamaahId: string, hariKe: number, v: Record<string, number | null>, ageDays = 0, catatan = "") =>
    db.vitalSign.create({
      data: { jamaahId, hariKe, catatan, createdAt: new Date(Date.now() - ageDays * 86400000), ...v },
    });

  // ===== 1. Ahmad Suryana — MERAH (demam+sesak, SpO2 92, DM tdk terkontrol, frail) =====
  const a = created[0];
  await addScreening(a.id, "INFECTIOUS", 1, {
    ispa_demam: true, ispa_batuk: true, ispa_pilek: true, ispa_tenggorok: false, ispa_sesak: true,
    pneu_napasCepat: true, pneu_nyeriDada: false, pneu_batukDahak: true,
    covid_demam: true, covid_batuk: true, covid_hilangPenciuman: false, covid_sesak: true,
    mers_demam: false, mers_batuk: false, mers_sesak: false, mers_kontak: false,
    gastro_diare: false, gastro_mual: false, gastro_muntah: false, gastro_nyeri: false,
  }, "Tinggi", "Suspek pneumonia pasca haji", 1);
  await addScreening(a.id, "CHRONIC", 1, {
    dm_gulaDarah: 285, dm_tidakPatuh: false, dm_hipo: false,
    ht_td: "150/90", ht_tidakPatuh: false,
    jantung_sesak: false, jantung_bengkak: false, jantung_nyeriDada: false,
    ppok_sesak: false, ppok_frekuensi: 0, ppok_inhaler: false,
    ginjal_kontrol: "rutin", ginjal_edema: false,
  }, "Tidak Terkontrol", "Gula darah tinggi", 1);
  await addScreening(a.id, "FRAILTY", 1, {
    fatigue: 1, resistance: 1, ambulation: 1, illness: 1, lossWeight: 0,
  }, "Frail", "", 1);
  await addScreening(a.id, "FALL_RISK", 1, {
    jatuhSetahun: true, gangguanKeseimbangan: true, alatBantu: true,
  }, "Tinggi", "", 1);
  await addScreening(a.id, "FAMILY_APGAR", 1, {
    adaptation: 2, partnership: 2, growth: 1, affection: 2, resolve: 2,
  }, "Fungsional", "", 1);
  await addVital(a.id, 1, { tdSistolik: 150, tdDiastolik: 90, nadi: 108, rr: 26, suhu: 38.4, spo2: 92, beratBadan: 58, gulaDarah: 285 }, 1, "Demam, sesak");
  await addVital(a.id, 7, { tdSistolik: 142, tdDiastolik: 88, nadi: 96, rr: 22, suhu: 37.2, spo2: 95, beratBadan: 57, gulaDarah: 210 }, 0, "Membaik");

  // ===== 2. Siti Aminah — KUNING (batuk ringan, pre-frail, hipertensi) =====
  const s = created[1];
  await addScreening(s.id, "INFECTIOUS", 1, {
    ispa_demam: false, ispa_batuk: true, ispa_pilek: true, ispa_tenggorok: true, ispa_sesak: false,
    pneu_napasCepat: false, pneu_nyeriDada: false, pneu_batukDahak: false,
    covid_demam: false, covid_batuk: true, covid_hilangPenciuman: false, covid_sesak: false,
    mers_demam: false, mers_batuk: false, mers_sesak: false, mers_kontak: false,
    gastro_diare: false, gastro_mual: false, gastro_muntah: false, gastro_nyeri: false,
  }, "Sedang", "Gejala ISPA ringan", 3);
  await addScreening(s.id, "CHRONIC", 1, {
    dm_gulaDarah: null, dm_tidakPatuh: false, dm_hipo: false,
    ht_td: "148/92", ht_tidakPatuh: false,
    jantung_sesak: false, jantung_bengkak: false, jantung_nyeriDada: false,
    ppok_sesak: false, ppok_frekuensi: 0, ppok_inhaler: false,
    ginjal_kontrol: "", ginjal_edema: false,
  }, "Perlu Pemantauan", "Hipertensi terkontrol sebagian", 3);
  await addScreening(s.id, "FRAILTY", 1, {
    fatigue: 1, resistance: 0, ambulation: 0, illness: 1, lossWeight: 0,
  }, "Pre-frail", "", 3);
  await addScreening(s.id, "MENTAL", 7, {
    phq9_1: 1, phq9_2: 1, phq9_3: 0, phq9_4: 1, phq9_5: 0, phq9_6: 0, phq9_7: 0, phq9_8: 0, phq9_9: 0,
    phq9_total: 3, phq9_bunuhDiri: 0,
    gad7_1: 1, gad7_2: 1, gad7_3: 0, gad7_4: 0, gad7_5: 0, gad7_6: 0, gad7_7: 0, gad7_total: 2,
  }, "Minimal", "", 0);
  await addScreening(s.id, "FAMILY_APGAR", 1, {
    adaptation: 2, partnership: 2, growth: 2, affection: 2, resolve: 1,
  }, "Fungsional", "", 3);
  await addVital(s.id, 1, { tdSistolik: 148, tdDiastolik: 92, nadi: 84, rr: 18, suhu: 36.8, spo2: 97, beratBadan: 62, gulaDarah: 110 }, 3);
  await addVital(s.id, 7, { tdSistolik: 140, tdDiastolik: 88, nadi: 80, rr: 18, suhu: 36.7, spo2: 98, beratBadan: 62, gulaDarah: 105 }, 0);

  // ===== 3. Bambang Wijaya — MERAH (nyeri dada, jantung, PHQ sedang) =====
  const b = created[2];
  await addScreening(b.id, "INFECTIOUS", 1, {
    ispa_demam: false, ispa_batuk: false, ispa_pilek: false, ispa_tenggorok: false, ispa_sesak: true,
    pneu_napasCepat: false, pneu_nyeriDada: true, pneu_batukDahak: false,
    covid_demam: false, covid_batuk: false, covid_hilangPenciuman: false, covid_sesak: false,
    mers_demam: false, mers_batuk: false, mers_sesak: false, mers_kontak: false,
    gastro_diare: false, gastro_mual: false, gastro_muntah: false, gastro_nyeri: false,
  }, "Sedang", "Sesak + nyeri dada", 5);
  await addScreening(b.id, "CHRONIC", 1, {
    dm_gulaDarah: null, dm_tidakPatuh: false, dm_hipo: false,
    ht_td: "155/95", ht_tidakPatuh: true,
    jantung_sesak: true, jantung_bengkak: true, jantung_nyeriDada: true,
    ppok_sesak: false, ppok_frekuensi: 0, ppok_inhaler: false,
    ginjal_kontrol: "", ginjal_edema: false,
  }, "Tidak Terkontrol", "Suspek dekompensasi jantung", 5);
  await addScreening(b.id, "MENTAL", 7, {
    phq9_1: 2, phq9_2: 2, phq9_3: 1, phq9_4: 2, phq9_5: 1, phq9_6: 1, phq9_7: 1, phq9_8: 1, phq9_9: 0,
    phq9_total: 11, phq9_bunuhDiri: 0,
    gad7_1: 2, gad7_2: 2, gad7_3: 1, gad7_4: 1, gad7_5: 1, gad7_6: 1, gad7_7: 1, gad7_total: 9,
  }, "Sedang", "Cemas terkait kondisi jantung", 0);
  await addVital(b.id, 1, { tdSistolik: 155, tdDiastolik: 95, nadi: 98, rr: 24, suhu: 36.9, spo2: 93, beratBadan: 70, gulaDarah: null }, 5, "Sesak, nyeri dada");

  // ===== 4. Fatimah Zahra — HIJAU (stabil, robust) =====
  const f = created[3];
  await addScreening(f.id, "INFECTIOUS", 1, {
    ispa_demam: false, ispa_batuk: false, ispa_pilek: false, ispa_tenggorok: false, ispa_sesak: false,
    pneu_napasCepat: false, pneu_nyeriDada: false, pneu_batukDahak: false,
    covid_demam: false, covid_batuk: false, covid_hilangPenciuman: false, covid_sesak: false,
    mers_demam: false, mers_batuk: false, mers_sesak: false, mers_kontak: false,
    gastro_diare: false, gastro_mual: false, gastro_muntah: false, gastro_nyeri: false,
  }, "Rendah", "Asimptomatik", 5);
  await addScreening(f.id, "FRAILTY", 1, {
    fatigue: 0, resistance: 0, ambulation: 0, illness: 0, lossWeight: 0,
  }, "Robust", "", 5);
  await addScreening(f.id, "NUTRITION", 14, {
    nafsuMakan: 2, penurunanBB: 3, mobilitas: 2, stresAkut: 2, neuropsikologis: 2, imt: 2,
  }, "Normal", "", 0);
  await addScreening(f.id, "SPIRITUAL", 7, {
    ibadahRutin: true, ketenangan: true, hambatanIbadah: false,
  }, "Baik", "Merasa tenang pasca haji", 0);
  await addScreening(f.id, "FAMILY_APGAR", 1, {
    adaptation: 2, partnership: 2, growth: 2, affection: 2, resolve: 2,
  }, "Fungsional", "", 5);
  await addVital(f.id, 1, { tdSistolik: 122, tdDiastolik: 78, nadi: 76, rr: 16, suhu: 36.6, spo2: 98, beratBadan: 55, gulaDarah: 95 }, 5);
  await addVital(f.id, 14, { tdSistolik: 120, tdDiastolik: 76, nadi: 74, rr: 16, suhu: 36.5, spo2: 99, beratBadan: 55, gulaDarah: 92 }, 0);

  // ===== 5. Slamet Riyadi — KUNING (fall risk sedang, risiko malnutrisi, insomnia) =====
  const sl = created[4];
  await addScreening(sl.id, "FRAILTY", 1, {
    fatigue: 1, resistance: 1, ambulation: 1, illness: 0, lossWeight: 1,
  }, "Pre-frail", "", 9);
  await addScreening(sl.id, "FALL_RISK", 1, {
    jatuhSetahun: true, gangguanKeseimbangan: true, alatBantu: false,
  }, "Sedang", "", 9);
  await addScreening(sl.id, "NUTRITION", 14, {
    nafsuMakan: 1, penurunanBB: 1, mobilitas: 2, stresAkut: 1, neuropsikologis: 1, imt: 2,
  }, "Risiko Malnutrisi", "", 0);
  await addScreening(sl.id, "SLEEP", 7, {
    sulitTidur: 2, seringTerbangun: 3, tidakNyenyak: 2,
  }, "Insomnia Sedang", "Sulit tidur sejak pulang", 0);
  await addScreening(sl.id, "MENTAL", 7, {
    phq9_1: 1, phq9_2: 1, phq9_3: 0, phq9_4: 0, phq9_5: 0, phq9_6: 0, phq9_7: 0, phq9_8: 1, phq9_9: 0,
    phq9_total: 3, phq9_bunuhDiri: 0,
    gad7_1: 1, gad7_2: 1, gad7_3: 1, gad7_4: 0, gad7_5: 0, gad7_6: 0, gad7_7: 0, gad7_total: 3,
  }, "Minimal", "", 0);
  await addVital(sl.id, 1, { tdSistolik: 138, tdDiastolik: 84, nadi: 78, rr: 18, suhu: 36.7, spo2: 97, beratBadan: 52, gulaDarah: null }, 9);

  // ===== 6. Khadijah Nur — HIJAU (sehat) =====
  const k = created[5];
  await addScreening(k.id, "INFECTIOUS", 1, {
    ispa_demam: false, ispa_batuk: false, ispa_pilek: false, ispa_tenggorok: false, ispa_sesak: false,
    pneu_napasCepat: false, pneu_nyeriDada: false, pneu_batukDahak: false,
    covid_demam: false, covid_batuk: false, covid_hilangPenciuman: false, covid_sesak: false,
    mers_demam: false, mers_batuk: false, mers_sesak: false, mers_kontak: false,
    gastro_diare: false, gastro_mual: false, gastro_muntah: false, gastro_nyeri: false,
  }, "Rendah", "", 9);
  await addScreening(k.id, "FRAILTY", 1, {
    fatigue: 0, resistance: 0, ambulation: 0, illness: 0, lossWeight: 0,
  }, "Robust", "", 9);
  await addScreening(k.id, "SPIRITUAL", 7, {
    ibadahRutin: true, ketenangan: true, hambatanIbadah: false,
  }, "Baik", "", 0);
  await addVital(k.id, 1, { tdSistolik: 118, tdDiastolik: 75, nadi: 72, rr: 16, suhu: 36.5, spo2: 99, beratBadan: 58, gulaDarah: 88 }, 9);

  // ===== 7. Yusuf Mansur — MERAH (gula 280, frail, depresi berat) =====
  const y = created[6];
  await addScreening(y.id, "CHRONIC", 1, {
    dm_gulaDarah: 280, dm_tidakPatuh: true, dm_hipo: false,
    ht_td: "160/100", ht_tidakPatuh: true,
    jantung_sesak: false, jantung_bengkak: false, jantung_nyeriDada: false,
    ppok_sesak: false, ppok_frekuensi: 0, ppok_inhaler: false,
    ginjal_kontrol: "", ginjal_edema: false,
  }, "Tidak Terkontrol", "DM+HT tidak patuh obat", 0);
  await addScreening(y.id, "FRAILTY", 1, {
    fatigue: 1, resistance: 1, ambulation: 1, illness: 1, lossWeight: 1,
  }, "Frail", "", 0);
  await addScreening(y.id, "MENTAL", 1, {
    phq9_1: 3, phq9_2: 3, phq9_3: 2, phq9_4: 2, phq9_5: 2, phq9_6: 1, phq9_7: 2, phq9_8: 2, phq9_9: 1,
    phq9_total: 18, phq9_bunuhDiri: 1,
    gad7_1: 3, gad7_2: 3, gad7_3: 2, gad7_4: 2, gad7_5: 2, gad7_6: 2, gad7_7: 1, gad7_total: 15,
  }, "Sedang-Berat", "Pikiran menyakiti diri perlu intervensi krisis", 0);
  await addScreening(y.id, "FOLLOWUP", 1, {
    kontrolDokter: true, homeVisit: true, konsultasiGizi: true, rehabilitasi: false, konselingPsikologis: true,
  }, "Perlu Tindak Lanjut", "Prioritas home visit", 0);
  await addVital(y.id, 1, { tdSistolik: 160, tdDiastolik: 100, nadi: 92, rr: 20, suhu: 36.8, spo2: 96, beratBadan: 60, gulaDarah: 280 }, 0, "Tidak patuh obat");

  // ===== 8. Maryam Salma — KUNING (PPOK sering sesak, APGAR sedang) =====
  const m = created[7];
  await addScreening(m.id, "CHRONIC", 1, {
    dm_gulaDarah: null, dm_tidakPatuh: false, dm_hipo: false,
    ht_td: "135/85", ht_tidakPatuh: false,
    jantung_sesak: false, jantung_bengkak: false, jantung_nyeriDada: false,
    ppok_sesak: true, ppok_frekuensi: 4, ppok_inhaler: true,
    ginjal_kontrol: "", ginjal_edema: false,
  }, "Perlu Pemantauan", "PPOK eksaserbasi sering", 0);
  await addScreening(m.id, "FAMILY_APGAR", 1, {
    adaptation: 1, partnership: 1, growth: 1, affection: 1, resolve: 1,
  }, "Disfungsi Sedang", "Dukungan keluarga terbatas", 0);
  await addScreening(m.id, "SLEEP", 7, {
    sulitTidur: 1, seringTerbangun: 2, tidakNyenyak: 1,
  }, "Insomnia Subklinis", "", 0);
  await addVital(m.id, 1, { tdSistolik: 135, tdDiastolik: 85, nadi: 88, rr: 22, suhu: 36.7, spo2: 94, beratBadan: 48, gulaDarah: null }, 0, "Sering sesak");

  // ===== 9. Abdul Rahman — KUNING (ketergantungan ADL, spiritual pendampingan) =====
  const ar = created[8];
  await addScreening(ar.id, "FRAILTY", 1, {
    fatigue: 1, resistance: 1, ambulation: 1, illness: 1, lossWeight: 1,
  }, "Frail", "", 13);
  await addScreening(ar.id, "ACTIVITY", 14, {
    jalanMandiri: false, aktivitasNormal: false, butuhBantuan: true,
  }, "Ketergantungan", "Perlu bantuan keluarga ADL", 0);
  await addScreening(ar.id, "SPIRITUAL", 7, {
    ibadahRutin: false, ketenangan: false, hambatanIbadah: true,
  }, "Perlu Pendampingan", "Sulit ibadah akibat kondisi fisik", 0);
  await addScreening(ar.id, "FALL_RISK", 1, {
    jatuhSetahun: true, gangguanKeseimbangan: true, alatBantu: true,
  }, "Tinggi", "", 13);
  await addScreening(ar.id, "FOLLOWUP", 14, {
    kontrolDokter: true, homeVisit: true, konsultasiGizi: true, rehabilitasi: true, konselingPsikologis: false,
  }, "Perlu Tindak Lanjut", "Home visit + rehabilitasi", 0);
  await addVital(ar.id, 1, { tdSistolik: 145, tdDiastolik: 86, nadi: 82, rr: 19, suhu: 36.6, spo2: 95, beratBadan: 50, gulaDarah: null }, 13);

  // ===== 10. Aisyah Putri — HIJAU (stabil) =====
  const ai = created[9];
  await addScreening(ai.id, "INFECTIOUS", 1, {
    ispa_demam: false, ispa_batuk: false, ispa_pilek: false, ispa_tenggorok: false, ispa_sesak: false,
    pneu_napasCepat: false, pneu_nyeriDada: false, pneu_batukDahak: false,
    covid_demam: false, covid_batuk: false, covid_hilangPenciuman: false, covid_sesak: false,
    mers_demam: false, mers_batuk: false, mers_sesak: false, mers_kontak: false,
    gastro_diare: false, gastro_mual: false, gastro_muntah: false, gastro_nyeri: false,
  }, "Rendah", "", 13);
  await addScreening(ai.id, "FRAILTY", 1, {
    fatigue: 0, resistance: 0, ambulation: 0, illness: 0, lossWeight: 0,
  }, "Robust", "", 13);
  await addScreening(ai.id, "SPIRITUAL", 7, {
    ibadahRutin: true, ketenangan: true, hambatanIbadah: false,
  }, "Baik", "", 0);
  await addScreening(ai.id, "NUTRITION", 14, {
    nafsuMakan: 2, penurunanBB: 3, mobilitas: 2, stresAkut: 2, neuropsikologis: 2, imt: 2,
  }, "Normal", "", 0);
  await addVital(ai.id, 1, { tdSistolik: 120, tdDiastolik: 78, nadi: 74, rr: 16, suhu: 36.5, spo2: 98, beratBadan: 56, gulaDarah: 90 }, 13);
  await addVital(ai.id, 14, { tdSistolik: 118, tdDiastolik: 76, nadi: 72, rr: 16, suhu: 36.4, spo2: 99, beratBadan: 56, gulaDarah: 88 }, 0);

  // Update riskLevel & riskSummary untuk semua jamaah
  console.log("✅ Seed selesai. Total jamaah:", created.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
