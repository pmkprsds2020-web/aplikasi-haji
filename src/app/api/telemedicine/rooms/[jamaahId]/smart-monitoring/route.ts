import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { broadcastTelemedicine } from "@/lib/telemedicine-broadcast";
import {
  SMART_MONITORING_PHASES,
  TTV_PARAMS,
  type ChatMessageType,
  type ChatSenderType,
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

// ===== Row shapes (snake_case from Supabase) =====

interface ChatRoomRow {
  id: string;
  jamaah_id: string;
  doctor_id: string;
  last_message_at: string;
  unread_by_doctor: number;
  unread_by_jamaah: number;
  created_at: string;
}

interface ChatMessageRow {
  id: string;
  room_id: string;
  sender_type: string;
  sender_name: string | null;
  type: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  request_id: string | null;
  read_by_doctor: boolean;
  read_by_jamaah: boolean;
  created_at: string;
}

interface TelemedicineRequestRow {
  id: string;
  room_id: string;
  jamaah_id: string;
  category: string;
  sub_type: string | null;
  title: string;
  fields: string;
  status: string;
  scheduled_for: string | null;
  submitted_at: string | null;
  response: string | null;
  skor: string | null;
  hari_ke: number | null;
  created_at: string;
}

// ===== Helpers =====

function parseFields(raw: string | null | undefined): FormField[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p as FormField[];
  } catch {
    /* ignore */
  }
  return [];
}

function serializeChatMessage(m: ChatMessageRow) {
  return {
    id: m.id,
    roomId: m.room_id,
    senderType: m.sender_type as ChatSenderType,
    senderName: m.sender_name,
    type: m.type as ChatMessageType,
    content: m.content,
    attachmentUrl: m.attachment_url,
    attachmentName: m.attachment_name,
    requestId: m.request_id,
    readByDoctor: m.read_by_doctor,
    readByJamaah: m.read_by_jamaah,
    createdAt: m.created_at,
  };
}

function serializeTelemedicineRequest(r: TelemedicineRequestRow) {
  return {
    id: r.id,
    roomId: r.room_id,
    jamaahId: r.jamaah_id,
    category: r.category as TelemedicineCategory,
    subType: r.sub_type,
    title: r.title,
    fields: parseFields(r.fields),
    status: r.status as any,
    scheduledFor: r.scheduled_for,
    submittedAt: r.submitted_at,
    response: null,
    skor: r.skor,
    hariKe: r.hari_ke,
    createdAt: r.created_at,
  };
}

// POST /api/telemedicine/rooms/[jamaahId]/smart-monitoring
// Body: { phase } (key from SMART_MONITORING_PHASES)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  try {
    const { jamaahId } = await params;
    const body = await req.json();
    const phaseKey = typeof body.phase === "string" ? body.phase : "";
    const phase = SMART_MONITORING_PHASES.find((p) => p.key === phaseKey);
    if (!phase) {
      return NextResponse.json({ error: "Fase tidak dikenal" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify jamaah exists (never 404 — return 200 with safe fallback)
    const { data: jamaah, error: jamaahError } = await supabase
      .from("jamaah")
      .select("id, nama")
      .eq("id", jamaahId)
      .maybeSingle();

    if (jamaahError) {
      console.error("[smart-monitoring] jamaah select error:", jamaahError);
      return NextResponse.json(
        { error: jamaahError.message, sentCount: 0, requestIds: [], phase: phase.key },
        { status: 200 }
      );
    }
    if (!jamaah) {
      return NextResponse.json(
        { error: "Jamaah tidak ditemukan", sentCount: 0, requestIds: [], phase: phase.key },
        { status: 200 }
      );
    }

    // Upsert chat_room: SELECT by jamaah_id, INSERT if not found
    let room: ChatRoomRow;
    const { data: existingRoom, error: roomSelectErr } = await supabase
      .from("chat_room")
      .select("*")
      .eq("jamaah_id", jamaahId)
      .maybeSingle();

    if (roomSelectErr) {
      console.error("[smart-monitoring] room select error:", roomSelectErr);
      return NextResponse.json(
        { error: roomSelectErr.message, sentCount: 0, requestIds: [], phase: phase.key },
        { status: 200 }
      );
    }

    if (existingRoom) {
      room = existingRoom as ChatRoomRow;
    } else {
      const now = new Date().toISOString();
      const { data: newRoom, error: newRoomErr } = await supabase
        .from("chat_room")
        .insert({
          jamaah_id: jamaahId,
          doctor_id: "dokter-1",
          last_message_at: now,
          unread_by_doctor: 0,
          unread_by_jamaah: 0,
        } as never)
        .select("*")
        .single();

      if (newRoomErr || !newRoom) {
        console.error("[smart-monitoring] room insert error:", newRoomErr);
        return NextResponse.json(
          {
            error: newRoomErr?.message ?? "Gagal membuat room",
            sentCount: 0,
            requestIds: [],
            phase: phase.key,
          },
          { status: 200 }
        );
      }
      room = newRoom as ChatRoomRow;
    }

    const hariKe = PHASE_HARI_KE[phase.key] ?? null;
    const requestIds: string[] = [];
    let runningUnreadJamaah = room.unread_by_jamaah ?? 0;

    for (const form of phase.forms) {
      // Build fields per category
      let fields: FormField[] = [];
      if (form.category === "TTV") {
        fields = ttvFieldsFor(form.subType);
      } else if (form.category === "SKRINING" || form.category === "DAILY_COMPLAINT") {
        fields = [];
      } else if (form.category === "CHRONIC") {
        fields = [
          {
            key: "keluhan",
            label: "Keluhan aktif saat ini",
            type: "textarea",
            required: false,
            placeholder: "Tuliskan keluhan atau 'Tidak ada'",
          },
        ];
      } else if (form.category === "EDUKASI") {
        fields = [
          {
            key: "dipahami",
            label: "Saya telah memahami materi edukasi",
            type: "yesno",
            required: true,
          },
        ];
      } else if (form.category === "OBAT") {
        fields = [
          {
            key: "diminati",
            label: "Saya minum obat sesuai anjuran",
            type: "yesno",
            required: true,
          },
        ];
      }

      // Insert telemedicine_request
      const { data: reqRow, error: reqErr } = await supabase
        .from("telemedicine_request")
        .insert({
          room_id: room.id,
          jamaah_id: jamaahId,
          category: form.category,
          sub_type: form.subType,
          title: form.title,
          fields: JSON.stringify(fields),
          status: "PENDING",
          hari_ke: hariKe,
        } as never)
        .select("*")
        .single();

      if (reqErr || !reqRow) {
        console.error("[smart-monitoring] request insert error:", reqErr);
        continue;
      }
      const request = reqRow as TelemedicineRequestRow;
      requestIds.push(request.id);

      // Insert chat_message
      const messageType = CATEGORY_TO_MESSAGE_TYPE[form.category];
      const { data: msgRow, error: msgErr } = await supabase
        .from("chat_message")
        .insert({
          room_id: room.id,
          sender_type: "DOCTOR",
          sender_name: "Dokter",
          type: messageType,
          content: form.title,
          request_id: request.id,
          read_by_doctor: true,
          read_by_jamaah: false,
        } as never)
        .select("*")
        .single();

      if (msgErr || !msgRow) {
        console.error("[smart-monitoring] message insert error:", msgErr);
        const sReqOnly = serializeTelemedicineRequest(request);
        broadcastTelemedicine(jamaahId, "telemedicine:request", {
          jamaahId,
          request: sReqOnly,
        }).catch(() => {});
        continue;
      }
      const message = msgRow as ChatMessageRow;

      // Update room last_message_at + unread_by_jamaah
      runningUnreadJamaah = runningUnreadJamaah + 1;
      const { error: updErr } = await supabase
        .from("chat_room")
        .update({
          last_message_at: new Date().toISOString(),
          unread_by_jamaah: runningUnreadJamaah,
        } as never)
        .eq("id", room.id);
      if (updErr) console.error("[smart-monitoring] room update error:", updErr);

      const sReq = serializeTelemedicineRequest(request);
      const sMsg = serializeChatMessage(message);

      broadcastTelemedicine(jamaahId, "telemedicine:request", {
        jamaahId,
        request: sReq,
      }).catch(() => {});
      broadcastTelemedicine(jamaahId, "telemedicine:message", { message: sMsg }).catch(() => {});
    }

    return NextResponse.json(
      {
        sentCount: requestIds.length,
        requestIds,
        phase: phase.key,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[smart-monitoring] unhandled error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Internal error",
        sentCount: 0,
        requestIds: [],
        phase: null,
      },
      { status: 200 }
    );
  }
}
