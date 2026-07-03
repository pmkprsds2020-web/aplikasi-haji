import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/telemedicine/rooms/[jamaahId]/read
// Mark all JAMAAH messages readByDoctor=true, reset unreadByDoctor to 0.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  const { jamaahId } = await params;
  const room = await db.chatRoom.findUnique({ where: { jamaahId } });
  if (!room) {
    return NextResponse.json({ ok: true });
  }
  await db.chatMessage.updateMany({
    where: { roomId: room.id, senderType: "JAMAAH", readByDoctor: false },
    data: { readByDoctor: true },
  });
  await db.chatRoom.update({
    where: { id: room.id },
    data: { unreadByDoctor: 0 },
  });
  return NextResponse.json({ ok: true });
}
