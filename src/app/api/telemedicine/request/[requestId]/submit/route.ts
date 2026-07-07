import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recomputeAndSaveRisk } from "@/lib/serialize";
import { broadcastTelemedicine } from "@/lib/telemedicine-broadcast";
import {
  ALERT_RULES,
  TTV_PARAMS,
  type AlertLevel,
  type AlertRule,
  type ChatMessageType,
  type ChatSenderType,
  type TelemedicineCategory,
  type RequestStatus,
  type FormField,
} from "@/lib/telemedicine-types";

// ===== Helpers =====

const numOrUndefined = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const matchesRule = (value: number, rule: AlertRule): boolean => {
  switch (rule.condition) {
    case ">=": return value >= rule.threshold;
    case "<=": return value <= rule.threshold;
    case ">":  return value > rule.threshold;
    case "<":  return value < rule.threshold;
    default:   return false;
  }
};

const alertEmoji = (level: AlertLevel): string =>
  level === "RED" ? "🔴" : level === "ORANGE" ? "🟠" : "🟡";

function summarizeTtvResponse(response: Record<string, unknown>): string {
  const parts: string[] = [];
  const tdS = numOrUndefined(response.tdSistolik);
  const tdD = numOrUndefined(response.tdDiastolik);
  if (tdS !== undefined && tdD !== undefined) parts.push(`TD ${tdS}/${tdD}`);
  else if (tdS !== undefined) parts.push(`TD ${tdS}`);
  for (const p of TTV_PARAMS) {
    if (p.key === "tdSistolik" || p.key === "tdDiastolik") continue;
    const v = numOrUndefined(response[p.key]);
    if (v !== undefined) parts.push(`${p.label} ${v}${p.unit ? " " + p.unit : ""}`);
  }
  return parts.join(" · ") || "TTV tercatat";
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

// ===== Inline serializers (snake_case → camelCase, strings returned as-is) =====

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

interface SerializedChatMessage {
  id: string;
  roomId: string;
  senderType: ChatSenderType;
  senderName: string | null;
  type: ChatMessageType;
  content: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  requestId: string | null;
  readByDoctor: boolean;
  readByJamaah: boolean;
  createdAt: string;
}

interface SerializedTelemedicineRequest {
  id: string;
  roomId: string;
  jamaahId: string;
  category: TelemedicineCategory;
  subType: string | null;
  title: string;
  fields: FormField[];
  status: RequestStatus;
  scheduledFor: string | null;
  submittedAt: string | null;
  response: Record<string, unknown> | null;
  skor: string | null;
  hariKe: number | null;
  createdAt: string;
}

function serializeChatMessage(m: ChatMessageRow): SerializedChatMessage {
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

function serializeTelemedicineRequest(r: TelemedicineRequestRow): SerializedTelemedicineRequest {
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

// ===== Main handler =====

// POST /api/telemedicine/request/[requestId]/submit
// Body: { response: Record<string, unknown>, skor? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const body = await req.json();
    const response: Record<string, unknown> =
      body.response && typeof body.response === "object" && !Array.isArray(body.response)
        ? (body.response as Record<string, unknown>)
        : {};
    const skor =
      typeof body.skor === "string"
        ? body.skor
        : body.skor !== undefined && body.skor !== null
        ? String(body.skor)
        : null;

    const supabase = await createClient();

    // Fetch telemedicine_request (never 404 — return 200 fallback)
    const { data: reqRow, error: reqErr } = await supabase
      .from("telemedicine_request")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (reqErr) {
      console.error("[telemedicine/submit] request select error:", reqErr);
      return NextResponse.json(
        { error: reqErr.message, request: null, alerts: [], newMessages: [] },
        { status: 200 }
      );
    }
    if (!reqRow) {
      return NextResponse.json(
        { error: "Request tidak ditemukan", request: null, alerts: [], newMessages: [] },
        { status: 200 }
      );
    }
    const request = reqRow as TelemedicineRequestRow;

    // Update request as SUBMITTED
    const { error: updReqErr } = await supabase
      .from("telemedicine_request")
      .update({
        status: "SUBMITTED",
        submitted_at: new Date().toISOString(),
        response: JSON.stringify(response),
        skor,
      } as never)
      .eq("id", requestId);
    if (updReqErr) {
      console.error("[telemedicine/submit] request update error:", updReqErr);
    }

    const roomId = request.room_id;
    const jamaahId = request.jamaah_id;
    const hariKe = request.hari_ke ?? 1;
    const category = request.category as TelemedicineCategory;
    const newMessages: SerializedChatMessage[] = [];
    const alerts: Array<{ level: AlertLevel; detail: string; param: string }> = [];

    // ===== Write to clinical table based on category =====

    if (category === "TTV") {
      const keys = (request.sub_type ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const data: Record<string, number | null> = {};
      for (const k of keys) {
        const v = numOrUndefined(response[k]);
        if (v !== undefined) data[k] = v;
      }
      const { error: vitalErr } = await supabase.from("vital_sign").insert({
        jamaah_id: jamaahId,
        td_sistolik: data.tdSistolik !== undefined ? data.tdSistolik : null,
        td_diastolik: data.tdDiastolik !== undefined ? data.tdDiastolik : null,
        nadi: data.nadi !== undefined ? data.nadi : null,
        rr: data.rr !== undefined ? data.rr : null,
        suhu: data.suhu !== undefined ? data.suhu : null,
        spo2: data.spo2 !== undefined ? data.spo2 : null,
        berat_badan: data.beratBadan !== undefined ? data.beratBadan : null,
        gula_darah: data.gulaDarah !== undefined ? data.gulaDarah : null,
        hari_ke: hariKe,
        catatan: `Telemedicine: ${request.title}`,
      } as never);
      if (vitalErr) console.error("[telemedicine/submit] vital insert error:", vitalErr);
      else recomputeAndSaveRisk(jamaahId).catch((e) => console.error("[telemedicine/submit] recompute risk error:", e));
    } else if (category === "SKRINING") {
      const jenis = request.sub_type ?? "FOLLOWUP";
      const { error: scrErr } = await supabase.from("screening").insert({
        jamaah_id: jamaahId,
        jenis,
        data: JSON.stringify(response),
        skor: skor ?? null,
        catatan: `Telemedicine: ${request.title}`,
        hari_ke: hariKe,
      } as never);
      if (scrErr) console.error("[telemedicine/submit] screening insert error:", scrErr);
      else recomputeAndSaveRisk(jamaahId).catch((e) => console.error("[telemedicine/submit] recompute risk error:", e));
    } else if (category === "DAILY_COMPLAINT") {
      const { error: scrErr } = await supabase.from("screening").insert({
        jamaah_id: jamaahId,
        jenis: "FOLLOWUP",
        data: JSON.stringify(response),
        skor: skor ?? null,
        catatan: `Telemedicine harian: ${request.title}`,
        hari_ke: hariKe,
      } as never);
      if (scrErr) console.error("[telemedicine/submit] daily complaint insert error:", scrErr);
      else recomputeAndSaveRisk(jamaahId).catch((e) => console.error("[telemedicine/submit] recompute risk error:", e));
    } else if (category === "CHRONIC") {
      const fieldMap: Record<string, string> = {
        HIPERTENSI: "hipertensi",
        DIABETES: "diabetes",
        PPOK: "ppok",
        CKD: "ckd",
        JANTUNG: "jantung",
        STROKE: "stroke",
        KANKER: "kanker",
      };
      const field = fieldMap[(request.sub_type ?? "").toUpperCase()] ?? null;
      const keluhanRaw = response.keluhan ?? response.keluhanAktif ?? response.gejala;
      const hasIssue =
        (typeof keluhanRaw === "string" && keluhanRaw.trim().length > 0) ||
        (typeof keluhanRaw === "boolean" && keluhanRaw === true);
      const status = hasIssue ? "Tidak Terkontrol" : "Terkontrol";

      if (field) {
        // Upsert pre_hajj_chronic: SELECT by jamaah_id first, then UPDATE or INSERT
        const { data: existing, error: selErr } = await supabase
          .from("pre_hajj_chronic")
          .select("id")
          .eq("jamaah_id", jamaahId)
          .maybeSingle();
        if (selErr) {
          console.error("[telemedicine/submit] chronic select error:", selErr);
        } else if (existing) {
          const { error: updErr } = await supabase
            .from("pre_hajj_chronic")
            .update({
              [field]: status,
              target_terapi: JSON.stringify(response),
              updated_at: new Date().toISOString(),
            } as never)
            .eq("jamaah_id", jamaahId);
          if (updErr) console.error("[telemedicine/submit] chronic update error:", updErr);
        } else {
          const insertPayload: Record<string, unknown> = {
            jamaah_id: jamaahId,
            hipertensi: "Tidak",
            diabetes: "Tidak",
            ppok: "Tidak",
            ckd: "Tidak",
            jantung: "Tidak",
            stroke: "Tidak",
            kanker: "Tidak",
            obat_rutin: null,
            target_terapi: JSON.stringify(response),
          };
          insertPayload[field] = status;
          const { error: insErr } = await supabase.from("pre_hajj_chronic").insert(insertPayload as never);
          if (insErr) console.error("[telemedicine/submit] chronic insert error:", insErr);
        }
      }
    } else if (category === "EDUKASI") {
      const st = (request.sub_type ?? "").toLowerCase();
      const fieldMap: Record<string, string> = {
        diet: "diet",
        aktivitas: "aktivitas",
        obat: "obat",
        hidrasi: "hidrasi",
        istirahat: "istirahat",
        manajemenkronis: "manajemen_kronis",
        "manajemen-kronis": "manajemen_kronis",
        persiapanperjalanan: "persiapan_perjalanan",
        persiapan: "persiapan_perjalanan",
      };
      const snakeField = fieldMap[st];
      if (snakeField) {
        // Upsert pre_hajj_education: SELECT by jamaah_id first
        const { data: existing, error: selErr } = await supabase
          .from("pre_hajj_education")
          .select("id")
          .eq("jamaah_id", jamaahId)
          .maybeSingle();
        if (selErr) {
          console.error("[telemedicine/submit] education select error:", selErr);
        } else if (existing) {
          const { error: updErr } = await supabase
            .from("pre_hajj_education")
            .update({
              [snakeField]: true,
              catatan: `Edukasi via telemedicine: ${request.title}`,
              updated_at: new Date().toISOString(),
            } as never)
            .eq("jamaah_id", jamaahId);
          if (updErr) console.error("[telemedicine/submit] education update error:", updErr);
        } else {
          const insertPayload: Record<string, unknown> = {
            jamaah_id: jamaahId,
            diet: false,
            aktivitas: false,
            obat: false,
            hidrasi: false,
            istirahat: false,
            manajemen_kronis: false,
            persiapan_perjalanan: false,
            catatan: `Edukasi via telemedicine: ${request.title}`,
          };
          insertPayload[snakeField] = true;
          const { error: insErr } = await supabase.from("pre_hajj_education").insert(insertPayload as never);
          if (insErr) console.error("[telemedicine/submit] education insert error:", insErr);
        }
      }
    }
    // OBAT category: no clinical write (informational chat message only)

    // ===== Result ChatMessage =====

    let resultType: ChatMessageType = "TEXT";
    let resultContent = "Form terkirim";
    if (category === "TTV") {
      resultType = "TTV_RESULT";
      resultContent = summarizeTtvResponse(response);
    } else if (category === "SKRINING") {
      resultType = "SKRINING_RESULT";
      const skorStr = skor ? ` (skor: ${skor})` : "";
      resultContent = `Skrining ${request.sub_type ?? ""} terisi${skorStr}`;
    } else if (category === "DAILY_COMPLAINT") {
      const keluhanRaw = response.keluhan ?? response.keluhanAktif;
      const keluhan = typeof keluhanRaw === "string" && keluhanRaw.trim() ? keluhanRaw.trim() : null;
      resultContent = keluhan ? `Keluhan: ${keluhan}` : "Tidak ada keluhan hari ini";
    } else if (category === "CHRONIC") {
      resultContent = `Monitoring ${request.sub_type ?? ""} tercatat`;
    } else if (category === "EDUKASI") {
      resultContent = `Edukasi ${request.sub_type ?? ""} diterima`;
    } else if (category === "OBAT") {
      resultContent = `Informasi obat diterima`;
    }

    const { data: resultMsgRow, error: resultMsgErr } = await supabase
      .from("chat_message")
      .insert({
        room_id: roomId,
        sender_type: "JAMAAH",
        sender_name: "Jamaah",
        type: resultType,
        content: resultContent,
        request_id: request.id,
        read_by_doctor: false,
        read_by_jamaah: true,
      } as never)
      .select("*")
      .single();

    if (resultMsgErr || !resultMsgRow) {
      console.error("[telemedicine/submit] result message insert error:", resultMsgErr);
    } else {
      const resultMsg = resultMsgRow as ChatMessageRow;
      const serialized = serializeChatMessage(resultMsg);
      newMessages.push(serialized);
      broadcastTelemedicine(jamaahId, "telemedicine:message", { message: serialized }).catch(() => {});
    }

    // Broadcast response event (fire-and-forget)
    broadcastTelemedicine(jamaahId, "telemedicine:response", {
      jamaahId,
      request: serializeTelemedicineRequest(request),
    }).catch(() => {});

    // ===== Alert rules (TTV and DAILY_COMPLAINT) =====

    if (category === "TTV" || category === "DAILY_COMPLAINT") {
      for (const rule of ALERT_RULES) {
        const v = numOrUndefined(response[rule.param]);
        if (v === undefined) continue;
        if (matchesRule(v, rule)) {
          const alert = { level: rule.level, detail: rule.message, param: rule.param };
          alerts.push(alert);

          const { data: alertMsgRow, error: alertMsgErr } = await supabase
            .from("chat_message")
            .insert({
              room_id: roomId,
              sender_type: "AI",
              sender_name: "AI Klinis",
              type: "ALERT",
              content: `${alertEmoji(rule.level)} ${rule.message}`,
              request_id: request.id,
              read_by_doctor: false,
              read_by_jamaah: true,
            } as never)
            .select("*")
            .single();

          if (alertMsgErr || !alertMsgRow) {
            console.error("[telemedicine/submit] alert message insert error:", alertMsgErr);
          } else {
            const alertMsg = alertMsgRow as ChatMessageRow;
            const serialized = serializeChatMessage(alertMsg);
            newMessages.push(serialized);
            broadcastTelemedicine(jamaahId, "telemedicine:alert", {
              jamaahId,
              alert: { level: alert.level, detail: alert.detail },
            }).catch(() => {});
            broadcastTelemedicine(jamaahId, "telemedicine:message", {
              message: serialized,
            }).catch(() => {});
          }
        }
      }
    }

    // ===== Update room lastMessageAt + unreadByDoctor =====

    const unreadInc = newMessages.filter(
      (m) => (m.senderType === "JAMAAH" || m.senderType === "AI") && !m.readByDoctor
    ).length;

    // Fetch fresh room to compute updated unread_by_doctor
    const { data: freshRoom, error: freshRoomErr } = await supabase
      .from("chat_room")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();

    if (freshRoomErr) {
      console.error("[telemedicine/submit] room fetch for update error:", freshRoomErr);
    } else if (freshRoom) {
      const fr = freshRoom as ChatRoomRow;
      const { error: updRoomErr } = await supabase
        .from("chat_room")
        .update({
          last_message_at: new Date().toISOString(),
          unread_by_doctor: (fr.unread_by_doctor ?? 0) + unreadInc,
        } as never)
        .eq("id", roomId);
      if (updRoomErr) console.error("[telemedicine/submit] room update error:", updRoomErr);
    }

    // Re-fetch the updated request
    const { data: updatedRow, error: updFetchErr } = await supabase
      .from("telemedicine_request")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (updFetchErr || !updatedRow) {
      console.error("[telemedicine/submit] refetch updated request error:", updFetchErr);
      return NextResponse.json(
        {
          error: "Request hilang setelah update",
          request: null,
          alerts,
          newMessages,
        },
        { status: 200 }
      );
    }
    const updatedRequest = updatedRow as TelemedicineRequestRow;

    return NextResponse.json(
      {
        request: serializeTelemedicineRequest(updatedRequest),
        alerts,
        newMessages,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[telemedicine/submit] unhandled error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Internal error",
        request: null,
        alerts: [],
        newMessages: [],
      },
      { status: 200 }
    );
  }
}
