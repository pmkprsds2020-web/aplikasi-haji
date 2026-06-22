import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeJamaah, serializeScreening, serializeVital } from "@/lib/serialize";
import { computeRiskForJamaah } from "@/lib/risk";
import type { JamaahDetail } from "@/lib/types";

// GET /api/jamaah/[id]/risk — hitung ulang & kembalikan flag risiko detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const j = await db.jamaah.findUnique({
    where: { id },
    include: { screenings: true, vitalSigns: true },
  });
  if (!j) return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const detail: JamaahDetail = {
    ...serializeJamaah(j),
    screenings: j.screenings.map(serializeScreening),
    vitalSigns: j.vitalSigns.map(serializeVital),
  };
  const result = computeRiskForJamaah(detail);
  // simpan risk terbaru
  await db.jamaah.update({
    where: { id },
    data: { riskLevel: result.level, riskSummary: result.summary },
  });
  return NextResponse.json(result);
}
