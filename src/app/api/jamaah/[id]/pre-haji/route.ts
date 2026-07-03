import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializePreHajjVital,
  serializePreHajjLab,
  serializePreHajjChronic,
  serializePreHajjScreening,
  serializePreHajjMedication,
  serializePreHajjImmunization,
  serializePreHajjFitness,
  serializePreHajjEducation,
  serializePreHajjAiAssessment,
} from "@/lib/serialize";
import type { PreHajjBundle } from "@/lib/pre-hajj-types";

// GET /api/jamaah/[id]/pre-haji — bundle semua data pra haji
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const j = await db.jamaah.findUnique({
    where: { id },
    include: {
      preHajjVitals: { orderBy: { createdAt: "desc" } },
      preHajjLabs: { orderBy: { createdAt: "desc" } },
      preHajjChronic: true,
      preHajjScreenings: { orderBy: { createdAt: "desc" } },
      preHajjMedications: { orderBy: { createdAt: "desc" } },
      preHajjImmunizations: { orderBy: { createdAt: "desc" } },
      preHajjFitness: { orderBy: { createdAt: "desc" } },
      preHajjEducation: true,
      preHajjAiAssessments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!j)
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const bundle: PreHajjBundle = {
    vitals: j.preHajjVitals.map(serializePreHajjVital),
    labs: j.preHajjLabs.map(serializePreHajjLab),
    chronic: j.preHajjChronic ? serializePreHajjChronic(j.preHajjChronic) : null,
    screenings: j.preHajjScreenings.map(serializePreHajjScreening),
    medications: j.preHajjMedications.map(serializePreHajjMedication),
    immunizations: j.preHajjImmunizations.map(serializePreHajjImmunization),
    fitness: j.preHajjFitness.map(serializePreHajjFitness),
    education: j.preHajjEducation
      ? serializePreHajjEducation(j.preHajjEducation)
      : null,
    aiAssessments: j.preHajjAiAssessments.map(serializePreHajjAiAssessment),
  };

  return NextResponse.json({ bundle });
}
