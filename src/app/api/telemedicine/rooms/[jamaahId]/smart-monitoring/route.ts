import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeTelemedicineRequest } from "@/lib/serialize";
import { broadcastTelemedicine } from "@/lib/telemedicine-broadcast";
import {
  SMART_MONITORING_PHASES,
  TTV_PARAMS,
  type ChatMessageType,
  type FormField,
  type TelemedicineCategory,
} from "@/lib/telemedicine-types";

const CATEGORY_TO_MESSAGE_TYPE: Record<TelemedicineCategory, ChatMessageType> = {
  TTV: "TTV_REQUEST",
  SKRINING: "SKRINING_REQUEST",
  EDUKASI: "EDUKASI",
  OBAT: "OBAT",
  DAILY_COMPLAINT: "MONITORING",
  CHRONIC: "MONITORING",
};

const PHASE_HARI_KE: Record<string, number | null> = {
  PRA: null,
  PASCA_1: 1,
  PASCA_7: 7,
  PASCA_14: 14,
  PASCA_30: 30,
};

function ttvFieldsFor(subType: string): FormField[] {
  const keys = subType.split(",").map((s) => s.trim()).filter(Boolean);
  const out: FormField[] = [];
  for (const k of keys) {
    const def = TTV_PARAMS.find((p) => p.key === k);
    if (!def) continue;
    out.push({
      key: def.key,
      label: def.label,
      type: "number",
      unit: def.unit,
      required: ["tdSistolik", "tdDiastolik", "suhu", "spo2"].includes(def.key),
    });
  }
  return out;
}

// POST /api/telemedicine/rooms/[jamaahId]/smart-monitoring
// Body: { phase } (key from SMART_MONITORING_PHASES)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  const { jamaahId } = await params;
  const body = await req.json();
  const phaseKey = typeof body.phase === "string" ? body.phase : "";
  const phase = SMART_MONITORING_PHASES.find((p) => p.key === phaseKey);
  if (!phase) {
    return NextResponse.json({ error: "Fase tidak dikenal" }, { status: 400 });
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

  const hariKe = PHASE_HARI_KE[phase.key] ?? null;
  const requestIds: string[] = [];

  for (const form of phase.forms) {
    // Build fields per category
    let fields: FormField[] = [];
    if (form.category === "TTV") {
      fields = ttvFieldsFor(form.subType);
    } else if (form.category === "SKRINING" || form.category === "DAILY_COMPLAINT") {
      // Patient uses the screening dialog; minimal fields sent for UI hint
      fields = [];
    } else if (form.category === "CHRONIC") {
      fields = [
        { key: "keluhan", label: "Keluhan aktif saat ini", type: "textarea", required: false, placeholder: "Tuliskan keluhan atau 'Tidak ada'" },
      ];
    } else if (form.category === "EDUKASI") {
      fields = [
        { key: "dipahami", label: "Saya telah memahami materi edukasi", type: "yesno", required: true },
      ];
    } else if (form.category === "OBAT") {
      fields = [
        { key: "diminati", label: "Saya minum obat sesuai anjuran", type: "yesno", required: true },
      ];
    }

    const request = await db.telemedicineRequest.create({
      data: {
        roomId: room.id,
        jamaahId,
        category: form.category,
        subType: form.subType,
        title: form.title,
        fields: JSON.stringify(fields),
        status: "PENDING",
        hariKe,
      },
    });
    requestIds.push(request.id);

    const messageType = CATEGORY_TO_MESSAGE_TYPE[form.category];
    const message = await db.chatMessage.create({
      data: {
        roomId: room.id,
        senderType: "DOCTOR",
        senderName: "Dokter",
        type: messageType,
        content: form.title,
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
    await broadcastTelemedicine(jamaahId, "telemedicine:request", { jamaahId, request: sReq });
    // Broadcast message too so the chat list updates
    await broadcastTelemedicine(jamaahId, "telemedicine:message", {
      message: {
        id: message.id,
        roomId: message.roomId,
        senderType: message.senderType,
        senderName: message.senderName,
        type: message.type,
        content: message.content,
        attachmentUrl: message.attachmentUrl,
        attachmentName: message.attachmentName,
        requestId: message.requestId,
        readByDoctor: message.readByDoctor,
        readByJamaah: message.readByJamaah,
        createdAt: message.createdAt.toISOString(),
      },
    });
  }

  return NextResponse.json({
    sentCount: requestIds.length,
    requestIds,
    phase: phase.key,
  }, { status: 201 });
}
