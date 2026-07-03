import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializePreHajjFitness } from "@/lib/serialize";

// POST /api/jamaah/[id]/pre-haji/fitness — tambah record kebugaran pra haji
// Body: { targetLangkah, jalanKaki, aerobik, kekuatan, pernafasan, catatan }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const existing = await db.jamaah.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const toNum = (v: unknown) =>
    v === null || v === undefined || v === "" ? null : Number(v);

  const created = await db.preHajjFitness.create({
    data: {
      jamaahId: id,
      targetLangkah: toNum(body.targetLangkah),
      jalanKaki: toNum(body.jalanKaki),
      aerobik: toNum(body.aerobik),
      kekuatan: toNum(body.kekuatan),
      pernafasan: toNum(body.pernafasan),
      catatan: body.catatan ?? null,
    },
  });
  return NextResponse.json(
    { fitness: serializePreHajjFitness(created) },
    { status: 201 }
  );
}
