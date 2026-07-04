import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeJamaah,
  serializeScreening,
  serializeVital,
  serializePascaHajjLab,
} from "@/lib/serialize";

// GET /api/jamaah/[id] — detail jamaah lengkap
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const j = await db.jamaah.findUnique({
    where: { id },
    include: {
      screenings: { orderBy: { createdAt: "desc" } },
      vitalSigns: { orderBy: { createdAt: "desc" } },
      pascaHajjLabs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!j) return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });
  return NextResponse.json({
    jamaah: {
      ...serializeJamaah(j),
      screenings: j.screenings.map(serializeScreening),
      vitalSigns: j.vitalSigns.map(serializeVital),
      pascaHajjLabs: j.pascaHajjLabs.map(serializePascaHajjLab),
    },
  });
}

// PUT /api/jamaah/[id] — update data jamaah
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const existing = await db.jamaah.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });
  const updated = await db.jamaah.update({
    where: { id },
    data: {
      nama: body.nama ?? existing.nama,
      nik: body.nik ?? existing.nik,
      kloter: body.kloter ?? existing.kloter,
      porsi: body.porsi ?? existing.porsi,
      usia: body.usia !== undefined ? Number(body.usia) : existing.usia,
      kelamin: body.kelamin ?? existing.kelamin,
      alamat: body.alamat ?? existing.alamat,
      hp: body.hp ?? existing.hp,
      kontakKeluarga: body.kontakKeluarga ?? existing.kontakKeluarga,
      tanggalTiba: body.tanggalTiba ? new Date(body.tanggalTiba) : existing.tanggalTiba,
      bandara: body.bandara ?? existing.bandara,
      kabupatenKota: body.kabupatenKota ?? existing.kabupatenKota,
      puskesmas: body.puskesmas ?? existing.puskesmas,
      dokterKeluarga: body.dokterKeluarga ?? existing.dokterKeluarga,
      paspor: body.paspor !== undefined ? (body.paspor || null) : existing.paspor,
      embarkasi: body.embarkasi !== undefined ? (body.embarkasi || null) : existing.embarkasi,
      golDarah: body.golDarah !== undefined ? (body.golDarah || null) : existing.golDarah,
      riwayatPenyakit: body.riwayatPenyakit !== undefined ? (body.riwayatPenyakit || null) : existing.riwayatPenyakit,
      riwayatOperasi: body.riwayatOperasi !== undefined ? (body.riwayatOperasi || null) : existing.riwayatOperasi,
      alergi: body.alergi !== undefined ? (body.alergi || null) : existing.alergi,
      obatRutin: body.obatRutin !== undefined ? (body.obatRutin || null) : existing.obatRutin,
      statusIstithaah: body.statusIstithaah !== undefined ? (body.statusIstithaah || null) : existing.statusIstithaah,
      tanggalBerangkat: body.tanggalBerangkat !== undefined ? (body.tanggalBerangkat ? new Date(body.tanggalBerangkat) : null) : existing.tanggalBerangkat,
      tanggalPulang: body.tanggalPulang !== undefined ? (body.tanggalPulang ? new Date(body.tanggalPulang) : null) : existing.tanggalPulang,
    },
  });
  return NextResponse.json({ jamaah: serializeJamaah(updated) });
}

// DELETE /api/jamaah/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.jamaah.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
