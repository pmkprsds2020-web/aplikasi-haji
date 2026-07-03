"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";

// ============================================================================
// useSupabaseChat — Supabase-direct chat hook (single source of truth)
// ----------------------------------------------------------------------------
// Full audit logging: user, roomData, roomError, messageData, messageError.
// Real PostgreSQL error messages surfaced to the user (no generic alerts).
//
// Flow:
//   1. Log auth state (user, auth.uid)
//   2. Ensure chat_room exists (SELECT → INSERT if not found)
//   3. Fetch all messages via supabase.from('chat_message').select()
//   4. Subscribe to Supabase Realtime INSERT events
//   5. Send messages via supabase.from('chat_message').insert()
// ============================================================================

export interface ChatMessageRow {
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

export interface ChatRoomRow {
  id: string;
  jamaah_id: string;
  doctor_id: string;
  last_message_at: string;
  unread_by_doctor: number;
  unread_by_jamaah: number;
}

export interface NewMessageInput {
  senderType: string;
  senderName?: string | null;
  type: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  requestId?: string | null;
}

export function useSupabaseChat(jamaahId: string | null) {
  const supabase = React.useMemo(() => createClient(), []);
  const { user } = useSupabaseAuth();

  const [roomId, setRoomId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessageRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ===== 1. Ensure chat_room exists =====
  // SELECT existing room by jamaah_id. If not found, INSERT a new one.
  // Returns room_id or null (with real error alert).
  const ensureRoom = React.useCallback(async (): Promise<string | null> => {
    console.log("========== ENSURE ROOM ==========");
    console.log("jamaahId:", jamaahId);
    console.log("user:", user);
    console.log("user.id (auth.uid):", user?.id ?? "NOT AUTHENTICATED");

    if (!jamaahId) {
      console.error("[ensureRoom] jamaahId is null — cannot create room");
      alert("Gagal: ID Jamaah tidak ditemukan. Tidak dapat membuat ruang chat.");
      return null;
    }

    if (!user) {
      console.error("[ensureRoom] user is null — not authenticated");
      alert("Gagal: Anda belum terautentikasi. Silakan masuk kembali.");
      return null;
    }

    // ===== Step A: Try to find existing room =====
    console.log("[ensureRoom] Step A: SELECT chat_room WHERE jamaah_id =", jamaahId);
    const { data: roomData, error: roomError } = await supabase
      .from("chat_room")
      .select("*")
      .eq("jamaah_id", jamaahId)
      .maybeSingle();

    console.log("[ensureRoom] roomData:", roomData);
    console.log("[ensureRoom] roomError:", roomError);

    if (roomError) {
      // Real PostgreSQL error
      const pgError = roomError.message || String(roomError);
      const pgCode = (roomError as { code?: string }).code ?? "";
      console.error("[ensureRoom] SELECT failed:", pgCode, pgError);
      alert(`Gagal mencari ruang chat.\n\nPostgreSQL Error [${pgCode}]:\n${pgError}`);
      return null;
    }

    if (roomData?.id) {
      console.log("[ensureRoom] ✓ Existing room found:", roomData.id);
      setRoomId(roomData.id);
      return roomData.id;
    }

    // ===== Step B: Room doesn't exist → INSERT new room =====
    console.log("[ensureRoom] Step B: Room not found. Creating new chat_room...");
    console.log("[ensureRoom] INSERT payload:", {
      jamaah_id: jamaahId,
      doctor_id: user.id,
    });

    const { data: newRoomData, error: newRoomError } = await supabase
      .from("chat_room")
      .insert({
        jamaah_id: jamaahId,
        doctor_id: user.id,
      })
      .select("*")
      .single();

    console.log("[ensureRoom] newRoomData:", newRoomData);
    console.log("[ensureRoom] newRoomError:", newRoomError);

    if (newRoomError) {
      const pgError = newRoomError.message || String(newRoomError);
      const pgCode = (newRoomError as { code?: string }).code ?? "";
      console.error("[ensureRoom] INSERT failed:", pgCode, pgError);
      alert(
        `Gagal membuat ruang chat.\n\nPostgreSQL Error [${pgCode}]:\n${pgError}\n\n` +
        `Payload yang dikirim:\n` +
        `  jamaah_id: ${jamaahId}\n` +
        `  doctor_id: ${user.id}\n\n` +
        `Kemungkinan penyebab:\n` +
        `  1. jamaah_id tidak valid (harus UUID yang ada di tabel jamaah)\n` +
        `  2. RLS Policy menolak INSERT\n` +
        `  3. auth.uid() tidak tersedia`
      );
      return null;
    }

    console.log("[ensureRoom] ✓ New room created:", newRoomData.id);
    setRoomId(newRoomData.id);
    return newRoomData.id;
  }, [jamaahId, user, supabase]);

  // ===== 2. Fetch messages from Supabase =====
  const fetchMessages = React.useCallback(
    async (rId: string) => {
      console.log("[fetchMessages] SELECT chat_message WHERE room_id =", rId);
      const { data, error: fetchErr } = await supabase
        .from("chat_message")
        .select("*")
        .eq("room_id", rId)
        .order("created_at", { ascending: true })
        .limit(200);

      console.log("[fetchMessages] data:", data);
      console.log("[fetchMessages] error:", fetchErr);

      if (fetchErr) {
        const pgError = fetchErr.message || String(fetchErr);
        const pgCode = (fetchErr as { code?: string }).code ?? "";
        console.error("[fetchMessages] failed:", pgCode, pgError);
        setError(pgError);
        return;
      }
      setMessages((data ?? []) as ChatMessageRow[]);
    },
    [supabase]
  );

  // ===== 3. Initialize: ensure room → fetch messages → subscribe realtime =====
  React.useEffect(() => {
    if (!jamaahId) {
      setLoading(false);
      return;
    }
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      setLoading(true);
      setError(null);
      const rId = await ensureRoom();
      if (!active || !rId) {
        setLoading(false);
        return;
      }
      await fetchMessages(rId);
      if (!active) return;

      // ===== Subscribe to Supabase Realtime =====
      console.log("[realtime] Subscribing to channel chat_room:" + rId);
      channel = supabase
        .channel(`chat_room:${rId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_message",
            filter: `room_id=eq.${rId}`,
          },
          (payload) => {
            console.log("[realtime] INSERT event received:", payload);
            const newMsg = payload.new as ChatMessageRow;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        )
        .subscribe((status) => {
          console.log("[realtime] channel status:", status);
        });

      setLoading(false);
    })();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [jamaahId, ensureRoom, fetchMessages, supabase]);

  // ===== 4. Send message via Supabase INSERT =====
  const sendMessage = React.useCallback(
    async (input: NewMessageInput): Promise<ChatMessageRow | null> => {
      console.log("========== SEND MESSAGE ==========");
      console.log("input:", input);
      console.log("user:", user);
      console.log("user.id:", user?.id ?? "NOT AUTHENTICATED");
      console.log("current roomId:", roomId);

      if (!jamaahId) {
        alert("Gagal: ID Jamaah tidak ditemukan.");
        return null;
      }
      if (!user) {
        alert("Gagal: Anda belum terautentikasi. Silakan masuk kembali.");
        return null;
      }

      // Ensure we have a room_id before INSERT
      let rId = roomId;
      if (!rId) {
        console.log("[sendMessage] roomId is null — calling ensureRoom...");
        rId = await ensureRoom();
      }
      if (!rId) {
        // ensureRoom already showed the real error alert
        return null;
      }

      const senderName = input.senderName ?? user.email ?? "Dokter";

      // ===== console.log before INSERT =====
      console.log("[sendMessage] INSERT payload to chat_message:");
      console.log("  room_id:", rId);
      console.log("  sender_type:", input.senderType);
      console.log("  sender_name:", senderName);
      console.log("  type:", input.type);
      console.log("  content:", input.content);
      console.log("  auth.uid():", user.id);

      setSending(true);
      const { data: messageData, error: messageError } = await supabase
        .from("chat_message")
        .insert({
          room_id: rId,
          sender_type: input.senderType,
          sender_name: senderName,
          type: input.type,
          content: input.content,
          attachment_url: input.attachmentUrl ?? null,
          attachment_name: input.attachmentName ?? null,
          request_id: input.requestId ?? null,
        })
        .select("*")
        .single();

      console.log("[sendMessage] messageData:", messageData);
      console.log("[sendMessage] messageError:", messageError);
      console.log("==================================");

      setSending(false);

      if (messageError) {
        const pgError = messageError.message || String(messageError);
        const pgCode = (messageError as { code?: string }).code ?? "";
        console.error("[sendMessage] INSERT failed:", pgCode, pgError);
        alert(
          `Gagal mengirim pesan.\n\nPostgreSQL Error [${pgCode}]:\n${pgError}\n\n` +
          `Payload:\n  room_id: ${rId}\n  sender_type: ${input.senderType}\n  type: ${input.type}`
        );
        return null;
      }

      const inserted = messageData as ChatMessageRow;

      // Update room's last_message_at (fire-and-forget, log errors)
      const { error: roomUpdateErr } = await supabase
        .from("chat_room")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", rId);
      if (roomUpdateErr) {
        console.warn("[sendMessage] Failed to update last_message_at:", roomUpdateErr.message);
      }

      // Realtime will add the message automatically, but as fallback:
      setMessages((prev) => {
        if (prev.some((m) => m.id === inserted.id)) return prev;
        return [...prev, inserted];
      });

      console.log("[sendMessage] ✓ Message inserted:", inserted.id);
      return inserted;
    },
    [jamaahId, roomId, ensureRoom, user, supabase]
  );

  // ===== 5. Mark messages as read =====
  const markRead = React.useCallback(
    async (readerRole: "DOCTOR" | "JAMAAH") => {
      if (!roomId) return;
      const field = readerRole === "DOCTOR" ? "read_by_doctor" : "read_by_jamaah";
      await supabase
        .from("chat_message")
        .update({ [field]: true })
        .eq("room_id", roomId)
        .eq(field, false);
    },
    [roomId, supabase]
  );

  return {
    roomId,
    messages,
    loading,
    sending,
    error,
    sendMessage,
    markRead,
    refresh: () => (roomId ? fetchMessages(roomId) : Promise.resolve()),
  };
}
