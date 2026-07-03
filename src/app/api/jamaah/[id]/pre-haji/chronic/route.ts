import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializePreHajjChronic } from "@/lib/serialize";

// PUT /api/jamaah/[id]/pre-haji/chronic — upsert data penyakit kronis pra haji
// Body: { hipertensi, diabetes, ppok, ckd, jantung, stroke, kanker, obatRutin, targetTerapi }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const existing = await db.jamaah.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const data = {
    hipertensi: body.hipertensi ?? "Tidak",
    diabetes: body.diabetes ?? "Tidak",
    ppok: body.ppok ?? "Tidak",
    ckd: body.ckd ?? "Tidak",
    jantung: body.jantung ?? "Tidak",
    stroke: body.stroke ?? "Tidak",
    kanker: body.kanker ?? "Tidak",
    obatRutin: body.obatRutin ?? null,
    targetTerapi: body.targetTerapi ?? null,
  };

  const upserted = await db.preHajjChronic.upsert({
    where: { jamaahId: id },
    create: { jamaahId: id, ...data },
    update: data,
  });
  return NextResponse.json({ chronic: serializePreHajjChronic(upserted) });
}
