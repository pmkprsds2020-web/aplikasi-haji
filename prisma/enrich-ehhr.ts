// Enrich existing 10 jamaah with EHHR profile fields + pre-haji sample data
import { db } from "../src/lib/db";

async function main() {
  const all = await db.jamaah.findMany();
  const GOL = ["O+", "A+", "B+", "AB+", "O-", "A-", "B+", "AB+", "O+", "A+"];
  const EMB = ["Jakarta (Bekasi)", "Jakarta (Soekarno-Hatta)", "Bandung (Husein)", "Jakarta (Soekarno-Hatta)", "Bandung (Husein)", "Bandung (Husein)", "Jakarta (Soekarno-Hatta)", "Jakarta (Soekarno-Hatta)", "Bandung (Husein)", "Bandung (Husein)"];

  for (let i = 0; i < all.length; i++) {
    const j = all[i];
    const berangkat = new Date(j.tanggalTiba.getTime() - 45 * 86400000); // 45 hari sebelum tiba
    await db.jamaah.update({
      where: { id: j.id },
      data: {
        paspor: `P${(2024000 + i).toString()}`,
        embarkasi: EMB[i % EMB.length],
        golDarah: GOL[i % GOL.length],
        riwayatPenyakit: [
          "Hipertensi", "Diabetes Mellitus tipe 2", "Hipertensi + DM", "Tidak ada",
          "PPOK", "Tidak ada", "Hipertensi, DM, Penyakit Jantung Koroner", "PPOK",
          "Hipertensi, Osteoarthritis", "Tidak ada",
        ][i],
        riwayatOperasi: ["Appendectomy 2010", "-", "-", "-", "-", "-", "CABG 2018", "-", "Prostatektomi 2015", "-"][i],
        alergi: ["-", "Penisilin", "-", "-", "-", "Makanan laut", "Sulfonamida", "-", "-", "-"][i],
        obatRutin: [
          "Amlodipine 10mg, Metformin 1000mg",
          "Amlodipine 5mg",
          "Bisoprolol, Furosemide, Isosorbide",
          "-",
          "Salbutamol inhaler",
          "-",
          "Amlodipine 10mg, Metformin 1000mg, Aspilet 80mg",
          "Tiotropium inhaler",
          "Amlodipine 5mg, Paracetamol prn",
          "-",
        ][i],
        statusIstithaah: ["Bersyarat", "Laik", "Bersyarat", "Laik", "Bersyarat", "Laik", "Tidak Laik", "Bersyarat", "Bersyarat", "Laik"][i],
        tanggalBerangkat: berangkat,
        tanggalPulang: j.tanggalTiba,
      },
    });

    // PreHajjChronic
    const chronicMap = [
      { hipertensi: "Tidak Terkontrol", diabetes: "Tidak Terkontrol", ppok: "Tidak", ckd: "Tidak", jantung: "Tidak", stroke: "Tidak", kanker: "Tidak" },
      { hipertensi: "Terkontrol", diabetes: "Tidak", ppok: "Tidak", ckd: "Tidak", jantung: "Tidak", stroke: "Tidak", kanker: "Tidak" },
      { hipertensi: "Tidak Terkontrol", diabetes: "Tidak", ppok: "Tidak", ckd: "Tidak", jantung: "Tidak Terkontrol", stroke: "Tidak", kanker: "Tidak" },
      { hipertensi: "Tidak", diabetes: "Tidak", ppok: "Tidak", ckd: "Tidak", jantung: "Tidak", stroke: "Tidak", kanker: "Tidak" },
      { hipertensi: "Terkontrol", diabetes: "Tidak", ppok: "Tidak", ckd: "Tidak", jantung: "Tidak", stroke: "Tidak", kanker: "Tidak" },
      { hipertensi: "Tidak", diabetes: "Tidak", ppok: "Tidak", ckd: "Tidak", jantung: "Tidak", stroke: "Tidak", kanker: "Tidak" },
      { hipertensi: "Tidak Terkontrol", diabetes: "Tidak Terkontrol", ppok: "Tidak", ckd: "Tidak", jantung: "Terkontrol", stroke: "Tidak", kanker: "Tidak" },
      { hipertensi: "Terkontrol", diabetes: "Tidak", ppok: "Tidak Terkontrol", ckd: "Tidak", jantung: "Tidak", stroke: "Tidak", kanker: "Tidak" },
      { hipertensi: "Terkontrol", diabetes: "Tidak", ppok: "Tidak", ckd: "Tidak", jantung: "Tidak", stroke: "Tidak", kanker: "Tidak" },
      { hipertensi: "Tidak", diabetes: "Tidak", ppok: "Tidak", ckd: "Tidak", jantung: "Tidak", stroke: "Tidak", kanker: "Tidak" },
    ];
    await db.preHajjChronic.upsert({
      where: { jamaahId: j.id },
      create: { jamaahId: j.id, ...chronicMap[i], obatRutin: ["Amlodipine, Metformin", "Amlodipine", "Bisoprolol, Furosemide", "-", "Salbutamol", "-", "Amlodipine, Metformin, Aspilet", "Tiotropium", "Amlodipine", "-"][i], targetTerapi: ["TD <140/90, HbA1c <7%", "TD <140/90", "Kontrol kardiolog 1 bl", "-", "Bebas sesak", "-", "TD <130/80, HbA1c <7%", "Bebas sesak", "TD <140/90", "-"][i] },
      update: {},
    });

    // PreHajjVital (1-2 records)
    const vmap = [
      { tdSistolik: 150, tdDiastolik: 90, nadi: 88, rr: 18, suhu: 36.7, spo2: 97, beratBadan: 60, tinggiBadan: 165, lingkarPerut: 95 },
      { tdSistolik: 140, tdDiastolik: 88, nadi: 80, rr: 18, suhu: 36.6, spo2: 98, beratBadan: 62, tinggiBadan: 158, lingkarPerut: 90 },
      { tdSistolik: 145, tdDiastolik: 92, nadi: 86, rr: 20, suhu: 36.7, spo2: 96, beratBadan: 70, tinggiBadan: 168, lingkarPerut: 98 },
      { tdSistolik: 122, tdDiastolik: 78, nadi: 76, rr: 16, suhu: 36.5, spo2: 99, beratBadan: 55, tinggiBadan: 155, lingkarPerut: 80 },
      { tdSistolik: 135, tdDiastolik: 84, nadi: 78, rr: 18, suhu: 36.6, spo2: 97, beratBadan: 52, tinggiBadan: 160, lingkarPerut: 85 },
      { tdSistolik: 118, tdDiastolik: 75, nadi: 72, rr: 16, suhu: 36.5, spo2: 99, beratBadan: 58, tinggiBadan: 152, lingkarPerut: 78 },
      { tdSistolik: 160, tdDiastolik: 100, nadi: 92, rr: 20, suhu: 36.8, spo2: 96, beratBadan: 60, tinggiBadan: 162, lingkarPerut: 96 },
      { tdSistolik: 132, tdDiastolik: 84, nadi: 88, rr: 22, suhu: 36.7, spo2: 94, beratBadan: 48, tinggiBadan: 150, lingkarPerut: 82 },
      { tdSistolik: 142, tdDiastolik: 86, nadi: 82, rr: 19, suhu: 36.6, spo2: 95, beratBadan: 50, tinggiBadan: 163, lingkarPerut: 88 },
      { tdSistolik: 120, tdDiastolik: 76, nadi: 74, rr: 16, suhu: 36.4, spo2: 98, beratBadan: 56, tinggiBadan: 154, lingkarPerut: 79 },
    ];
    await db.preHajjVital.create({
      data: { jamaahId: j.id, ...vmap[i], createdAt: new Date(j.tanggalTiba.getTime() - 60 * 86400000) },
    });

    // PreHajjLab
    const lmap = [
      { hb: 13.5, gdp: 180, gd2pp: 240, hba1c: 8.2, kolesterol: 220, hdl: 38, ldl: 150, trigliserida: 180, asamUrat: 6.5, sgot: 30, sgpt: 35, kreatinin: 1.0, egfr: 85, urinalisis: "Protein +1" },
      { hb: 12.8, gdp: 100, gd2pp: 130, hba1c: 5.6, kolesterol: 200, hdl: 45, ldl: 120, trigliserida: 140, asamUrat: 5.0, sgot: 25, sgpt: 22, kreatinin: 0.8, egfr: 95, urinalisis: "Normal" },
      { hb: 13.0, gdp: 110, gd2pp: 140, hba1c: 5.8, kolesterol: 240, hdl: 35, ldl: 170, trigliserida: 200, asamUrat: 7.2, sgot: 40, sgpt: 45, kreatinin: 1.2, egfr: 70, urinalisis: "Normal" },
      { hb: 12.5, gdp: 90, gd2pp: 120, hba1c: 5.2, kolesterol: 180, hdl: 55, ldl: 100, trigliserida: 120, asamUrat: 4.5, sgot: 20, sgpt: 18, kreatinin: 0.7, egfr: 100, urinalisis: "Normal" },
      { hb: 13.2, gdp: 95, gd2pp: 125, hba1c: 5.4, kolesterol: 210, hdl: 42, ldl: 130, trigliserida: 150, asamUrat: 5.8, sgot: 28, sgpt: 30, kreatinin: 0.9, egfr: 90, urinalisis: "Normal" },
      { hb: 12.0, gdp: 88, gd2pp: 115, hba1c: 5.1, kolesterol: 175, hdl: 58, ldl: 95, trigliserida: 110, asamUrat: 4.0, sgot: 18, sgpt: 16, kreatinin: 0.7, egfr: 98, urinalisis: "Normal" },
      { hb: 14.0, gdp: 200, gd2pp: 280, hba1c: 9.0, kolesterol: 260, hdl: 32, ldl: 190, trigliserida: 220, asamUrat: 7.8, sgot: 45, sgpt: 50, kreatinin: 1.3, egfr: 65, urinalisis: "Protein +1, Glukosa +2" },
      { hb: 12.6, gdp: 100, gd2pp: 135, hba1c: 5.7, kolesterol: 195, hdl: 44, ldl: 118, trigliserida: 145, asamUrat: 5.2, sgot: 26, sgpt: 24, kreatinin: 0.85, egfr: 92, urinalisis: "Normal" },
      { hb: 11.8, gdp: 92, gd2pp: 122, hba1c: 5.3, kolesterol: 205, hdl: 43, ldl: 125, trigliserida: 138, asamUrat: 5.5, sgot: 24, sgpt: 26, kreatinin: 0.9, egfr: 88, urinalisis: "Normal" },
      { hb: 12.7, gdp: 89, gd2pp: 118, hba1c: 5.0, kolesterol: 170, hdl: 56, ldl: 92, trigliserida: 105, asamUrat: 4.2, sgot: 19, sgpt: 17, kreatinin: 0.7, egfr: 99, urinalisis: "Normal" },
    ];
    await db.preHajjLab.create({
      data: { jamaahId: j.id, ...lmap[i], createdAt: new Date(j.tanggalTiba.getTime() - 55 * 86400000) },
    });

    // PreHajjImmunization — semua dapat meningitis (wajib), variasi lainnya
    const imunisasiBase = new Date(j.tanggalTiba.getTime() - 50 * 86400000);
    await db.preHajjImmunization.create({ data: { jamaahId: j.id, jenis: "MENINGITIS", tanggalVaksin: imunisasiBase, nomorBatch: `MN-${2024}-${1000 + i}`, catatan: "Quadrivalent ACWY" } });
    if (i % 2 === 0) await db.preHajjImmunization.create({ data: { jamaahId: j.id, jenis: "INFLUENZA", tanggalVaksin: imunisasiBase, nomorBatch: `FL-${2024}-${2000 + i}` } });
    if (i % 3 === 0) await db.preHajjImmunization.create({ data: { jamaahId: j.id, jenis: "COVID", tanggalVaksin: imunisasiBase, nomorBatch: `CV-${2024}-${3000 + i}`, catatan: "Booster ke-3" } });
    if (i % 4 === 0) await db.preHajjImmunization.create({ data: { jamaahId: j.id, jenis: "PNEUMOKOKUS", tanggalVaksin: imunisasiBase, nomorBatch: `PN-${2024}-${4000 + i}` } });

    // PreHajjEducation
    const eduFull = { diet: true, aktivitas: true, obat: true, hidrasi: true, istirahat: true, manajemenKronis: true, persiapanPerjalanan: true };
    const eduPartial = { diet: true, aktivitas: false, obat: true, hidrasi: true, istirahat: false, manajemenKronis: false, persiapanPerjalanan: true };
    await db.preHajjEducation.upsert({
      where: { jamaahId: j.id },
      create: { jamaahId: j.id, ...(i % 3 === 0 ? eduFull : eduPartial) },
      update: {},
    });

    // PreHajjFitness
    await db.preHajjFitness.create({
      data: { jamaahId: j.id, targetLangkah: 8000, jalanKaki: 30, aerobik: 20, kekuatan: 15, pernafasan: 10, createdAt: new Date(j.tanggalTiba.getTime() - 40 * 86400000) },
    });

    // PreHajjMedication
    const meds = [
      [{ namaObat: "Amlodipine", dosis: "10mg", frekuensi: "1x/hari", indikasi: "Hipertensi" }, { namaObat: "Metformin", dosis: "1000mg", frekuensi: "2x/hari", indikasi: "DM tipe 2" }],
      [{ namaObat: "Amlodipine", dosis: "5mg", frekuensi: "1x/hari", indikasi: "Hipertensi" }],
      [{ namaObat: "Bisoprolol", dosis: "5mg", frekuensi: "1x/hari", indikasi: "Jantung" }, { namaObat: "Furosemide", dosis: "40mg", frekuensi: "1x/hari", indikasi: "Edema" }],
      [],
      [{ namaObat: "Salbutamol Inhaler", dosis: "100mcg", frekuensi: "prn", indikasi: "PPOK" }],
      [],
      [{ namaObat: "Amlodipine", dosis: "10mg", frekuensi: "1x/hari", indikasi: "Hipertensi" }, { namaObat: "Metformin", dosis: "1000mg", frekuensi: "2x/hari", indikasi: "DM" }, { namaObat: "Aspilet", dosis: "80mg", frekuensi: "1x/hari", indikasi: "PJK" }],
      [{ namaObat: "Tiotropium Inhaler", dosis: "18mcg", frekuensi: "1x/hari", indikasi: "PPOK" }],
      [{ namaObat: "Amlodipine", dosis: "5mg", frekuensi: "1x/hari", indikasi: "Hipertensi" }],
      [],
    ];
    for (const m of meds[i]) {
      await db.preHajjMedication.create({ data: { jamaahId: j.id, ...m } });
    }

    // PreHajjScreening — FRAIL + MNA + PHQ9 untuk semua, lainnya sebagian
    const frailScore = [3, 2, 3, 0, 2, 0, 5, 2, 4, 0];
    const frailData = { fatigue: frailScore[i] >= 1 ? 1 : 0, resistance: frailScore[i] >= 2 ? 1 : 0, ambulation: frailScore[i] >= 3 ? 1 : 0, illness: frailScore[i] >= 4 ? 1 : 0, lossWeight: frailScore[i] >= 5 ? 1 : 0 };
    const frailSkor = frailScore[i] === 0 ? "Robust" : frailScore[i] <= 2 ? "Pre-frail" : "Frail";
    await db.preHajjScreening.create({ data: { jamaahId: j.id, jenis: "FRAIL", data: JSON.stringify(frailData), skor: frailSkor, createdAt: new Date(j.tanggalTiba.getTime() - 50 * 86400000) } });

    const mnaScore = [9, 12, 10, 14, 10, 14, 8, 11, 9, 14];
    const mnaSkor = mnaScore[i] >= 12 ? "Normal" : mnaScore[i] >= 8 ? "Risiko Malnutrisi" : "Malnutrisi";
    await db.preHajjScreening.create({ data: { jamaahId: j.id, jenis: "MNA", data: JSON.stringify({ nafsuMakan: 2, penurunanBB: 3, mobilitas: 2, stresAkut: mnaScore[i] >= 12 ? 2 : 1, neuropsikologis: 2, imt: mnaScore[i] >= 12 ? 3 : 1 }), skor: mnaSkor, createdAt: new Date(j.tanggalTiba.getTime() - 50 * 86400000) } });

    const phq = [3, 3, 11, 2, 3, 1, 18, 4, 5, 1];
    const phqSkor = phq[i] <= 4 ? "Minimal" : phq[i] <= 9 ? "Ringan" : phq[i] <= 14 ? "Sedang" : phq[i] <= 19 ? "Sedang-Berat" : "Berat";
    await db.preHajjScreening.create({ data: { jamaahId: j.id, jenis: "PHQ9", data: JSON.stringify({ total: phq[i] }), skor: phqSkor, createdAt: new Date(j.tanggalTiba.getTime() - 48 * 86400000) } });

    // Morse Fall Scale + Barthel untuk lansia
    const morse = [35, 25, 45, 10, 30, 10, 50, 35, 40, 10];
    const morseSkor = morse[i] < 25 ? "Rendah" : morse[i] <= 50 ? "Sedang" : "Tinggi";
    await db.preHajjScreening.create({ data: { jamaahId: j.id, jenis: "MORSE", data: JSON.stringify({ total: morse[i] }), skor: morseSkor, createdAt: new Date(j.tanggalTiba.getTime() - 48 * 86400000) } });

    const barthel = [75, 90, 70, 100, 85, 100, 55, 80, 65, 100];
    const barthelSkor = barthel[i] >= 90 ? "Mandiri" : barthel[i] >= 60 ? "Bantuan Ringan" : "Ketergantungan";
    await db.preHajjScreening.create({ data: { jamaahId: j.id, jenis: "BARTHEL", data: JSON.stringify({ total: barthel[i] }), skor: barthelSkor, createdAt: new Date(j.tanggalTiba.getTime() - 48 * 86400000) } });
  }
  console.log("✅ EHHR profile + pre-haji data enriched for", all.length, "jamaah");
}

main().finally(() => db.$disconnect());
