import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { broadcastTelemedicine } from "@/lib/telemedicine-broadcast";
import type {
  ChatMessageType,
  FormField,
  TelemedicineCategory,
  ChatSenderType,
  RequestStatus,
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

// ===== Helpers (snake_case → camelCase) =====

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

function parseResponseObject(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object" && !Array.isArray(p)) {
      return p as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
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
    status: r.status as RequestStatus,
    scheduledFor: r.scheduled_for,
    submittedAt: r.submitted_at,
    response: parseResponseObject(r.response),
    skor: r.skor,
    hariKe: r.hari_ke,
    createdAt: r.created_at,
  };
}

// POST /api/telemedicine/rooms/[jamaahId]/request
// Body: { category, subType, title, fields: FormField[], hariKe? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  try {
    const { jamaahId } = await params;
    const body = await req.json();
    const category = body.category as TelemedicineCategory;
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    const title = typeof body.title === "string" ? body.title : "Form Telemedicine";
    const subType = typeof body.subType === "string" ? body.subType : null;
    const fields: FormField[] = Array.isArray(body.fields) ? body.fields : [];
    const hariKe =
      body.hariKe !== undefined && body.hariKe !== null ? Number(body.hariKe) : null;

    const supabase = await createClient();

    // Verify jamaah exists
    const { data: jamaah, error: jamaahError } = await supabase
      .from("jamaah")
      .select("id, nama")
      .eq("id", jamaahId)
      .maybeSingle();

    if (jamaahError) {
      console.error("[telemedicine/request] jamaah select error:", jamaahError);
      return NextResponse.json(
        { error: jamaahError.message, request: null, message: null },
        { status: 200 }
      );
    }
    if (!jamaah) {
      // Per rules: never 404 — return 200 with safe fallback
      return NextResponse.json(
        { error: "Jamaah tidak ditemukan", request: null, message: null },
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
      console.error("[telemedicine/request] room select error:", roomSelectErr);
      return NextResponse.json(
        { error: roomSelectErr.message, request: null, message: null },
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
        console.error("[telemedicine/request] room insert error:", newRoomErr);
        return NextResponse.json(
          {
            error: newRoomErr?.message ?? "Gagal membuat room",
            request: null,
            message: null,
          },
          { status: 200 }
        );
      }
      room = newRoom as ChatRoomRow;
    }

    // Insert telemedicine_request
    const { data: requestRow, error: reqErr } = await supabase
      .from("telemedicine_request")
      .insert({
        room_id: room.id,
        jamaah_id: jamaahId,
        category,
        sub_type: subType,
        title,
        fields: JSON.stringify(fields),
        status: "PENDING",
        hari_ke: Number.isFinite(hariKe) ? hariKe : null,
      } as never)
      .select("*")
      .single();

    if (reqErr || !requestRow) {
      console.error("[telemedicine/request] request insert error:", reqErr);
      return NextResponse.json(
        { error: reqErr?.message ?? "Gagal membuat request", request: null, message: null },
        { status: 200 }
      );
    }
    const request = requestRow as TelemedicineRequestRow;

    // Insert chat_message
    const messageType = CATEGORY_TO_MESSAGE_TYPE[category];
    const { data: msgRow, error: msgErr } = await supabase
      .from("chat_message")
      .insert({
        room_id: room.id,
        sender_type: "DOCTOR",
        sender_name: "Dokter",
        type: messageType,
        content: title,
        request_id: request.id,
        read_by_doctor: true,
        read_by_jamaah: false,
      } as never)
      .select("*")
      .single();

    if (msgErr || !msgRow) {
      console.error("[telemedicine/request] message insert error:", msgErr);
      return NextResponse.json(
        {
          error: msgErr?.message ?? "Gagal membuat message",
          request: serializeTelemedicineRequest(request),
          message: null,
        },
        { status: 200 }
      );
    }
    const message = msgRow as ChatMessageRow;

    // Update room last_message_at + unread_by_jamaah
    const { error: updErr } = await supabase
      .from("chat_room")
      .update({
        last_message_at: new Date().toISOString(),
        unread_by_jamaah: (room.unread_by_jamaah ?? 0) + 1,
      } as never)
      .eq("id", room.id);
    if (updErr) console.error("[telemedicine/request] room update error:", updErr);

    const sReq = serializeTelemedicineRequest(request);
    const sMsg = serializeChatMessage(message);

    // Broadcast (fire-and-forget)
    broadcastTelemedicine(jamaahId, "telemedicine:message", { message: sMsg }).catch(() => {});
    broadcastTelemedicine(jamaahId, "telemedicine:request", { jamaahId, request: sReq }).catch(() => {});

    return NextResponse.json({ request: sReq, message: sMsg }, { status: 201 });
  } catch (e) {
    console.error("[telemedicine/request] unhandled error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Internal error",
        request: null,
        message: null,
      },
      { status: 200 }
    );
  }
}
