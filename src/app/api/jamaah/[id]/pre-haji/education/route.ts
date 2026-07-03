import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializePreHajjEducation } from "@/lib/serialize";

// PUT /api/jamaah/[id]/pre-haji/education — upsert checklist edukasi pra haji
// Body: { diet, aktivitas, obat, hidrasi, istirahat, manajemenKronis, persiapanPerjalanan, catatan }
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const existing = await db.jamaah.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });

  const toBool = (v: unknown) => Boolean(v);

  const data = {
    diet: toBool(body.diet),
    aktivitas: toBool(body.aktivitas),
    obat: toBool(body.obat),
    hidrasi: toBool(body.hidrasi),
    istirahat: toBool(body.istirahat),
    manajemenKronis: toBool(body.manajemenKronis),
    persiapanPerjalanan: toBool(body.persiapanPerjalanan),
    catatan: body.catatan ?? null,
  };

  const upserted = await db.preHajjEducation.upsert({
    where: { jamaahId: id },
    create: { jamaahId: id, ...data },
    update: data,
  });
  return NextResponse.json({ education: serializePreHajjEducation(upserted) });
}
