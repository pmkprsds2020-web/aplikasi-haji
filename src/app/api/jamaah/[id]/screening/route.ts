import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeScreening, recomputeAndSaveRisk } from "@/lib/serialize";
import type { JenisSkrining } from "@/lib/types";

// POST /api/jamaah/[id]/screening — tambah hasil skrining
// Body: { jenis, data: {...}, skor, catatan, hariKe }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const jenis = body.jenis as JenisSkrining;
  if (!jenis) return NextResponse.json({ error: "jenis wajib diisi" }, { status: 400 });

  const existing = await db.jamaah.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const created = await db.screening.create({
    data: {
      jamaahId: id,
      jenis,
      data: JSON.stringify(body.data ?? {}),
      skor: body.skor ?? null,
      catatan: body.catatan ?? null,
      hariKe: Number(body.hariKe ?? 1),
    },
  });
  await recomputeAndSaveRisk(id);
  return NextResponse.json({ screening: serializeScreening(created) }, { status: 201 });
}
