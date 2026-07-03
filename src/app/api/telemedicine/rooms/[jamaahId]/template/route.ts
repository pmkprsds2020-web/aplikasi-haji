import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeChatMessage } from "@/lib/serialize";
import { broadcastTelemedicine } from "@/lib/telemedicine-broadcast";

// POST /api/telemedicine/rooms/[jamaahId]/template
// Body: { templateId? } or { content }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  const { jamaahId } = await params;
  const body = await req.json();

  let content = "";
  let title = "Template";
  if (typeof body.templateId === "string" && body.templateId) {
    const t = await db.telemedicineTemplate.findUnique({ where: { id: body.templateId } });
    if (!t) {
      return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
    }
    content = t.content;
    title = t.title;
  } else if (typeof body.content === "string") {
    content = body.content;
    title = typeof body.title === "string" && body.title ? body.title : "Template";
  } else {
    return NextResponse.json(
      { error: "Body harus berisi templateId atau content" },
      { status: 400 }
    );
  }

  const jamaah = await db.jamaah.findUnique({ where: { id: jamaahId } });
  if (!jamaah) {
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });
  }

  const room = await db.chatRoom.upsert({
    where: { jamaahId },
    create: { jamaahId, doctorId: "dokter-1" },
    update: {},
  });

  const message = await db.chatMessage.create({
    data: {
      roomId: room.id,
      senderType: "DOCTOR",
      senderName: "Dokter",
      type: "TEMPLATE",
      content,
      readByDoctor: true,
      readByJamaah: false,
    },
  });

  await db.chatRoom.update({
    where: { id: room.id },
    data: { lastMessageAt: new Date(), unreadByJamaah: { increment: 1 } },
  });

  const serialized = serializeChatMessage(message);
  await broadcastTelemedicine(jamaahId, "telemedicine:message", { message: serialized });

  // Use `title` so linter doesn't flag it as unused (also useful for logs/debug).
  if (process.env.NODE_ENV !== "production") {
    console.log(`[telemedicine] template "${title}" sent to ${jamaahId}`);
  }

  return NextResponse.json({ message: serialized }, { status: 201 });
}
