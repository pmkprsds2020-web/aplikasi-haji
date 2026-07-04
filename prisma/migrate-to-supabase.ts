// Migration script: copy all data from Prisma/SQLite to Supabase
// Run: bun run prisma/migrate-to-supabase.ts
import { db } from "../src/lib/db";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const toNum = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const toStr = (v: unknown) => (v === null || v === undefined ? null : String(v));

async function migrate() {
  console.log("🚀 Starting migration from Prisma to Supabase...\n");

  // 1. Migrate Jamaah
  const jamaahList = await db.jamaah.findMany();
  console.log(`📦 Migrating ${jamaahList.length} jamaah...`);
  const idMap = new Map<string, string>(); // prismaId → supabaseId

  for (const j of jamaahList) {
    const { data, error } = await supabase.from("jamaah").insert({
      nama: j.nama, nik: j.nik, kloter: j.kloter, porsi: j.porsi,
      usia: j.usia, kelamin: j.kelamin, alamat: j.alamat, hp: j.hp,
      kontak_keluarga: j.kontakKeluarga,
      tanggal_tiba: j.tanggalTiba.toISOString(),
      bandara: j.bandara, kabupaten_kota: j.kabupatenKota,
      puskesmas: j.puskesmas, dokter_keluarga: j.dokterKeluarga,
      paspor: j.paspor, embarkasi: j.embarkasi, gol_darah: j.golDarah,
      riwayat_penyakit: j.riwayatPenyakit, riwayat_operasi: j.riwayatOperasi,
      alergi: j.alergi, obat_rutin: j.obatRutin,
      status_istithaah: j.statusIstithaah,
      tanggal_berangkat: j.tanggalBerangkat?.toISOString() ?? null,
      tanggal_pulang: j.tanggalPulang?.toISOString() ?? null,
      risk_level: j.riskLevel, risk_summary: j.riskSummary,
    }).select("id").single();

    if (error) {
      console.error(`  ❌ ${j.nama}:`, error.message);
      continue;
    }
    idMap.set(j.id, data.id);
    console.log(`  ✅ ${j.nama} → ${data.id}`);
  }

  // 2. Migrate Screenings (pasca haji)
  const screenings = await db.screening.findMany();
  console.log(`\n📦 Migrating ${screenings.length} screenings...`);
  for (const s of screenings) {
    const newJamaahId = idMap.get(s.jamaahId);
    if (!newJamaahId) continue;
    const { error } = await supabase.from("screening").insert({
      jamaah_id: newJamaahId, jenis: s.jenis, data: s.data,
      skor: s.skor, catatan: s.catatan, hari_ke: s.hariKe,
      created_at: s.createdAt.toISOString(),
    });
    if (error) console.error(`  ❌ screening ${s.jenis}:`, error.message);
  }
  console.log(`  ✅ Screenings done`);

  // 3. Migrate Vital Signs (pasca haji)
  const vitals = await db.vitalSign.findMany();
  console.log(`\n📦 Migrating ${vitals.length} vital signs...`);
  for (const v of vitals) {
    const newJamaahId = idMap.get(v.jamaahId);
    if (!newJamaahId) continue;
    const { error } = await supabase.from("vital_sign").insert({
      jamaah_id: newJamaahId,
      td_sistolik: v.tdSistolik, td_diastolik: v.tdDiastolik,
      nadi: v.nadi, rr: v.rr, suhu: v.suhu, spo2: v.spo2,
      berat_badan: v.beratBadan, gula_darah: v.gulaDarah,
      hari_ke: v.hariKe, catatan: v.catatan,
      created_at: v.createdAt.toISOString(),
    });
    if (error) console.error(`  ❌ vital:`, error.message);
  }
  console.log(`  ✅ Vital signs done`);

  // 4. Migrate PascaHajjLabs
  const pascaLabs = await db.pascaHajjLab.findMany();
  console.log(`\n📦 Migrating ${pascaLabs.length} pasca haji labs...`);
  for (const l of pascaLabs) {
    const newJamaahId = idMap.get(l.jamaahId);
    if (!newJamaahId) continue;
    const { error } = await supabase.from("pasca_hajj_lab").insert({
      jamaah_id: newJamaahId,
      hb: l.hb, leukosit: l.leukosit, gdp: l.gdp, gd2pp: l.gd2pp,
      hba1c: l.hba1c, kolesterol: l.kolesterol, ldl: l.ldl, hdl: l.hdl,
      trigliserida: l.trigliserida, sgot: l.sgot, sgpt: l.sgpt,
      ureum: l.ureum, kreatinin: l.kreatinin, catatan: l.catatan,
      created_at: l.createdAt.toISOString(),
    });
    if (error) console.error(`  ❌ pasca lab:`, error.message);
  }
  console.log(`  ✅ Pasca labs done`);

  // 5. Migrate PreHajjVitals
  const preVitals = await db.preHajjVital.findMany();
  console.log(`\n📦 Migrating ${preVitals.length} pre-hajj vitals...`);
  for (const v of preVitals) {
    const newJamaahId = idMap.get(v.jamaahId);
    if (!newJamaahId) continue;
    const { error } = await supabase.from("pre_hajj_vital").insert({
      jamaah_id: newJamaahId,
      td_sistolik: v.tdSistolik, td_diastolik: v.tdDiastolik,
      nadi: v.nadi, rr: v.rr, suhu: v.suhu, spo2: v.spo2,
      berat_badan: v.beratBadan, tinggi_badan: v.tinggiBadan,
      lingkar_perut: v.lingkarPerut, catatan: v.catatan,
      created_at: v.createdAt.toISOString(),
    });
    if (error) console.error(`  ❌ pre vital:`, error.message);
  }
  console.log(`  ✅ Pre-hajj vitals done`);

  // 6. Migrate PreHajjLabs
  const preLabs = await db.preHajjLab.findMany();
  console.log(`\n📦 Migrating ${preLabs.length} pre-hajj labs...`);
  for (const l of preLabs) {
    const newJamaahId = idMap.get(l.jamaahId);
    if (!newJamaahId) continue;
    const { error } = await supabase.from("pre_hajj_lab").insert({
      jamaah_id: newJamaahId,
      hb: l.hb, gdp: l.gdp, gd2pp: l.gd2pp, hba1c: l.hba1c,
      kolesterol: l.kolesterol, hdl: l.hdl, ldl: l.ldl,
      trigliserida: l.trigliserida, asam_urat: l.asamUrat,
      sgot: l.sgot, sgpt: l.sgpt, kreatinin: l.kreatinin,
      egfr: l.egfr, urinalisis: l.urinalisis, catatan: l.catatan,
      created_at: l.createdAt.toISOString(),
    });
    if (error) console.error(`  ❌ pre lab:`, error.message);
  }
  console.log(`  ✅ Pre-hajj labs done`);

  // 7. Migrate PreHajjChronic
  const chronics = await db.preHajjChronic.findMany();
  console.log(`\n📦 Migrating ${chronics.length} chronic records...`);
  for (const c of chronics) {
    const newJamaahId = idMap.get(c.jamaahId);
    if (!newJamaahId) continue;
    const { error } = await supabase.from("pre_hajj_chronic").upsert({
      jamaah_id: newJamaahId,
      hipertensi: c.hipertensi, diabetes: c.diabetes, ppok: c.ppok,
      ckd: c.ckd, jantung: c.jantung, stroke: c.stroke, kanker: c.kanker,
      obat_rutin: c.obatRutin, target_terapi: c.targetTerapi,
    }, { onConflict: "jamaah_id" });
    if (error) console.error(`  ❌ chronic:`, error.message);
  }
  console.log(`  ✅ Chronic records done`);

  // 8. Migrate PreHajjScreenings
  const preScreenings = await db.preHajjScreening.findMany();
  console.log(`\n📦 Migrating ${preScreenings.length} pre-hajj screenings...`);
  for (const s of preScreenings) {
    const newJamaahId = idMap.get(s.jamaahId);
    if (!newJamaahId) continue;
    const { error } = await supabase.from("pre_hajj_screening").insert({
      jamaah_id: newJamaahId, jenis: s.jenis, data: s.data,
      skor: s.skor, catatan: s.catatan,
      created_at: s.createdAt.toISOString(),
    });
    if (error) console.error(`  ❌ pre screening:`, error.message);
  }
  console.log(`  ✅ Pre-hajj screenings done`);

  // 9. Migrate PreHajjMedications
  const meds = await db.preHajjMedication.findMany();
  console.log(`\n📦 Migrating ${meds.length} medications...`);
  for (const m of meds) {
    const newJamaahId = idMap.get(m.jamaahId);
    if (!newJamaahId) continue;
    const { error } = await supabase.from("pre_hajj_medication").insert({
      jamaah_id: newJamaahId, nama_obat: m.namaObat, dosis: m.dosis,
      frekuensi: m.frekuensi, indikasi: m.indikasi, catatan: m.catatan,
      created_at: m.createdAt.toISOString(),
    });
    if (error) console.error(`  ❌ medication:`, error.message);
  }
  console.log(`  ✅ Medications done`);

  // 10. Migrate PreHajjImmunizations
  const immuns = await db.preHajjImmunization.findMany();
  console.log(`\n📦 Migrating ${immuns.length} immunizations...`);
  for (const im of immuns) {
    const newJamaahId = idMap.get(im.jamaahId);
    if (!newJamaahId) continue;
    const { error } = await supabase.from("pre_hajj_immunization").insert({
      jamaah_id: newJamaahId, jenis: im.jenis,
      tanggal_vaksin: im.tanggalVaksin?.toISOString() ?? null,
      nomor_batch: im.nomorBatch, catatan: im.catatan,
      created_at: im.createdAt.toISOString(),
    });
    if (error) console.error(`  ❌ immunization:`, error.message);
  }
  console.log(`  ✅ Immunizations done`);

  // 11. Migrate PreHajjFitness
  const fitness = await db.preHajjFitness.findMany();
  console.log(`\n📦 Migrating ${fitness.length} fitness records...`);
  for (const f of fitness) {
    const newJamaahId = idMap.get(f.jamaahId);
    if (!newJamaahId) continue;
    const { error } = await supabase.from("pre_hajj_fitness").insert({
      jamaah_id: newJamaahId, target_langkah: f.targetLangkah,
      jalan_kaki: f.jalanKaki, aerobik: f.aerobik,
      kekuatan: f.kekuatan, pernafasan: f.pernafasan, catatan: f.catatan,
      created_at: f.createdAt.toISOString(),
    });
    if (error) console.error(`  ❌ fitness:`, error.message);
  }
  console.log(`  ✅ Fitness records done`);

  // 12. Migrate PreHajjEducation
  const edus = await db.preHajjEducation.findMany();
  console.log(`\n📦 Migrating ${edus.length} education records...`);
  for (const e of edus) {
    const newJamaahId = idMap.get(e.jamaahId);
    if (!newJamaahId) continue;
    const { error } = await supabase.from("pre_hajj_education").upsert({
      jamaah_id: newJamaahId,
      diet: e.diet, aktivitas: e.aktivitas, obat: e.obat,
      hidrasi: e.hidrasi, istirahat: e.istirahat,
      manajemen_kronis: e.manajemenKronis, persiapan_perjalanan: e.persiapanPerjalanan,
      catatan: e.catatan,
    }, { onConflict: "jamaah_id" });
    if (error) console.error(`  ❌ education:`, error.message);
  }
  console.log(`  ✅ Education records done`);

  console.log("\n🎉 Migration complete!");
  console.log(`   ${idMap.size} jamaah migrated`);
  console.log("   All clinical data (screenings, vitals, labs, pre-hajj) migrated");
}

migrate().catch(console.error).finally(() => db.$disconnect());
