import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializePreHajjLab } from "@/lib/serialize";

// POST /api/jamaah/[id]/pre-haji/lab — tambah hasil lab pra haji
// Body: { hb, gdp, gd2pp, hba1c, kolesterol, hdl, ldl, trigliserida, asamUrat, sgot, sgpt, kreatinin, egfr, urinalisis, catatan }
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

  const created = await db.preHajjLab.create({
    data: {
      jamaahId: id,
      hb: toNum(body.hb),
      gdp: toNum(body.gdp),
      gd2pp: toNum(body.gd2pp),
      hba1c: toNum(body.hba1c),
      kolesterol: toNum(body.kolesterol),
      hdl: toNum(body.hdl),
      ldl: toNum(body.ldl),
      trigliserida: toNum(body.trigliserida),
      asamUrat: toNum(body.asamUrat),
      sgot: toNum(body.sgot),
      sgpt: toNum(body.sgpt),
      kreatinin: toNum(body.kreatinin),
      egfr: toNum(body.egfr),
      urinalisis: body.urinalisis ?? null,
      catatan: body.catatan ?? null,
    },
  });
  return NextResponse.json(
    { lab: serializePreHajjLab(created) },
    { status: 201 }
  );
}
