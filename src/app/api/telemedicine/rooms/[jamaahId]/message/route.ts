import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeChatMessage } from "@/lib/serialize";
import { broadcastTelemedicine } from "@/lib/telemedicine-broadcast";
import type { ChatMessageType } from "@/lib/telemedicine-types";

const ALLOWED_TYPES: ChatMessageType[] = [
  "TEXT", "VOICE", "IMAGE", "FILE", "PDF", "LOCATION", "STICKER", "TEMPLATE",
];

// POST /api/telemedicine/rooms/[jamaahId]/message
// Body: { type?, content, attachmentUrl?, attachmentName? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  const { jamaahId } = await params;
  const body = await req.json();
  const content = typeof body.content === "string" ? body.content : "";
  const rawType = typeof body.type === "string" ? (body.type as ChatMessageType) : "TEXT";
  const type: ChatMessageType = ALLOWED_TYPES.includes(rawType) ? rawType : "TEXT";

  const jamaah = await db.jamaah.findUnique({ where: { id: jamaahId } });
  if (!jamaah) {
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });
  }

  // Upsert room: if creating, set lastMessageAt + unreadByJamaah explicitly;
  // if updating, bump lastMessageAt + increment unreadByJamaah.
  const now = new Date();
  const room = await db.chatRoom.upsert({
    where: { jamaahId },
    create: {
      jamaahId,
      doctorId: "dokter-1",
      lastMessageAt: now,
      unreadByJamaah: 1,
    },
    update: {
      lastMessageAt: now,
      unreadByJamaah: { increment: 1 },
    },
  });

  const message = await db.chatMessage.create({
    data: {
      roomId: room.id,
      senderType: "DOCTOR",
      senderName: "Dokter",
      type,
      content,
      attachmentUrl: body.attachmentUrl ?? null,
      attachmentName: body.attachmentName ?? null,
      readByDoctor: true,
      readByJamaah: false,
    },
  });

  const serialized = serializeChatMessage(message);
  await broadcastTelemedicine(jamaahId, "telemedicine:message", { message: serialized });

  return NextResponse.json({ message: serialized }, { status: 201 });
}
