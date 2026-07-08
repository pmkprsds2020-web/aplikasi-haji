import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/seed — one-time seed endpoint to populate Supabase with test data.
// Uses the authenticated user's session (from cookies) so RLS allows the insert.
// After running once, the dashboard will show real data.
// DELETE /api/seed — clears all seeded test data.

const SEED_JAMAAH = [
  {
    nama: "H. Ahmad Suryana", nik: "3201010101900001", kloter: "Kloter 1", porsi: "Porsi 1",
    usia: 67, kelamin: "L", alamat: "Jl. Merdeka No. 1", hp: "081234567890",
    kontak_keluarga: "Ibu Siti - 081234567891", tanggal_tiba: "2026-06-15T00:00:00Z",
    bandara: "Soekarno-Hatta", kabupaten_kota: "Bekasi", puskesmas: "Puskesmas Bekasi Utara",
    dokter_keluarga: "dr. Teguh", risk_level: "MERAH",
    risk_summary: "Hipertensi krisis 180/110, demam 38.5°C",
    riwayat_penyakit: "Hipertensi, DM tipe 2", obat_rutin: "Amlodipine 5mg, Metformin 500mg",
  },
  {
    nama: "Hj. Fatimah Zahra", nik: "3201010202920002", kloter: "Kloter 1", porsi: "Porsi 2",
    usia: 64, kelamin: "P", alamat: "Jl. Sudirman No. 5", hp: "081234567892",
    kontak_keluarga: "Bpk. Ali - 081234567893", tanggal_tiba: "2026-06-15T00:00:00Z",
    bandara: "Soekarno-Hatta", kabupaten_kota: "Bekasi", puskesmas: "Puskesmas Bekasi Utara",
    dokter_keluarga: "dr. Teguh", risk_level: "KUNING",
    risk_summary: "Diabetes terkontrol, gula darah 180 mg/dL",
    riwayat_penyakit: "Diabetes Mellitus tipe 2", obat_rutin: "Metformin 500mg 2x1",
  },
  {
    nama: "H. Muhammad Ridwan", nik: "3201010303880003", kloter: "Kloter 2", porsi: "Porsi 1",
    usia: 72, kelamin: "L", alamat: "Jl. Diponegoro No. 10", hp: "081234567894",
    kontak_keluarga: "Ibu Aminah - 081234567895", tanggal_tiba: "2026-06-16T00:00:00Z",
    bandara: "Soekarno-Hatta", kabupaten_kota: "Bekasi", puskesmas: "Puskesmas Bekasi Selatan",
    dokter_keluarga: "dr. Teguh", risk_level: "HIJAU",
    risk_summary: "Kondisi stabil, tidak ada keluhan",
    riwayat_penyakit: "", obat_rutin: "",
  },
  {
    nama: "Hj. Siti Aminah", nik: "3201010404750004", kloter: "Kloter 2", porsi: "Porsi 2",
    usia: 69, kelamin: "P", alamat: "Jl. Gatot Subroto No. 3", hp: "081234567896",
    kontak_keluarga: "Bpk. Yusuf - 081234567897", tanggal_tiba: "2026-06-16T00:00:00Z",
    bandara: "Soekarno-Hatta", kabupaten_kota: "Bekasi", puskesmas: "Puskesmas Bekasi Selatan",
    dokter_keluarga: "dr. Teguh", risk_level: "KUNING",
    risk_summary: "PPOK ringan, sesak saat aktivitas",
    riwayat_penyakit: "PPOK", obat_rutin: "Salbutamol inhaler",
  },
  {
    nama: "H. Abdullah Hakim", nik: "3201010505800005", kloter: "Kloter 1", porsi: "Porsi 3",
    usia: 65, kelamin: "L", alamat: "Jl. Ahmad Yani No. 7", hp: "081234567898",
    kontak_keluarga: "Ibu Khadijah - 081234567899", tanggal_tiba: "2026-06-15T00:00:00Z",
    bandara: "Soekarno-Hatta", kabupaten_kota: "Bekasi", puskesmas: "Puskesmas Bekasi Utara",
    dokter_keluarga: "dr. Teguh", risk_level: "HIJAU",
    risk_summary: "Stabil post-haji, monitoring rutin",
    riwayat_penyakit: "", obat_rutin: "",
  },
  {
    nama: "Hj. Khadijah Nur", nik: "3201010606820006", kloter: "Kloter 1", porsi: "Porsi 4",
    usia: 70, kelamin: "P", alamat: "Jl. Pahlawan No. 12", hp: "081234567800",
    kontak_keluarga: "Bpk. Omar - 081234567801", tanggal_tiba: "2026-06-15T00:00:00Z",
    bandara: "Soekarno-Hatta", kabupaten_kota: "Bekasi", puskesmas: "Puskesmas Bekasi Utara",
    dokter_keluarga: "dr. Teguh", risk_level: "MERAH",
    risk_summary: "Frailty berat, risiko jatuh tinggi, SpO2 92%",
    riwayat_penyakit: "Gagal jantung, CKD stage 3", obat_rutin: "Furosemide, Carvedilol",
  },
  {
    nama: "H. Umar Faruq", nik: "3201010707780007", kloter: "Kloter 2", porsi: "Porsi 3",
    usia: 66, kelamin: "L", alamat: "Jl. Kartini No. 4", hp: "081234567802",
    kontak_keluarga: "Ibu Aisyah - 081234567803", tanggal_tiba: "2026-06-16T00:00:00Z",
    bandara: "Soekarno-Hatta", kabupaten_kota: "Bekasi", puskesmas: "Puskesmas Bekasi Selatan",
    dokter_keluarga: "dr. Teguh", risk_level: "KUNING",
    risk_summary: "Hipertensi sedang, perlu pemantauan",
    riwayat_penyakit: "Hipertensi", obat_rutin: "Amlodipine 10mg",
  },
  {
    nama: "Hj. Aisyah Putri", nik: "3201010808850008", kloter: "Kloter 1", porsi: "Porsi 5",
    usia: 63, kelamin: "P", alamat: "Jl. Diponegoro No. 8", hp: "081234567804",
    kontak_keluarga: "Bpk. Hasan - 081234567805", tanggal_tiba: "2026-06-15T00:00:00Z",
    bandara: "Soekarno-Hatta", kabupaten_kota: "Bekasi", puskesmas: "Puskesmas Bekasi Utara",
    dokter_keluarga: "dr. Teguh", risk_level: "HIJAU",
    risk_summary: "Stabil, pemantauan rutin",
    riwayat_penyakit: "", obat_rutin: "",
  },
  {
    nama: "H. Hasan Basri", nik: "3201010909710009", kloter: "Kloter 2", porsi: "Porsi 4",
    usia: 74, kelamin: "L", alamat: "Jl. Veteran No. 6", hp: "081234567806",
    kontak_keluarga: "Ibu Fatimah - 081234567807", tanggal_tiba: "2026-06-16T00:00:00Z",
    bandara: "Soekarno-Hatta", kabupaten_kota: "Bekasi", puskesmas: "Puskesmas Bekasi Selatan",
    dokter_keluarga: "dr. Teguh", risk_level: "KUNING",
    risk_summary: "Lansia frail, perlu pemantauan nutrisi",
    riwayat_penyakit: "Osteoarthritis", obat_rutin: "Paracetamol",
  },
  {
    nama: "Hj. Maryam Saleha", nik: "3201011010690010", kloter: "Kloter 1", porsi: "Porsi 6",
    usia: 71, kelamin: "P", alamat: "Jl. Imam Bonjol No. 2", hp: "081234567808",
    kontak_keluarga: "Bpk. Yusuf - 081234567809", tanggal_tiba: "2026-06-15T00:00:00Z",
    bandara: "Soekarno-Hatta", kabupaten_kota: "Bekasi", puskesmas: "Puskesmas Bekasi Utara",
    dokter_keluarga: "dr. Teguh", risk_level: "MERAH",
    risk_summary: "Depresi sedang PHQ-9=15, perlu intervensi mental",
    riwayat_penyakit: "Depresi, Insomnia", obat_rutin: "Sertraline 50mg",
  },
];

// POST — seed test data using the authenticated user's session
export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if jamaah data already exists
    const { count: existing } = await supabase
      .from("jamaah")
      .select("*", { count: "exact", head: true });
    if ((existing ?? 0) > 0) {
      return NextResponse.json({
        ok: true,
        message: `Data sudah ada (${existing} jamaah). Hapus dulu dengan DELETE /api/seed jika ingin re-seed.`,
        count: existing,
      });
    }

    // Insert jamaah
    const { data: inserted, error: insErr } = await supabase
      .from("jamaah")
      .insert(SEED_JAMAAH)
      .select("id, nama, risk_level");

    if (insErr) {
      return NextResponse.json(
        { error: `[${insErr.code}] ${insErr.message}`, hint: "RLS mungkin memblokir insert. Pastikan profile role = staff." },
        { status: 400 }
      );
    }

    // Insert some vital signs for the first 3 jamaah
    const jamaahIds = (inserted ?? []).map((j) => String((j as Record<string, unknown>).id));
    const vitals: Array<Record<string, unknown>> = [];
    for (let i = 0; i < Math.min(3, jamaahIds.length); i++) {
      vitals.push({
        jamaah_id: jamaahIds[i],
        td_sistolik: 140 + i * 10,
        td_diastolik: 90 + i * 5,
        nadi: 80 + i * 5,
        rr: 18,
        suhu: 36.5 + i * 0.5,
        spo2: 97 - i,
        berat_badan: 65 - i * 3,
        gula_darah: 120 + i * 30,
        hari_ke: 1,
        catatan: "Monitoring awal post-haji",
      });
    }
    if (vitals.length > 0) {
      await supabase.from("vital_sign").insert(vitals);
    }

    // Insert some screenings for the first 3 jamaah
    const screenings: Array<Record<string, unknown>> = [];
    const screeningTypes = ["INFECTIOUS", "CHRONIC", "FRAILTY"];
    for (let i = 0; i < Math.min(3, jamaahIds.length); i++) {
      screenings.push({
        jamaah_id: jamaahIds[i],
        jenis: screeningTypes[i],
        data: JSON.stringify({ demam: i === 0, batuk: i === 1, sesak: false }),
        skor: i === 0 ? "Tinggi" : i === 1 ? "Sedang" : "Rendah",
        catatan: "Skrining post-haji",
        hari_ke: 1,
      });
    }
    if (screenings.length > 0) {
      await supabase.from("screening").insert(screenings);
    }

    return NextResponse.json({
      ok: true,
      message: `Berhasil menambahkan ${inserted?.length ?? 0} jamaah + ${vitals.length} TTV + ${screenings.length} skrining`,
      count: inserted?.length ?? 0,
      jamaah: inserted,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal seed data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — clear all seeded test data
export async function DELETE(_req: NextRequest) {
  try {
    const supabase = await createClient();

    // Delete child tables first
    await supabase.from("vital_sign").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("screening").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("pasca_hajj_lab").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Delete chat messages + rooms
    const { data: rooms } = await supabase.from("chat_room").select("id");
    for (const r of rooms ?? []) {
      await supabase.from("chat_message").delete().eq("room_id", String((r as Record<string, unknown>).id));
    }
    await supabase.from("chat_room").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Delete jamaah
    const { data: deleted, error } = await supabase
      .from("jamaah")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");

    return NextResponse.json({
      ok: true,
      message: `Dihapus ${deleted?.length ?? 0} jamaah + semua data terkait`,
      count: deleted?.length ?? 0,
      error: error?.message,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal hapus data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET — check seed status
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("jamaah")
      .select("*", { count: "exact", head: true });
    return NextResponse.json({
      jamaahCount: count ?? 0,
      seeded: (count ?? 0) > 0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal cek status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
