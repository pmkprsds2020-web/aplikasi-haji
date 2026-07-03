import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/jamaah/[id]/pre-haji/medication/[medId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; medId: string }> }
) {
  const { id, medId } = await params;
  const med = await db.preHajjMedication.findUnique({ where: { id: medId } });
  if (!med || med.jamaahId !== id)
    return NextResponse.json({ error: "Obat tidak ditemukan" }, { status: 404 });

  await db.preHajjMedication.delete({ where: { id: medId } });
  return NextResponse.json({ ok: true });
}
