import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializePreHajjMedication } from "@/lib/serialize";

// POST /api/jamaah/[id]/pre-haji/medication — tambah obat pra haji
// Body: { namaObat, dosis, frekuensi, indikasi, catatan }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  if (!body.namaObat)
    return NextResponse.json({ error: "namaObat wajib diisi" }, { status: 400 });

  const existing = await db.jamaah.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const created = await db.preHajjMedication.create({
    data: {
      jamaahId: id,
      namaObat: body.namaObat,
      dosis: body.dosis ?? null,
      frekuensi: body.frekuensi ?? null,
      indikasi: body.indikasi ?? null,
      catatan: body.catatan ?? null,
    },
  });
  return NextResponse.json(
    { medication: serializePreHajjMedication(created) },
    { status: 201 }
  );
}
