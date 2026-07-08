import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializePascaHajjLab } from "@/lib/serialize";

// POST /api/jamaah/[id]/pasca-lab — tambah hasil lab pasca haji
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const existing = await db.jamaah.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const toNum = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

  const created = await db.pascaHajjLab.create({
    data: {
      jamaahId: id,
      hb: toNum(body.hb),
      leukosit: toNum(body.leukosit),
      gdp: toNum(body.gdp),
      gd2pp: toNum(body.gd2pp),
      hba1c: toNum(body.hba1c),
      kolesterol: toNum(body.kolesterol),
      ldl: toNum(body.ldl),
      hdl: toNum(body.hdl),
      trigliserida: toNum(body.trigliserida),
      sgot: toNum(body.sgot),
      sgpt: toNum(body.sgpt),
      ureum: toNum(body.ureum),
      kreatinin: toNum(body.kreatinin),
      catatan: body.catatan ?? null,
    },
  });
  return NextResponse.json({ lab: serializePascaHajjLab(created) }, { status: 201 });
}
