"use client";

import { createClient } from "./client";
import { logSelect, logInsert, logUpdate } from "./query-logger";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ============================================================================
// Supabase-direct telemedicine helpers (client-side, single source of truth).
// ============================================================================

export interface ChatRoomRow {
  id: string; jamaah_id: string; doctor_id: string;
  last_message_at: string; unread_by_doctor: number; unread_by_jamaah: number; created_at: string;
}
export interface ChatMessageRow {
  id: string; room_id: string; sender_type: string; sender_name: string | null;
  type: string; content: string; attachment_url: string | null; attachment_name: string | null;
  request_id: string | null; read_by_doctor: boolean; read_by_jamaah: boolean; created_at: string;
}
export interface RoomListItem {
  id: string; jamaahId: string; doctorId: string;
  unreadByDoctor: number; unreadByJamaah: number; lastMessageAt: string;
  jamaah: { id: string; nama: string; nik: string; kloter: string; usia: number; kelamin: string; puskesmas: string; riskLevel: string; riskSummary: string; } | null;
  lastMessage: ChatMessageRow | null;
}

export async function ensureRoom(jamaahId: string, doctorId: string): Promise<{ room: ChatRoomRow | null; error: string | null }> {
  if (!jamaahId) return { room: null, error: "ID Jamaah belum tersedia." };
  if (!doctorId) return { room: null, error: "ID Dokter belum tersedia." };
  const supabase = createClient();
  const t0 = performance.now();
  const { data: existing, error: selErr } = await supabase.from("chat_room").select("*").eq("jamaah_id", jamaahId).maybeSingle();
  logSelect("chat_room", `jamaah_id=eq.${jamaahId}`, existing ? [existing] : null, selErr, Math.round(performance.now() - t0));
  if (selErr) return { room: null, error: `[${selErr.code}] ${selErr.message}` };
  if (existing) return { room: existing as ChatRoomRow, error: null };
  const now = new Date().toISOString();
  const insertPayload = { jamaah_id: jamaahId, doctor_id: doctorId, last_message_at: now, unread_by_doctor: 0, unread_by_jamaah: 0 };
  const t1 = performance.now();
  const { data: newRoom, error: insErr } = await supabase.from("chat_room").insert(insertPayload).select("*").single();
  logInsert("chat_room", insertPayload, newRoom, insErr, Math.round(performance.now() - t1));
  if (insErr) return { room: null, error: `[${insErr.code}] ${insErr.message}` };
  return { room: newRoom as ChatRoomRow, error: null };
}

export async function loadRoomsList(): Promise<{ rooms: RoomListItem[]; error: string | null }> {
  const supabase = createClient();

  // ===== Step 1: Fetch chat_room records =====
  const t0 = performance.now();
  const { data: rooms, error: rErr } = await supabase
    .from("chat_room")
    .select("*")
    .order("last_message_at", { ascending: false });
  logSelect("chat_room", "ORDER BY last_message_at DESC", rooms, rErr, Math.round(performance.now() - t0));

  if (rErr) {
    console.error("[loadRoomsList] chat_room query failed:", rErr.code, rErr.message);
    return { rooms: [], error: `[${rErr.code}] ${rErr.message}` };
  }
  if (!rooms || rooms.length === 0) {
    console.log("[loadRoomsList] No chat rooms found — returning empty list");
    return { rooms: [], error: null };
  }

  const roomRows = rooms as ChatRoomRow[];
  console.log("[loadRoomsList] chat_rooms:", roomRows.length, "rooms");
  console.log("[loadRoomsList] chatRooms[0].jamaah_id:", roomRows[0]?.jamaah_id);

  // ===== Step 2: Collect jamaah_ids and validate UUIDs =====
  // jamaah.id is UUID type, but chat_room.jamaah_id is text.
  // If a jamaah_id is not a valid UUID (e.g., old Prisma cuid), the .in() query
  // on jamaah will fail with HTTP 400. We filter to only valid UUIDs.
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const allJamaahIds = Array.from(new Set(roomRows.map((r) => r.jamaah_id).filter(Boolean)));
  const validUuids = allJamaahIds.filter((id) => UUID_REGEX.test(id));
  const invalidIds = allJamaahIds.filter((id) => !UUID_REGEX.test(id));

  console.log("[loadRoomsList] jamaah_ids:", allJamaahIds.length, "total,", validUuids.length, "valid UUIDs,", invalidIds.length, "invalid");
  if (invalidIds.length > 0) {
    console.warn("[loadRoomsList] Invalid (non-UUID) jamaah_ids:", invalidIds);
  }

  const roomIds = roomRows.map((r) => r.id);

  // ===== Step 3: Fetch jamaah + messages in parallel using Promise.allSettled =====
  // If jamaah query fails (400), we still show rooms with null jamaah — NOT blank.
  const [jamaahRes, messagesRes] = await Promise.allSettled([
    validUuids.length > 0
      ? supabase
          .from("jamaah")
          .select("id, nama, nik, kloter, usia, kelamin, puskesmas, risk_level, risk_summary")
          .in("id", validUuids)
      : Promise.resolve({ data: [], error: null }),
    roomIds.length > 0
      ? supabase
          .from("chat_message")
          .select("*")
          .in("room_id", roomIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  // ===== Step 4: Process jamaah results =====
  let jamaahData: Array<Record<string, unknown>> | null = null;
  if (jamaahRes.status === "fulfilled") {
    jamaahData = (jamaahRes.value.data ?? []) as Array<Record<string, unknown>>;
    if (jamaahRes.value.error) {
      console.error("[loadRoomsList] jamaah query error:", jamaahRes.value.error.code, jamaahRes.value.error.message);
      // Fallback: try fetching jamaah one by one with .eq() (handles non-UUID IDs)
      if (validUuids.length === 0 && allJamaahIds.length > 0) {
        console.log("[loadRoomsList] Fallback: fetching jamaah individually with .eq()");
        jamaahData = [];
        for (const jid of allJamaahIds) {
          try {
            const { data: singleJamaah, error: singleErr } = await supabase
              .from("jamaah")
              .select("id, nama, nik, kloter, usia, kelamin, puskesmas, risk_level, risk_summary")
              .eq("id", jid)
              .maybeSingle();
            if (!singleErr && singleJamaah) {
              jamaahData.push(singleJamaah as Record<string, unknown>);
            }
          } catch {
            // Skip invalid IDs
          }
        }
        console.log("[loadRoomsList] Fallback fetched:", jamaahData.length, "jamaah");
      }
    } else {
      console.log("[loadRoomsList] jamaah fetched:", jamaahData.length);
    }
  } else {
    console.error("[loadRoomsList] jamaah query rejected:", jamaahRes.reason);
  }

  // ===== Step 5: Build jamaah map =====
  const jamaahMap = new Map<string, RoomListItem["jamaah"]>();
  for (const j of jamaahData ?? []) {
    const id = String(j.id);
    jamaahMap.set(id, {
      id,
      nama: String(j.nama ?? ""),
      nik: String(j.nik ?? ""),
      kloter: String(j.kloter ?? ""),
      usia: Number(j.usia ?? 0),
      kelamin: String(j.kelamin ?? ""),
      puskesmas: String(j.puskesmas ?? ""),
      riskLevel: String(j.risk_level ?? "HIJAU"),
      riskSummary: String(j.risk_summary ?? ""),
    });
  }
  console.log("[loadRoomsList] jamaahMap:", jamaahMap.size, "entries");
  console.log("[loadRoomsList] jamaahMap keys:", Array.from(jamaahMap.keys()));

  // ===== Step 6: Process messages =====
  let messagesData: ChatMessageRow[] | null = null;
  if (messagesRes.status === "fulfilled") {
    messagesData = (messagesRes.value.data ?? []) as ChatMessageRow[];
    console.log("[loadRoomsList] messages fetched:", messagesData.length);
  } else {
    console.warn("[loadRoomsList] messages query rejected:", messagesRes.reason);
  }

  // Build latest-message-per-room map
  const latestMsgMap = new Map<string, ChatMessageRow>();
  for (const m of messagesData ?? []) {
    if (!latestMsgMap.has(m.room_id)) {
      latestMsgMap.set(m.room_id, m);
    }
  }

  // ===== Step 7: Assemble final list =====
  const list: RoomListItem[] = roomRows.map((r) => ({
    id: r.id,
    jamaahId: r.jamaah_id,
    doctorId: r.doctor_id,
    unreadByDoctor: r.unread_by_doctor ?? 0,
    unreadByJamaah: r.unread_by_jamaah ?? 0,
    lastMessageAt: r.last_message_at ?? r.created_at,
    jamaah: jamaahMap.get(r.jamaah_id) ?? null,
    lastMessage: latestMsgMap.get(r.id) ?? null,
  }));

  // Log final result
  const withNama = list.filter((r) => r.jamaah !== null).length;
  const withoutNama = list.filter((r) => r.jamaah === null).length;
  console.log(`[loadRoomsList] Final: ${list.length} rooms (${withNama} with nama, ${withoutNama} without nama)`);

  return { rooms: list, error: null };
}

export async function sendChatMessage(roomId: string, input: { senderType: string; senderName?: string | null; type: string; content: string; attachmentUrl?: string | null; attachmentName?: string | null; requestId?: string | null; }): Promise<{ message: ChatMessageRow | null; error: string | null }> {
  if (!roomId) return { message: null, error: "Room ID belum tersedia." };
  const supabase = createClient();
  const insertPayload = { room_id: roomId, sender_type: input.senderType, sender_name: input.senderName ?? null, type: input.type, content: input.content, attachment_url: input.attachmentUrl ?? null, attachment_name: input.attachmentName ?? null, request_id: input.requestId ?? null };
  const t0 = performance.now();
  const { data: msg, error: insErr } = await supabase.from("chat_message").insert(insertPayload).select("*").single();
  logInsert("chat_message", insertPayload, msg, insErr, Math.round(performance.now() - t0));
  if (insErr) return { message: null, error: `[${insErr.code}] ${insErr.message}` };
  const now = new Date().toISOString();
  const unreadInc = input.senderType === "JAMAAH" ? { unread_by_doctor: 1 } : input.senderType === "DOCTOR" ? { unread_by_jamaah: 1 } : {};
  const updatePayload = { last_message_at: now, ...unreadInc };
  const t1 = performance.now();
  const { error: roomErr } = await supabase.from("chat_room").update(updatePayload).eq("id", roomId);
  logUpdate("chat_room", `id=eq.${roomId}`, updatePayload, null, roomErr, Math.round(performance.now() - t1));
  if (roomErr) console.warn("[sendChatMessage] room update failed:", roomErr.message);
  return { message: msg as ChatMessageRow, error: null };
}

export async function markRoomReadByDoctor(roomId: string): Promise<void> {
  if (!roomId) return;
  const supabase = createClient();
  const t0 = performance.now();
  const { data: updated, error: msgErr } = await supabase.from("chat_message").update({ read_by_doctor: true }).eq("room_id", roomId).eq("read_by_doctor", false).neq("sender_type", "DOCTOR").select("id");
  logUpdate("chat_message", `room_id=eq.${roomId}`, { read_by_doctor: true }, updated, msgErr, Math.round(performance.now() - t0));
  const t1 = performance.now();
  const { error: roomErr } = await supabase.from("chat_room").update({ unread_by_doctor: 0 }).eq("id", roomId);
  logUpdate("chat_room", `id=eq.${roomId}`, { unread_by_doctor: 0 }, null, roomErr, Math.round(performance.now() - t1));
}

export async function loadTelemedicineDashboardStats(): Promise<{ stats: { unread: number; pendingForms: number; highRisk: number; online: number; followUp: number; }; error: string | null; }> {
  const supabase = createClient();
  const results = await Promise.allSettled([
    supabase.from("chat_room").select("unread_by_doctor").gt("unread_by_doctor", 0),
    supabase.from("telemedicine_request").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    supabase.from("jamaah").select("id", { count: "exact", head: true }).eq("risk_level", "MERAH"),
    supabase.from("jamaah").select("id", { count: "exact", head: true }).eq("risk_level", "KUNING"),
  ]);
  const get = <T,>(idx: number, fallback: T): T => results[idx].status === "fulfilled" ? (results[idx].value as T) : fallback;
  const unread = (get(0, { data: [] as unknown[] }).data ?? []).length;
  const pendingForms = get(1, { count: 0 }).count ?? 0;
  const highRisk = get(2, { count: 0 }).count ?? 0;
  const followUp = get(3, { count: 0 }).count ?? 0;
  return { stats: { unread, pendingForms, highRisk, followUp, online: 0 }, error: null };
}

export function subscribeToRoomMessages(roomId: string, handlers: { onInsert?: (msg: ChatMessageRow) => void; onUpdate?: (msg: ChatMessageRow) => void; onDelete?: (msgId: string) => void; }): () => void {
  const supabase = createClient();
  const channel = supabase.channel(`chat_room:${roomId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_message", filter: `room_id=eq.${roomId}` }, (payload) => handlers.onInsert?.(payload.new as ChatMessageRow))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_message", filter: `room_id=eq.${roomId}` }, (payload) => handlers.onUpdate?.(payload.new as ChatMessageRow))
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_message", filter: `room_id=eq.${roomId}` }, (payload) => { const old = payload.old as { id: string }; handlers.onDelete?.(old.id); })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToRoomsList(handlers: { onChange?: () => void; }): () => void {
  const supabase = createClient();
  const channel = supabase.channel("chat_room:all")
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_room" }, () => handlers.onChange?.())
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_message" }, () => handlers.onChange?.())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
