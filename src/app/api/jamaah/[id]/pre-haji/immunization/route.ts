import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializePreHajjImmunization } from "@/lib/serialize";

// POST /api/jamaah/[id]/pre-haji/immunization — tambah imunisasi pra haji
// Body: { jenis, tanggalVaksin, nomorBatch, catatan }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  if (!body.jenis)
    return NextResponse.json({ error: "jenis wajib diisi" }, { status: 400 });

  const existing = await db.jamaah.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const tanggalVaksin = body.tanggalVaksin
    ? new Date(body.tanggalVaksin)
    : null;

  const created = await db.preHajjImmunization.create({
    data: {
      jamaahId: id,
      jenis: body.jenis,
      tanggalVaksin,
      nomorBatch: body.nomorBatch ?? null,
      catatan: body.catatan ?? null,
    },
  });
  return NextResponse.json(
    { immunization: serializePreHajjImmunization(created) },
    { status: 201 }
  );
}
