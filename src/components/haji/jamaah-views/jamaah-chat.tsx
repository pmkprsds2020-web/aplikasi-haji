"use client";

import * as React from "react";
import {
  ArrowLeft, Send, Smile, Paperclip, Loader2, Stethoscope,
  Check, CheckCheck, ImageIcon, FileText, File as FileIcon,
  AlertCircle, AlertTriangle, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { InteractiveFormCard } from "../telemedicine/interactive-form-card";

// ============================================================================
// JamaahChat — simplified telemedicine chat for the patient (jamaah).
// ----------------------------------------------------------------------------
// Unlike the doctor's ConversationPanel, this view shows ONLY the jamaah's
// assigned doctor. It is self-contained (does NOT use useSupabaseChat hook)
// because the existing hook sets doctor_id = user.id which would be wrong for
// a jamaah (jamaah is not a doctor).
//
// Flow:
//   1. Fetch jamaah record by user_id → get (id, nama, doctor_id)
//   2. If doctor_id is null → show "no doctor assigned" state
//   3. Fetch doctor's profile (full_name, email, phone)
//   4. Ensure chat_room exists for jamaah_id with doctor_id = assigned doctor
//      (SELECT by jamaah_id → INSERT if missing → UPDATE if doctor_id mismatch)
//   5. Fetch all messages for room_id ordered by created_at ASC
//   6. Subscribe to Supabase Realtime INSERT events on chat_message
//   7. Send via INSERT (sender_type = 'JAMAAH')
//   8. Mark inbound DOCTOR messages as read_by_jamaah = true on view
// ============================================================================

interface ChatMessageRow {
  id: string;
  room_id: string;
  sender_type: "DOCTOR" | "JAMAAH" | "SYSTEM" | "AI";
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

interface DoctorProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface JamaahRecord {
  id: string;
  nama: string;
  doctor_id: string | null;
  dokter_keluarga: string | null;
}

const COMMON_EMOJIS = [
  "👍", "❤️", "🙏", "😊", "😢", "👌", "✅", "⏰",
  "💊", "🩺", "📞", "🔴", "🟡", "🟢", "💡", "🌡️",
];

const ATTACH_OPTIONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "IMAGE", label: "Foto", icon: ImageIcon },
  { key: "PDF", label: "PDF", icon: FileText },
  { key: "FILE", label: "File", icon: FileIcon },
];

export function JamaahChat() {
  const supabase = React.useMemo(() => createClient(), []);
  const { user } = useSupabaseAuth();
  const { goJamaahDashboard } = useApp();

  // ===== State =====
  const [jamaah, setJamaah] = React.useState<JamaahRecord | null>(null);
  const [doctor, setDoctor] = React.useState<DoctorProfile | null>(null);
  const [roomId, setRoomId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessageRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [noDoctor, setNoDoctor] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [input, setInput] = React.useState("");
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [attachOpen, setAttachOpen] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // ===== 1. On mount: fetch jamaah record by user_id =====
  React.useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!user) {
        setLoading(false);
        return;
      }
      console.log("[JamaahChat] bootstrap: fetching jamaah for user_id =", user.id);
      console.log("[JamaahChat] auth.uid:", user.id, "| email:", user.email);

      const { data: jData, error: jErr } = await supabase
        .from("jamaah")
        .select("id, nama, doctor_id, dokter_keluarga, email")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("[JamaahChat] jamaah row:", jData, "error:", jErr);

      if (!active) return;
      if (jErr) {
        const pgError = jErr.message || String(jErr);
        const pgCode = (jErr as { code?: string }).code ?? "";
        console.error("[JamaahChat] fetch jamaah failed:", pgCode, pgError);
        setLoadError(`Gagal memuat data jamaah. [${pgCode}] ${pgError}`);
        toast.error(`Gagal memuat data jamaah`, { description: `[${pgCode}] ${pgError}` });
        setLoading(false);
        return;
      }
      if (!jData) {
        console.error("[JamaahChat] No jamaah record found for user_id =", user.id);
        setLoadError("Data jamaah tidak ditemukan. Hubungi Puskesmas untuk pendaftaran.");
        toast.error("Data jamaah tidak ditemukan");
        setLoading(false);
        return;
      }

      let jamaahRec: JamaahRecord = {
        id: jData.id,
        nama: jData.nama,
        doctor_id: jData.doctor_id,
        dokter_keluarga: jData.dokter_keluarga,
      };

      console.log("[JamaahChat] jamaah_id:", jamaahRec.id, "| doctor_id:", jamaahRec.doctor_id, "| dokter_keluarga:", jamaahRec.dokter_keluarga);

      // ===== AUTO-ASSIGN doctor_id if null =====
      // Strategy (in order):
      // 1. Match dokter_keluarga name to profiles.full_name (role='dokter')
      // 2. If no name match, assign the first available dokter
      if (!jamaahRec.doctor_id) {
        console.log("[JamaahChat] doctor_id is null — auto-assigning...");

        let assignedDoctorId: string | null = null;

        // Strategy 1: Try to match dokter_keluarga name to a dokter profile
        if (jamaahRec.dokter_keluarga && jamaahRec.dokter_keluarga.trim()) {
          console.log("[JamaahChat] Trying name match: dokter_keluarga =", jamaahRec.dokter_keluarga);
          const { data: nameMatch, error: nameErr } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("role", "dokter")
            .ilike("full_name", `%${jamaahRec.dokter_keluarga.trim()}%`)
            .limit(1)
            .maybeSingle();

          console.log("[JamaahChat] name match result:", nameMatch, "error:", nameErr);

          if (nameMatch && !nameErr) {
            assignedDoctorId = (nameMatch as Record<string, unknown>).id as string;
            console.log("[JamaahChat] Name match found! doctor_id =", assignedDoctorId);
          }
        }

        // Strategy 2: If no name match, assign the first available dokter
        if (!assignedDoctorId) {
          console.log("[JamaahChat] No name match — finding any available dokter...");
          const { data: anyDokter, error: dokterErr } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("role", "dokter")
            .limit(1)
            .maybeSingle();

          console.log("[JamaahChat] any dokter result:", anyDokter, "error:", dokterErr);

          if (anyDokter && !dokterErr) {
            assignedDoctorId = (anyDokter as Record<string, unknown>).id as string;
            console.log("[JamaahChat] Found dokter. doctor_id =", assignedDoctorId);
          }
        }

        // If we found a doctor, update jamaah
        if (assignedDoctorId) {
          console.log("[JamaahChat] Updating jamaah.doctor_id =", assignedDoctorId);
          const { error: updateErr } = await supabase
            .from("jamaah")
            .update({ doctor_id: assignedDoctorId })
            .eq("id", jamaahRec.id);

          if (updateErr) {
            console.warn("[JamaahChat] Failed to auto-assign doctor_id:", updateErr.message);
          } else {
            console.log("[JamaahChat] doctor_id auto-assigned successfully!");
            jamaahRec = { ...jamaahRec, doctor_id: assignedDoctorId };
          }
        } else {
          console.warn("[JamaahChat] No dokter found in profiles table at all");
        }
      }

      if (!active) return;
      setJamaah(jamaahRec);

      // If still no doctor_id after auto-assign, show "no doctor" state
      if (!jamaahRec.doctor_id) {
        console.log("[JamaahChat] doctor_id still null after auto-assign — showing 'no doctor' state");
        setNoDoctor(true);
        setLoading(false);
        return;
      }

      // ===== 2. Fetch doctor's profile =====
      console.log("[JamaahChat] fetching doctor profile for id =", jamaahRec.doctor_id);
      const { data: dData, error: dErr } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", jamaahRec.doctor_id)
        .maybeSingle();

      console.log("[JamaahChat] doctor profile:", dData, "error:", dErr);
      if (!active) return;
      if (dErr) {
        const pgError = dErr.message || String(dErr);
        const pgCode = (dErr as { code?: string }).code ?? "";
        console.error("[JamaahChat] fetch doctor profile failed:", pgCode, pgError);
        toast.error(`Gagal memuat profil dokter`, { description: `[${pgCode}] ${pgError}` });
        // Non-fatal: still try to open chat
      }
      if (dData) {
        setDoctor({
          id: dData.id,
          full_name: dData.full_name,
          email: dData.email,
          phone: null,
        });
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, [supabase, user]);

  // ===== 3. Ensure chat_room exists + fetch messages + subscribe Realtime =====
  React.useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setupChat() {
      if (!user || !jamaah || !jamaah.doctor_id) return;
      console.log("[JamaahChat] setupChat: ensuring room for jamaah_id =", jamaah.id, "doctor_id =", jamaah.doctor_id);

      // --- SELECT existing room by jamaah_id ---
      const { data: roomData, error: roomErr } = await supabase
        .from("chat_room")
        .select("id, doctor_id")
        .eq("jamaah_id", jamaah.id)
        .maybeSingle();

      console.log("[JamaahChat] roomData:", roomData, "error:", roomErr);
      if (!active) return;

      if (roomErr) {
        const pgError = roomErr.message || String(roomErr);
        const pgCode = (roomErr as { code?: string }).code ?? "";
        console.error("[JamaahChat] SELECT chat_room failed:", pgCode, pgError);
        toast.error("Gagal memuat ruang chat", { description: `[${pgCode}] ${pgError}` });
        setLoadError(`Gagal memuat ruang chat. [${pgCode}] ${pgError}`);
        setLoading(false);
        return;
      }

      let rId: string;

      if (roomData?.id) {
        rId = roomData.id;
        console.log("[JamaahChat] existing room found:", rId);
        // Verify doctor_id matches the assigned doctor; update if mismatched
        if (roomData.doctor_id !== jamaah.doctor_id) {
          console.warn("[JamaahChat] doctor_id mismatch in chat_room. Updating to assigned doctor...");
          const { error: updErr } = await supabase
            .from("chat_room")
            .update({ doctor_id: jamaah.doctor_id })
            .eq("id", rId);
          if (updErr) {
            console.error("[JamaahChat] update doctor_id failed:", updErr.message);
          } else {
            console.log("[JamaahChat] doctor_id updated to", jamaah.doctor_id);
          }
        }
      } else {
        // --- INSERT new room with jamaah_id + assigned doctor_id ---
        console.log("[JamaahChat] no room found, INSERT new chat_room with doctor_id =", jamaah.doctor_id);
        const { data: newRoom, error: newRoomErr } = await supabase
          .from("chat_room")
          .insert({
            jamaah_id: jamaah.id,
            doctor_id: jamaah.doctor_id,
          })
          .select("id")
          .single();

        console.log("[JamaahChat] newRoom:", newRoom, "error:", newRoomErr);
        if (!active) return;
        if (newRoomErr || !newRoom) {
          const pgError = newRoomErr?.message ?? String(newRoomErr);
          const pgCode = (newRoomErr as { code?: string } | null)?.code ?? "";
          console.error("[JamaahChat] INSERT chat_room failed:", pgCode, pgError);
          toast.error("Gagal membuat ruang chat", {
            description: `[${pgCode}] ${pgError}`,
          });
          setLoadError(`Gagal membuat ruang chat. [${pgCode}] ${pgError}`);
          setLoading(false);
          return;
        }
        rId = newRoom.id;
        console.log("[JamaahChat] new room created:", rId);
      }

      setRoomId(rId);

      // --- Fetch messages ---
      await fetchMessages(rId);
      if (!active) return;
      setLoading(false);

      // --- Subscribe to Realtime INSERT events ---
      console.log("[JamaahChat] subscribing to Realtime channel for room:", rId);
      channel = supabase
        .channel(`jamaah_chat:${rId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_message",
            filter: `room_id=eq.${rId}`,
          },
          (payload) => {
            console.log("[JamaahChat] Realtime INSERT:", payload);
            const newMsg = payload.new as ChatMessageRow;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        )
        .subscribe((status) => {
          console.log("[JamaahChat] Realtime channel status:", status);
        });
    }

    async function fetchMessages(rId: string) {
      console.log("[JamaahChat] fetching messages for room:", rId);
      const { data: msgData, error: msgErr } = await supabase
        .from("chat_message")
        .select("*")
        .eq("room_id", rId)
        .order("created_at", { ascending: true })
        .limit(200);

      console.log("[JamaahChat] messages:", msgData?.length ?? 0, "error:", msgErr);
      if (msgErr) {
        const pgError = msgErr.message || String(msgErr);
        const pgCode = (msgErr as { code?: string }).code ?? "";
        console.error("[JamaahChat] fetch messages failed:", pgCode, pgError);
        toast.error("Gagal memuat pesan", { description: `[${pgCode}] ${pgError}` });
        return;
      }
      const rows = (msgData ?? []) as ChatMessageRow[];
      setMessages(rows);

      // --- Mark inbound DOCTOR/SYSTEM/AI messages as read by jamaah ---
      const unreadInbound = rows.filter(
        (m) => m.sender_type !== "JAMAAH" && !m.read_by_jamaah
      );
      if (unreadInbound.length > 0) {
        console.log("[JamaahChat] marking", unreadInbound.length, "inbound messages as read_by_jamaah");
        const { error: markErr } = await supabase
          .from("chat_message")
          .update({ read_by_jamaah: true })
          .eq("room_id", rId)
          .neq("sender_type", "JAMAAH")
          .eq("read_by_jamaah", false);
        if (markErr) {
          console.warn("[JamaahChat] mark read failed:", markErr.message);
        }
      }

      // --- Reset unread_by_jamaah counter ---
      const { error: counterErr } = await supabase
        .from("chat_room")
        .update({ unread_by_jamaah: 0 })
        .eq("id", rId);
      if (counterErr) {
        console.warn("[JamaahChat] reset unread_by_jamaah failed:", counterErr.message);
      }
    }

    void setupChat();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, user, jamaah]);

  // ===== Auto-scroll to bottom on new messages =====
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // ===== Send a TEXT message =====
  async function sendText(content?: string) {
    const text = (content ?? input).trim();
    if (!text) return;
    if (!roomId || !jamaah) {
      toast.error("Ruang chat belum siap");
      return;
    }
    console.log("[JamaahChat] sendText:", { room_id: roomId, content: text, sender: jamaah.nama });
    setSending(true);
    try {
      const insertPayload = {
        room_id: roomId,
        sender_type: "JAMAAH" as const,
        sender_name: jamaah.nama,
        type: "TEXT",
        content: text,
        attachment_url: null,
        attachment_name: null,
        request_id: null,
      };
      console.log("[JamaahChat] INSERT payload:", insertPayload);
      const { data: insData, error: insErr } = await supabase
        .from("chat_message")
        .insert(insertPayload);

      console.log("[JamaahChat] insert result data:", insData, "error:", insErr);
      if (insErr) {
        const pgError = insErr.message || String(insErr);
        const pgCode = (insErr as { code?: string }).code ?? "";
        const pgDetails = (insErr as { details?: string }).details ?? "";
        const pgHint = (insErr as { hint?: string }).hint ?? "";
        console.error("[JamaahChat] INSERT failed:", pgCode, pgError, pgDetails, pgHint);
        toast.error("Gagal mengirim pesan", {
          description: `[${pgCode}] ${pgError}${pgDetails ? ` · ${pgDetails}` : ""}${pgHint ? ` · ${pgHint}` : ""}`,
        });
        return;
      }
      console.log("[JamaahChat] ✓ message inserted, refreshing");
      setInput("");
      // Update room last_message_at (fire-and-forget)
      const { error: updErr } = await supabase
        .from("chat_room")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", roomId);
      if (updErr) console.warn("[JamaahChat] last_message_at update failed:", updErr.message);
      // Refresh messages to confirm
      const { data: refresh, error: refErr } = await supabase
        .from("chat_message")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!refErr && refresh) {
        setMessages(refresh as ChatMessageRow[]);
      }
      toast.success("Pesan terkirim");
    } catch (err) {
      console.error("[JamaahChat] sendText exception:", err);
      toast.error("Terjadi kesalahan", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSending(false);
    }
  }

  // ===== Send an attachment placeholder (IMAGE / PDF / FILE) =====
  async function sendAttachment(type: "IMAGE" | "PDF" | "FILE", label: string) {
    if (!roomId || !jamaah) {
      toast.error("Ruang chat belum siap");
      return;
    }
    console.log("[JamaahChat] sendAttachment:", { type, label });
    setSending(true);
    try {
      const placeholderContent = `[${label} — ketuk untuk melihat]`;
      const { error: insErr } = await supabase.from("chat_message").insert({
        room_id: roomId,
        sender_type: "JAMAAH",
        sender_name: jamaah.nama,
        type,
        content: placeholderContent,
        attachment_name: `lampiran-${type.toLowerCase()}.bin`,
      });
      if (insErr) {
        const pgError = insErr.message || String(insErr);
        const pgCode = (insErr as { code?: string }).code ?? "";
        console.error("[JamaahChat] attachment INSERT failed:", pgCode, pgError);
        toast.error("Gagal mengirim lampiran", { description: `[${pgCode}] ${pgError}` });
        return;
      }
      toast.success(`${label} terkirim`);
      setAttachOpen(false);
    } catch (err) {
      console.error("[JamaahChat] sendAttachment exception:", err);
      toast.error("Terjadi kesalahan", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSending(false);
    }
  }

  // ===== Derived =====
  const doctorName = doctor?.full_name ?? "Dokter Pendamping";
  const doctorInitials = doctorName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  // ===== Render =====
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col bg-background lg:h-[calc(100vh-10rem)]">
      {/* ===== Header (Doctor info card) ===== */}
      <header className="flex items-center gap-3 border-b border-border bg-card/95 px-3 py-3 backdrop-blur sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={goJamaahDashboard}
          title="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
            {doctorInitials || <Stethoscope className="h-6 w-6" />}
          </div>
          <span className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">
            {doctorName}
          </p>
          <p className="text-sm text-muted-foreground">
            Dokter Pendamping · <span className="text-emerald-600 dark:text-emerald-400">Online</span>
          </p>
        </div>
      </header>

      {/* ===== Main content ===== */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Memuat percakapan…</p>
          </div>
        </div>
      ) : noDoctor ? (
        <NoDoctorState onBack={goJamaahDashboard} />
      ) : loadError ? (
        <ErrorState message={loadError} onBack={goJamaahDashboard} />
      ) : (
        <>
          {/* ===== Messages area ===== */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Stethoscope className="h-8 w-8" />
                </span>
                <p className="text-base font-medium text-foreground">Belum ada pesan</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Mulai percakapan dengan dokter Anda. Sampaikan keluhan atau pertanyaan kesehatan.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((m) => (
                  <MessageBubble key={m.id} m={m} />
                ))}
              </div>
            )}
          </div>

          {/* ===== Composer ===== */}
          <footer className="border-t border-border bg-card px-2 py-3 sm:px-3">
            <div className="flex items-end gap-1.5">
              {/* Emoji */}
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 shrink-0"
                    title="Emoji"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-2">
                  <div className="grid grid-cols-8 gap-1">
                    {COMMON_EMOJIS.map((e, i) => (
                      <button
                        key={`${e}-${i}`}
                        type="button"
                        onClick={() => {
                          setInput((s) => s + e);
                          setEmojiOpen(false);
                        }}
                        className="rounded-md p-2 text-xl hover:bg-accent"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Attach */}
              <Popover open={attachOpen} onOpenChange={setAttachOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 shrink-0"
                    title="Lampiran"
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-1">
                  {ATTACH_OPTIONS.map((it) => {
                    const I = it.icon;
                    return (
                      <button
                        key={it.key}
                        type="button"
                        disabled={sending}
                        onClick={() => sendAttachment(it.key as "IMAGE" | "PDF" | "FILE", it.label)}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                      >
                        <I className="h-4 w-4 text-muted-foreground" />
                        {it.label}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>

              {/* Text input */}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendText();
                  }
                }}
                placeholder="Tulis pesan untuk dokter…"
                rows={1}
                className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              {/* Send */}
              <Button
                onClick={() => void sendText()}
                disabled={sending || !input.trim()}
                size="icon"
                className="h-12 w-12 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                title="Kirim"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Message bubble — DOCTOR left (card bg), JAMAAH right (primary bg),
// SYSTEM/AI centered (muted).
// ============================================================================

function MessageBubble({ m }: { m: ChatMessageRow }) {
  const isJamaah = m.sender_type === "JAMAAH";
  const isSystem = m.sender_type === "SYSTEM" || m.sender_type === "AI";
  const isAlert = m.type === "ALERT";
  const time = new Date(m.created_at).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ===== Check if this is a form request message =====
  const isFormRequest =
    m.type === "TTV_REQUEST" || m.type === "SKRINING_REQUEST" ||
    m.type === "EDUKASI" || m.type === "OBAT" || m.type === "MONITORING" ||
    m.type === "TTV_RESULT" || m.type === "SKRINING_RESULT";

  // ===== Render InteractiveFormCard for request-type messages =====
  if (isFormRequest && m.request_id) {
    console.log("[JamaahChat] Rendering InteractiveFormCard: type=", m.type, "| requestId=", m.request_id, "| status=");
    return (
      <InteractiveFormCard
        messageId={m.id}
        requestId={m.request_id}
        messageType={m.type}
        content={m.content}
        senderType={m.sender_type}
        createdAt={m.created_at}
        isJamaah={true}
      />
    );
  }

  // ===== System / AI: centered muted =====
  if (isSystem) {
    return (
      <div className="my-1 flex justify-center">
        <div
          className={cn(
            "flex max-w-md items-start gap-2 rounded-lg border px-3 py-2 text-sm",
            isAlert
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
              : "border-border bg-muted text-muted-foreground"
          )}
        >
          {isAlert && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="whitespace-pre-wrap">{m.content}</span>
        </div>
      </div>
    );
  }

  // ===== Attachment bubbles =====
  const isAttachment =
    m.type === "IMAGE" || m.type === "PDF" || m.type === "FILE" ||
    m.type === "VOICE" || m.type === "LOCATION" || m.type === "STICKER";

  return (
    <div className={cn("flex", isJamaah ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[75%]",
          isJamaah
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-card text-card-foreground border border-border"
        )}
      >
        {isAttachment ? (
          <div className="flex items-center gap-2">
            <AttachmentIcon type={m.type} />
            <span className="text-sm">
              {labelForType(m.type)}: {m.content || m.attachment_name || "—"}
            </span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-base">{m.content}</p>
        )}

        {/* Timestamp + read receipt */}
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            isJamaah ? "justify-end text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          <span>{time}</span>
          {/* Jamaah's own messages: show read receipt when doctor has read */}
          {isJamaah && (
            m.read_by_doctor ? (
              <CheckCheck className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )
          )}
          {/* Doctor messages: show read receipt when jamaah has read (default true since viewing) */}
          {!isJamaah && m.read_by_jamaah && (
            <CheckCheck className="h-3.5 w-3.5" />
          )}
        </div>
      </div>
    </div>
  );
}

function labelForType(t: string): string {
  switch (t) {
    case "IMAGE": return "📷 Foto";
    case "PDF": return "📄 PDF";
    case "FILE": return "📎 File";
    case "VOICE": return "🎙️ Pesan suara";
    case "LOCATION": return "📍 Lokasi";
    case "STICKER": return "🎨 Sticker";
    default: return t;
  }
}

function AttachmentIcon({ type }: { type: string }) {
  let I: LucideIcon = FileIcon;
  if (type === "IMAGE") I = ImageIcon;
  else if (type === "PDF") I = FileText;
  return <I className="h-4 w-4 shrink-0 opacity-70" />;
}

// ============================================================================
// States: no doctor assigned, load error
// ============================================================================

function NoDoctorState({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
        <Stethoscope className="h-10 w-10" />
      </span>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold text-foreground">Belum ada dokter pendamping</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Akun Anda belum ditugaskan ke dokter keluarga. Hubungi Puskesmas untuk penugasan dokter
          agar dapat memulai konsultasi telemedicine.
        </p>
      </div>
      <Button variant="outline" className="mt-2" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Dashboard
      </Button>
    </div>
  );
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
        <AlertCircle className="h-10 w-10" />
      </span>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold text-foreground">Terjadi kesalahan</p>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" className="mt-2" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Dashboard
      </Button>
    </div>
  );
}
