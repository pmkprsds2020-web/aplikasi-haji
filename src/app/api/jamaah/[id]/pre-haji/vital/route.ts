import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializePreHajjVital } from "@/lib/serialize";

// POST /api/jamaah/[id]/pre-haji/vital — tambah tanda vital pra haji
// Body: { tdSistolik, tdDiastolik, nadi, rr, suhu, spo2, beratBadan, tinggiBadan, lingkarPerut, catatan }
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

  const created = await db.preHajjVital.create({
    data: {
      jamaahId: id,
      tdSistolik: toNum(body.tdSistolik),
      tdDiastolik: toNum(body.tdDiastolik),
      nadi: toNum(body.nadi),
      rr: toNum(body.rr),
      suhu: toNum(body.suhu),
      spo2: toNum(body.spo2),
      beratBadan: toNum(body.beratBadan),
      tinggiBadan: toNum(body.tinggiBadan),
      lingkarPerut: toNum(body.lingkarPerut),
      catatan: body.catatan ?? null,
    },
  });
  return NextResponse.json(
    { vital: serializePreHajjVital(created) },
    { status: 201 }
  );
}
