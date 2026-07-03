"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";
import { logAuditClient } from "@/lib/audit-client";

// ============================================================================
// useSupabaseChat — Supabase-direct chat hook (single source of truth)
// ----------------------------------------------------------------------------
// Chapter 3: Supabase is the ONLY database. No local state as primary store.
// Chapter 5: RLS-protected inserts/selects.
// Chapter 14: Supabase Realtime for live message sync.
//
// Flow:
//   1. Ensure chat_room exists (upsert by jamaah_id)
//   2. Fetch all messages via supabase.from('chat_message').select()
//   3. Subscribe to Realtime INSERT events on chat_message (filtered by room_id)
//   4. Send messages via supabase.from('chat_message').insert()
// ============================================================================

export interface ChatMessageRow {
  id: string;
  room_id: string;
  sender_type: string; // DOCTOR | JAMAAH | SYSTEM | AI
  sender_name: string | null;
  type: string; // TEXT | IMAGE | FILE | TTV_REQUEST | ...
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

  // ===== 1. Ensure chat_room exists, get room_id =====
  const ensureRoom = React.useCallback(async (): Promise<string | null> => {
    if (!jamaahId) return null;

    // Try to find existing room
    const { data: existing, error: findErr } = await supabase
      .from("chat_room")
      .select("id")
      .eq("jamaah_id", jamaahId)
      .is("deleted_at", null)
      .maybeSingle();

    if (findErr) {
      console.error("[chat] ensureRoom: find error", findErr);
      return null;
    }
    if (existing?.id) {
      setRoomId(existing.id);
      return existing.id;
    }

    // Create new room
    const { data: created, error: createErr } = await supabase
      .from("chat_room")
      .insert({
        jamaah_id: jamaahId,
        doctor_id: user?.id ?? null,
      })
      .select("id")
      .single();

    if (createErr) {
      console.error("[chat] ensureRoom: create error", createErr);
      return null;
    }
    setRoomId(created.id);
    return created.id;
  }, [jamaahId, supabase, user?.id]);

  // ===== 2. Fetch messages from Supabase =====
  const fetchMessages = React.useCallback(async (rId: string) => {
    const { data, error: fetchErr } = await supabase
      .from("chat_message")
      .select("*")
      .eq("room_id", rId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(200);

    if (fetchErr) {
      console.error("[chat] fetchMessages error", fetchErr);
      setError(fetchErr.message);
      return;
    }
    setMessages((data ?? []) as ChatMessageRow[]);
  }, [supabase]);

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
            const newMsg = payload.new as ChatMessageRow;
            setMessages((prev) => {
              // Deduplicate (in case the insert callback fires for our own message)
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        )
        .subscribe();

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
      if (!jamaahId) {
        alert("Jamaah ID tidak ditemukan. Tidak dapat mengirim pesan.");
        return null;
      }

      // Ensure we have a room_id before INSERT
      let rId = roomId;
      if (!rId) {
        rId = await ensureRoom();
      }
      if (!rId) {
        alert("Gagal membuat ruang chat. Pastikan Supabase terhubung dan Anda terautentikasi.");
        return null;
      }

      // Verify auth.uid() is available
      if (!user) {
        alert("Anda belum terautentikasi. Silakan masuk kembali.");
        return null;
      }

      const senderName = input.senderName ?? user.email ?? "Dokter";

      // ===== console.log before INSERT (Chapter audit requirement #6) =====
      console.log("========== CHAT INSERT ==========");
      console.log("room_id:", rId);
      console.log("sender_type:", input.senderType);
      console.log("sender_name:", senderName);
      console.log("type:", input.type);
      console.log("content:", input.content);
      console.log("auth.uid():", user.id);
      console.log("=================================");

      setSending(true);
      const { data, error: insertErr } = await supabase
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
        .select()
        .single();

      setSending(false);

      if (insertErr) {
        // ===== Error handling (Chapter audit requirement #7) =====
        console.error("[chat] INSERT failed:", insertErr);
        alert(`Gagal mengirim pesan: ${insertErr.message}`);
        return null;
      }

      const inserted = data as ChatMessageRow;

      // Update room's last_message_at (fire-and-forget)
      await supabase
        .from("chat_room")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", rId);

      // Note: Realtime subscription will add the message to state automatically.
      // But as a fallback (in case Realtime isn't active), add it manually.
      setMessages((prev) => {
        if (prev.some((m) => m.id === inserted.id)) return prev;
        return [...prev, inserted];
      });

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
