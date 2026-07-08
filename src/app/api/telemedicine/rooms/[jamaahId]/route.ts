import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeChatRoom,
  serializeChatMessage,
  serializeTelemedicineRequest,
} from "@/lib/serialize";

// GET /api/telemedicine/rooms/[jamaahId] — open conversation
// Auto-create room if not exists. Mark all JAMAAH messages readByDoctor.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  const { jamaahId } = await params;
  const jamaah = await db.jamaah.findUnique({ where: { id: jamaahId } });
  if (!jamaah) {
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });
  }

  // Upsert room
  const room = await db.chatRoom.upsert({
    where: { jamaahId },
    create: { jamaahId, doctorId: "dokter-1" },
    update: {},
  });

  // Fetch messages (last 200, chronological)
  const messages = await db.chatMessage.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Fetch pending requests
  const requests = await db.telemedicineRequest.findMany({
    where: { roomId: room.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  // Mark JAMAAH messages readByDoctor=true, reset unreadByDoctor to 0
  await db.chatMessage.updateMany({
    where: { roomId: room.id, senderType: "JAMAAH", readByDoctor: false },
    data: { readByDoctor: true },
  });
  await db.chatRoom.update({
    where: { id: room.id },
    data: { unreadByDoctor: 0 },
  });

  return NextResponse.json({
    room: serializeChatRoom(room),
    messages: messages.map(serializeChatMessage),
    requests: requests.map(serializeTelemedicineRequest),
  });
}
