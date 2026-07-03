import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeChatMessage,
  serializeTelemedicineRequest,
} from "@/lib/serialize";
import { broadcastTelemedicine } from "@/lib/telemedicine-broadcast";
import type {
  ChatMessageType,
  FormField,
  TelemedicineCategory,
} from "@/lib/telemedicine-types";

const CATEGORY_TO_MESSAGE_TYPE: Record<TelemedicineCategory, ChatMessageType> = {
  TTV: "TTV_REQUEST",
  SKRINING: "SKRINING_REQUEST",
  EDUKASI: "EDUKASI",
  OBAT: "OBAT",
  DAILY_COMPLAINT: "MONITORING",
  CHRONIC: "MONITORING",
};

const ALLOWED_CATEGORIES: TelemedicineCategory[] = [
  "TTV", "SKRINING", "EDUKASI", "OBAT", "DAILY_COMPLAINT", "CHRONIC",
];

// POST /api/telemedicine/rooms/[jamaahId]/request
// Body: { category, subType, title, fields: FormField[], hariKe? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  const { jamaahId } = await params;
  const body = await req.json();
  const category = body.category as TelemedicineCategory;
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title : "Form Telemedicine";
  const subType = typeof body.subType === "string" ? body.subType : null;
  const fields: FormField[] = Array.isArray(body.fields) ? body.fields : [];
  const hariKe = body.hariKe !== undefined && body.hariKe !== null ? Number(body.hariKe) : null;

  const jamaah = await db.jamaah.findUnique({ where: { id: jamaahId } });
  if (!jamaah) {
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });
  }

  const room = await db.chatRoom.upsert({
    where: { jamaahId },
    create: { jamaahId, doctorId: "dokter-1" },
    update: {},
  });

  const request = await db.telemedicineRequest.create({
    data: {
      roomId: room.id,
      jamaahId,
      category,
      subType,
      title,
      fields: JSON.stringify(fields),
      status: "PENDING",
      hariKe: Number.isFinite(hariKe) ? hariKe : null,
    },
  });

  const messageType = CATEGORY_TO_MESSAGE_TYPE[category];
  const message = await db.chatMessage.create({
    data: {
      roomId: room.id,
      senderType: "DOCTOR",
      senderName: "Dokter",
      type: messageType,
      content: title,
      requestId: request.id,
      readByDoctor: true,
      readByJamaah: false,
    },
  });

  await db.chatRoom.update({
    where: { id: room.id },
    data: { lastMessageAt: new Date(), unreadByJamaah: { increment: 1 } },
  });

  const sReq = serializeTelemedicineRequest(request);
  const sMsg = serializeChatMessage(message);

  await broadcastTelemedicine(jamaahId, "telemedicine:message", { message: sMsg });
  await broadcastTelemedicine(jamaahId, "telemedicine:request", {
    jamaahId,
    request: sReq,
  });

  return NextResponse.json({ request: sReq, message: sMsg }, { status: 201 });
}
