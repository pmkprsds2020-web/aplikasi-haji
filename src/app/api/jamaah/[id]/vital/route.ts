import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeVital, recomputeAndSaveRisk } from "@/lib/serialize";

// POST /api/jamaah/[id]/vital — tambah tanda vital berkala
// Body: { tdSistolik, tdDiastolik, nadi, rr, suhu, spo2, beratBadan, gulaDarah, hariKe, catatan }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const existing = await db.jamaah.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const toNum = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

  const created = await db.vitalSign.create({
    data: {
      jamaahId: id,
      tdSistolik: toNum(body.tdSistolik),
      tdDiastolik: toNum(body.tdDiastolik),
      nadi: toNum(body.nadi),
      rr: toNum(body.rr),
      suhu: toNum(body.suhu),
      spo2: toNum(body.spo2),
      beratBadan: toNum(body.beratBadan),
      gulaDarah: toNum(body.gulaDarah),
      hariKe: Number(body.hariKe ?? 1),
      catatan: body.catatan ?? null,
    },
  });
  await recomputeAndSaveRisk(id);
  return NextResponse.json({ vital: serializeVital(created) }, { status: 201 });
}
