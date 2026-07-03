import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/jamaah/[id]/pre-haji/immunization/[immId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; immId: string }> }
) {
  const { id, immId } = await params;
  const imm = await db.preHajjImmunization.findUnique({ where: { id: immId } });
  if (!imm || imm.jamaahId !== id)
    return NextResponse.json(
      { error: "Imunisasi tidak ditemukan" },
      { status: 404 }
    );

  await db.preHajjImmunization.delete({ where: { id: immId } });
  return NextResponse.json({ ok: true });
}
