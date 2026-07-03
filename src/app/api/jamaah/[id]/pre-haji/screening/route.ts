import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializePreHajjScreening } from "@/lib/serialize";
import type { PreHajjScreeningJenis } from "@/lib/pre-hajj-types";

// POST /api/jamaah/[id]/pre-haji/screening — tambah hasil skrining pra haji
// Body: { jenis: PreHajjScreeningJenis, data: object, skor, catatan }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const jenis = body.jenis as PreHajjScreeningJenis;
  if (!jenis)
    return NextResponse.json({ error: "jenis wajib diisi" }, { status: 400 });

  const existing = await db.jamaah.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const created = await db.preHajjScreening.create({
    data: {
      jamaahId: id,
      jenis,
      data: JSON.stringify(body.data ?? {}),
      skor: body.skor ?? null,
      catatan: body.catatan ?? null,
    },
  });
  return NextResponse.json(
    { screening: serializePreHajjScreening(created) },
    { status: 201 }
  );
}
