import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  JamaahData,
  ScreeningData,
  VitalSignData,
  PascaHajjLabData,
} from "@/lib/types";

// ===== Snake_case (Supabase) → camelCase (client) mappers =====

function mapJamaah(j: any): JamaahData {
  return {
    id: j.id,
    nama: j.nama,
    nik: j.nik,
    kloter: j.kloter,
    porsi: j.porsi,
    usia: Number(j.usia),
    kelamin: j.kelamin as "L" | "P",
    alamat: j.alamat ?? "",
    hp: j.hp ?? "",
    kontakKeluarga: j.kontak_keluarga ?? "",
    tanggalTiba: j.tanggal_tiba,
    bandara: j.bandara ?? "",
    kabupatenKota: j.kabupaten_kota ?? "",
    puskesmas: j.puskesmas ?? "",
    dokterKeluarga: j.dokter_keluarga ?? "",
    paspor: j.paspor ?? null,
    embarkasi: j.embarkasi ?? null,
    golDarah: j.gol_darah ?? null,
    riwayatPenyakit: j.riwayat_penyakit ?? null,
    riwayatOperasi: j.riwayat_operasi ?? null,
    alergi: j.alergi ?? null,
    obatRutin: j.obat_rutin ?? null,
    statusIstithaah: j.status_istithaah ?? null,
    tanggalBerangkat: j.tanggal_berangkat ?? null,
    tanggalPulang: j.tanggal_pulang ?? null,
    riskLevel: j.risk_level as JamaahData["riskLevel"],
    riskSummary: j.risk_summary ?? "",
    createdAt: j.created_at,
    updatedAt: j.updated_at,
  };
}

function mapScreening(s: any): ScreeningData {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = s.data ? JSON.parse(s.data) : {};
  } catch {
    parsed = {};
  }
  return {
    id: s.id,
    jamaahId: s.jamaah_id,
    jenis: s.jenis as ScreeningData["jenis"],
    data: parsed,
    skor: s.skor ?? null,
    catatan: s.catatan ?? null,
    hariKe: Number(s.hari_ke) || 0,
    createdAt: s.created_at,
  };
}

function mapVital(v: any): VitalSignData {
  const num = (x: unknown) =>
    x === null || x === undefined ? null : Number(x);
  return {
    id: v.id,
    jamaahId: v.jamaah_id,
    tdSistolik: num(v.td_sistolik),
    tdDiastolik: num(v.td_diastolik),
    nadi: num(v.nadi),
    rr: num(v.rr),
    suhu: num(v.suhu),
    spo2: num(v.spo2),
    beratBadan: num(v.berat_badan),
    gulaDarah: num(v.gula_darah),
    hariKe: Number(v.hari_ke) || 0,
    catatan: v.catatan ?? null,
    createdAt: v.created_at,
  };
}

function mapPascaHajjLab(l: any): PascaHajjLabData {
  const num = (x: unknown) =>
    x === null || x === undefined ? null : Number(x);
  return {
    id: l.id,
    jamaahId: l.jamaah_id,
    hb: num(l.hb),
    leukosit: num(l.leukosit),
    gdp: num(l.gdp),
    gd2pp: num(l.gd2pp),
    hba1c: num(l.hba1c),
    kolesterol: num(l.kolesterol),
    ldl: num(l.ldl),
    hdl: num(l.hdl),
    trigliserida: num(l.trigliserida),
    sgot: num(l.sgot),
    sgpt: num(l.sgpt),
    ureum: num(l.ureum),
    kreatinin: num(l.kreatinin),
    catatan: l.catatan ?? null,
    createdAt: l.created_at,
  };
}

// GET /api/jamaah/[id] — detail jamaah lengkap
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const [jRes, scrRes, vitRes, labRes] = await Promise.all([
      supabase.from("jamaah").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("screening")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("vital_sign")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("pasca_hajj_lab")
        .select("*")
        .eq("jamaah_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (jRes.error) {
      return NextResponse.json({ error: jRes.error.message }, { status: 500 });
    }
    if (scrRes.error) {
      return NextResponse.json({ error: scrRes.error.message }, { status: 500 });
    }
    if (vitRes.error) {
      return NextResponse.json({ error: vitRes.error.message }, { status: 500 });
    }
    if (labRes.error) {
      return NextResponse.json({ error: labRes.error.message }, { status: 500 });
    }

    if (!jRes.data) {
      // Never return 404 — return 200 with safe fallback
      return NextResponse.json({
        jamaah: null,
        screenings: [],
        vitalSigns: [],
        pascaHajjLabs: [],
      });
    }

    return NextResponse.json({
      jamaah: {
        ...mapJamaah(jRes.data),
        screenings: (scrRes.data ?? []).map(mapScreening),
        vitalSigns: (vitRes.data ?? []).map(mapVital),
        pascaHajjLabs: (labRes.data ?? []).map(mapPascaHajjLab),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat jamaah";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT /api/jamaah/[id] — update data jamaah
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await req.json();

    // Verify existing jamaah
    const { data: existing, error: exErr } = await supabase
      .from("jamaah")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (exErr) {
      return NextResponse.json({ error: exErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json(
        { error: "Jamaah tidak ditemukan" },
        { status: 404 }
      );
    }

    // Build update patch (camelCase → snake_case)
    const patch: Record<string, unknown> = {};
    if (body.nama !== undefined) patch.nama = body.nama;
    if (body.nik !== undefined) patch.nik = body.nik;
    if (body.kloter !== undefined) patch.kloter = body.kloter;
    if (body.porsi !== undefined) patch.porsi = body.porsi;
    if (body.usia !== undefined) patch.usia = Number(body.usia);
    if (body.kelamin !== undefined) patch.kelamin = body.kelamin;
    if (body.alamat !== undefined) patch.alamat = body.alamat;
    if (body.hp !== undefined) patch.hp = body.hp;
    if (body.kontakKeluarga !== undefined)
      patch.kontak_keluarga = body.kontakKeluarga;
    if (body.tanggalTiba !== undefined)
      patch.tanggal_tiba = body.tanggalTiba
        ? new Date(body.tanggalTiba).toISOString()
        : null;
    if (body.bandara !== undefined) patch.bandara = body.bandara;
    if (body.kabupatenKota !== undefined)
      patch.kabupaten_kota = body.kabupatenKota;
    if (body.puskesmas !== undefined) patch.puskesmas = body.puskesmas;
    if (body.dokterKeluarga !== undefined)
      patch.dokter_keluarga = body.dokterKeluarga;
    if (body.paspor !== undefined) patch.paspor = body.paspor || null;
    if (body.embarkasi !== undefined) patch.embarkasi = body.embarkasi || null;
    if (body.golDarah !== undefined) patch.gol_darah = body.golDarah || null;
    if (body.riwayatPenyakit !== undefined)
      patch.riwayat_penyakit = body.riwayatPenyakit || null;
    if (body.riwayatOperasi !== undefined)
      patch.riwayat_operasi = body.riwayatOperasi || null;
    if (body.alergi !== undefined) patch.alergi = body.alergi || null;
    if (body.obatRutin !== undefined) patch.obat_rutin = body.obatRutin || null;
    if (body.statusIstithaah !== undefined)
      patch.status_istithaah = body.statusIstithaah || null;
    if (body.tanggalBerangkat !== undefined)
      patch.tanggal_berangkat = body.tanggalBerangkat
        ? new Date(body.tanggalBerangkat).toISOString()
        : null;
    if (body.tanggalPulang !== undefined)
      patch.tanggal_pulang = body.tanggalPulang
        ? new Date(body.tanggalPulang).toISOString()
        : null;

    patch.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("jamaah")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jamaah: mapJamaah(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memperbarui jamaah";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/jamaah/[id] — cascade delete + audit log
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get the current user (for audit log + self-delete prevention)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    // Fetch jamaah data (for name + self-delete check)
    const { data: jamaah, error: jamaahErr } = await supabase
      .from("jamaah")
      .select("id, nama, user_id")
      .eq("id", id)
      .maybeSingle();

    if (jamaahErr) {
      return NextResponse.json({ error: jamaahErr.message }, { status: 500 });
    }
    if (!jamaah) {
      return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });
    }

    // Self-delete prevention: don't allow deleting if jamaah.user_id matches current user
    const jamaahRow = jamaah as Record<string, unknown>;
    if (jamaahRow.user_id && jamaahRow.user_id === user.id) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus akun Anda sendiri." },
        { status: 403 }
      );
    }

    const jamaahNama = String(jamaahRow.nama ?? "Unknown");

    // Get doctor profile name for audit log
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();
    const doctorName = (profile as Record<string, unknown> | null)?.full_name ?? user.email ?? "Unknown";

    // Find chat rooms for this jamaah (to delete their messages)
    const { data: rooms } = await supabase
      .from("chat_room")
      .select("id")
      .eq("jamaah_id", id);
    const roomIds = ((rooms ?? []) as Array<Record<string, unknown>>).map((r) => String(r.id));

    // Cascade deletions in parallel
    const deletes: Promise<unknown>[] = [
      supabase.from("vital_sign").delete().eq("jamaah_id", id),
      supabase.from("screening").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("pasca_hajj_lab").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("pre_hajj_vital").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("pre_hajj_lab").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("pre_hajj_chronic").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("pre_hajj_screening").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("pre_hajj_medication").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("pre_hajj_immunization").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("pre_hajj_fitness").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("pre_hajj_education").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("pre_hajj_ai_assessment").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("telemedicine_request").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("telemedicine_ai_summary").delete().eq("jamaah_id", id),
      (supabase as Record<string, unknown>).from("telemedicine_schedule").delete().eq("jamaah_id", id),
    ];
    if (roomIds.length) {
      deletes.push(supabase.from("chat_message").delete().in("room_id", roomIds));
    }

    const results = await Promise.all(deletes);
    for (const r of results) {
      const err = (r as { error?: { message?: string } | null })?.error;
      if (err) {
        return NextResponse.json({ error: err.message ?? "Gagal menghapus data terkait" }, { status: 500 });
      }
    }

    // Delete chat rooms
    if (roomIds.length) {
      const { error: delRoomErr } = await supabase
        .from("chat_room")
        .delete()
        .in("id", roomIds);
      if (delRoomErr) {
        return NextResponse.json({ error: delRoomErr.message }, { status: 500 });
      }
    }

    // Finally delete the jamaah
    const { error } = await supabase.from("jamaah").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Write audit log (fire-and-forget — don't block response if it fails)
    const userAgent = req.headers.get("user-agent") ?? "Unknown";
    const clientIp = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "Unknown";
    try {
      await (supabase as Record<string, unknown>).from("audit_log").insert({
        user_id: user.id,
        user_name: doctorName,
        jamaah_id: id,
        jamaah_name: jamaahNama,
        action: "DELETE_JAMAAH",
        activity: `${doctorName} menghapus data jamaah ${jamaahNama}.`,
        ip_address: clientIp,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.warn("[DELETE] audit log failed:", auditErr);
      // Non-fatal — deletion already succeeded
    }

    console.log(`[DELETE] ${doctorName} menghapus data jamaah ${jamaahNama} (id: ${id})`);

    return NextResponse.json({ ok: true, message: "Data jamaah berhasil dihapus." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghapus data jamaah";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
