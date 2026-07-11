"use client";

import * as React from "react";
import {
  Phone, Video, Info, Send, Smile, Paperclip, ArrowLeft,
  Check, CheckCheck, Activity, ClipboardList, Pill, GraduationCap,
  CalendarClock, FileText, AlertTriangle, MapPin, ImageIcon,
  File as FileIcon, Mic, Sparkles, Loader2, Smartphone, X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  type ChatMessageData, type TelemedicineRequestData, type ChatSenderType,
  type ChatMessageType, type TelemedicineCategory, type RequestStatus, type FormField,
  QUICK_ACTIONS, type QuickAction,
} from "@/lib/telemedicine-types";
import { DEFAULT_TEMPLATES } from "@/lib/telemedicine-types";
import { useTelemedicineSocket } from "./use-telemedicine-socket";
import { useSupabaseChat } from "@/hooks/use-supabase-chat";
import { formatTanggalWaktu, initials, RISK_STYLE } from "@/lib/format";
import type { JamaahData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ensureRoom } from "@/lib/supabase/telemedicine";
import { RiskBadge } from "../shared";
import { QuickActionMenu } from "./quick-action-menu";
import { TtvFormDialog } from "./ttv-form-dialog";
import { SkriningFormDialog } from "./skrining-form-dialog";
import { PatientFormFillDialog } from "./patient-form-fill-dialog";
import { SmartMonitoringDialog } from "./smart-monitoring-dialog";
import { EdukasiFormDialog, ObatFormDialog, FileSendDialog } from "./simple-action-dialogs";
import { AiSummaryPanel } from "./ai-summary-panel";

interface Props {
  jamaahId: string;
  jamaah: JamaahData | null;
  onBack?: () => void;
}

interface RoomData {
  room: { id: string; jamaahId: string };
  messages: ChatMessageData[];
  requests: TelemedicineRequestData[];
  jamaah: JamaahData;
}
const getRoomId = (r: RoomData | null) => r?.room?.id ?? null;

const COMMON_EMOJIS = ["👍", "❤️", "🙏", "😊", "😢", "👍", "👌", "✅", "⏰", "💊", "🩺", "📞", "🔴", "🟡", "🟢", "💡"];

const TYPE_ICON: Partial<Record<ChatMessageType, LucideIcon>> = {
  TTV_REQUEST: Activity,
  SKRINING_REQUEST: ClipboardList,
  EDUKASI: GraduationCap,
  OBAT: Pill,
  MONITORING: CalendarClock,
  TTV_RESULT: Activity,
  SKRINING_RESULT: ClipboardList,
  ALERT: AlertTriangle,
  VOICE: Mic,
  IMAGE: ImageIcon,
  FILE: FileIcon,
  PDF: FileText,
  LOCATION: MapPin,
};

export function ConversationPanel({ jamaahId, jamaah: jamaahProp, onBack }: Props) {
  const { isConnected, onlineMap, typingMap, joinRoom, leaveRoom, setTyping, announcePresence, onMessage, onAlert, onRequest, onResponse } = useTelemedicineSocket();

  // ===== SUPABASE-DIRECT CHAT (single source of truth) =====
  // Messages are fetched via supabase.from('chat_message').select() and
  // sent via supabase.from('chat_message').insert(). Supabase Realtime
  // auto-syncs new messages. Local state is a mirror only — never the
  // primary store.
  const {
    roomId,
    messages: supabaseMessages,
    loading,
    sending,
    sendMessage: supabaseSend,
    refresh: refreshMessages,
  } = useSupabaseChat(jamaahId);

  // Map Supabase rows (snake_case) to the ChatMessageData shape the UI expects
  const messages: ChatMessageData[] = React.useMemo(
    () =>
      supabaseMessages.map((m) => ({
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
      })),
    [supabaseMessages]
  );

  const [requests, setRequests] = React.useState<TelemedicineRequestData[]>([]);
  const [jamaah, setJamaah] = React.useState<JamaahData | null>(jamaahProp);
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const inputValRef = React.useRef(""); // always tracks latest input value
  const [infoOpen, setInfoOpen] = React.useState(false);

  // Dialogs
  const [ttvOpen, setTtvOpen] = React.useState(false);
  const [skriningOpen, setSkriningOpen] = React.useState(false);
  const [edukasiOpen, setEdukasiOpen] = React.useState(false);
  const [obatOpen, setObatOpen] = React.useState(false);
  const [fileOpen, setFileOpen] = React.useState(false);
  const [monitoringOpen, setMonitoringOpen] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [patientDialogRequest, setPatientDialogRequest] = React.useState<TelemedicineRequestData | null>(null);
  const [patientDialogOpen, setPatientDialogOpen] = React.useState(false);

  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [templateOpen, setTemplateOpen] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const isNearBottomRef = React.useRef(true); // track if user is near bottom
  const typingDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingNow = React.useRef(false);

  // ===== Smart scroll to bottom =====
  const scrollToBottom = React.useCallback((smooth: boolean = true) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  // ===== Track scroll position: is user near bottom? =====
  const handleScroll = React.useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // "Near bottom" = within 150px of the bottom
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
    }
  }, []);

  // ===== Load room (jamaah + pending requests directly from Supabase) =====
  // Messages come from the `useSupabaseChat` hook (realtime-synced).
  const load = React.useCallback(async () => {
    // ===== Null-ID validation: silent return (no error toast) =====
    if (!jamaahId) return;
    try {
      const supabase = createClient();

      // ===== 1. Load jamaah =====
      const { data: jRow, error: jErr } = await supabase
        .from("jamaah")
        .select("*")
        .eq("id", jamaahId)
        .maybeSingle();
      if (jErr) {
        console.warn("[conversation-panel] jamaah fetch error:", jErr.message);
      } else if (jRow) {
        const mapped: JamaahData = {
          id: String(jRow.id),
          nama: String(jRow.nama ?? ""),
          nik: String(jRow.nik ?? ""),
          kloter: String(jRow.kloter ?? ""),
          porsi: String(jRow.porsi ?? ""),
          usia: Number(jRow.usia ?? 0),
          kelamin: (jRow.kelamin === "P" ? "P" : "L") as "L" | "P",
          alamat: String(jRow.alamat ?? ""),
          hp: String(jRow.hp ?? ""),
          kontakKeluarga: String(jRow.kontak_keluarga ?? ""),
          tanggalTiba: String(jRow.tanggal_tiba ?? ""),
          bandara: String(jRow.bandara ?? ""),
          kabupatenKota: String(jRow.kabupaten_kota ?? ""),
          puskesmas: String(jRow.puskesmas ?? ""),
          dokterKeluarga: String(jRow.dokter_keluarga ?? ""),
          paspor: (jRow.paspor as string | null) ?? null,
          embarkasi: (jRow.embarkasi as string | null) ?? null,
          golDarah: (jRow.gol_darah as string | null) ?? null,
          riwayatPenyakit: (jRow.riwayat_penyakit as string | null) ?? null,
          riwayatOperasi: (jRow.riwayat_operasi as string | null) ?? null,
          alergi: (jRow.alergi as string | null) ?? null,
          obatRutin: (jRow.obat_rutin as string | null) ?? null,
          statusIstithaah: (jRow.status_istithaah as string | null) ?? null,
          tanggalBerangkat: (jRow.tanggal_berangkat as string | null) ?? null,
          tanggalPulang: (jRow.tanggal_pulang as string | null) ?? null,
          riskLevel: (jRow.risk_level ?? "HIJAU") as JamaahData["riskLevel"],
          riskSummary: String(jRow.risk_summary ?? ""),
          createdAt: String(jRow.created_at ?? ""),
          updatedAt: String(jRow.updated_at ?? ""),
        };
        setJamaah(mapped);
      } else {
        setJamaah(jamaahProp);
      }

      // ===== 2. Ensure room exists =====
      const { room, error: roomErr } = await ensureRoom(jamaahId, "doctor");
      if (roomErr || !room) {
        console.warn("[conversation-panel] ensureRoom failed:", roomErr);
        setRequests([]);
        return;
      }

      // ===== 3. Fetch pending telemedicine requests =====
      const { data: reqRows, error: reqErr } = await supabase
        .from("telemedicine_request")
        .select("*")
        .eq("room_id", room.id)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });
      if (reqErr) {
        console.warn("[conversation-panel] requests fetch error:", reqErr.message);
        setRequests([]);
        return;
      }
      const mappedRequests: TelemedicineRequestData[] = (reqRows ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        let fields: FormField[] = [];
        try {
          const raw = row.fields as string | null;
          if (raw) fields = JSON.parse(raw) as FormField[];
        } catch { fields = []; }
        let response: Record<string, unknown> | null = null;
        try {
          const raw = row.response as string | null;
          if (raw) response = JSON.parse(raw) as Record<string, unknown>;
        } catch { response = null; }
        return {
          id: String(row.id),
          roomId: String(row.room_id),
          jamaahId: String(row.jamaah_id),
          category: String(row.category) as TelemedicineCategory,
          subType: (row.sub_type as string | null) ?? null,
          title: String(row.title ?? ""),
          fields,
          status: String(row.status) as RequestStatus,
          scheduledFor: (row.scheduled_for as string | null) ?? null,
          submittedAt: (row.submitted_at as string | null) ?? null,
          response,
          skor: (row.skor as string | null) ?? null,
          hariKe: (row.hari_ke as number | null) ?? null,
          createdAt: String(row.created_at ?? ""),
        };
      });
      setRequests(mappedRequests);
    } catch (e) {
      // Non-critical — messages are handled by Supabase hook
      console.warn("[conversation-panel] load error:", e);
    }
  }, [jamaahId, jamaahProp]);

  React.useEffect(() => {
    load();
    joinRoom(jamaahId);
    announcePresence(jamaahId, "DOCTOR");

    return () => {
      leaveRoom(jamaahId);
      setTyping(jamaahId, false, "DOCTOR");
    };
  }, [jamaahId]);

  // ===== Realtime handlers (socket.io for presence/typing/alerts) =====
  // NOTE: Message realtime is handled by Supabase Realtime in useSupabaseChat.
  // The socket.io onMessage handler is kept for backward compat but messages
  // are already synced via Supabase — dedup by id prevents duplicates.
  React.useEffect(() => {
    const off = onMessage((p) => {
      const m = p.message;
      if (!m || m.roomId !== roomId) return;
      // Supabase Realtime already added this message; refresh to be safe.
      refreshMessages();
    });
    return off;
  }, [onMessage, roomId, refreshMessages]);

  React.useEffect(() => {
    const off = onAlert((p) => {
      if (p.jamaahId !== jamaahId) return;
      const a = p.alert;
      if (a.level === "RED") toast.error(`🚨 ${a.detail}`);
      else if (a.level === "ORANGE") toast.warning(`⚠️ ${a.detail}`);
      else toast.info(`ℹ️ ${a.detail}`);
    });
    return off;
  }, [onAlert, jamaahId]);

  React.useEffect(() => {
    const off = onRequest((p) => {
      if (p.jamaahId !== jamaahId || !p.request) return;
      const req = p.request as TelemedicineRequestData;
      setRequests((prev) => prev.some((r) => r.id === req.id) ? prev : [req, ...prev]);
    });
    return off;
  }, [onRequest, jamaahId]);

  React.useEffect(() => {
    const off = onResponse((p) => {
      if (p.jamaahId !== jamaahId || !p.request) return;
      const updated = p.request as TelemedicineRequestData;
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      // Also reload messages to capture TTV_RESULT/SKRINING_RESULT
      load();
    });
    return off;
  }, [onResponse, jamaahId, load]);

  // ===== Auto-scroll to bottom on new message (smart: only if user is near bottom) =====
  React.useEffect(() => {
    if (isNearBottomRef.current) {
      // Use "auto" (instant) for realtime updates to avoid flicker
      scrollToBottom(false);
    }
  }, [messages.length, scrollToBottom]);

  // ===== Scroll to bottom when conversation first opens =====
  React.useEffect(() => {
    // Initial load: scroll to bottom instantly
    setTimeout(() => scrollToBottom(false), 100);
  }, [jamaahId, scrollToBottom]);

  // ===== Typing =====
  const handleInputChange = (v: string) => {
    console.log("[DoctorChat] handleInputChange:", v);
    setInput(v);
    inputValRef.current = v; // keep ref in sync
    if (!isConnected) return;
    if (!isTypingNow.current) {
      isTypingNow.current = true;
      setTyping(jamaahId, true, "DOCTOR");
    }
    if (typingDebounce.current) clearTimeout(typingDebounce.current);
    typingDebounce.current = setTimeout(() => {
      isTypingNow.current = false;
      setTyping(jamaahId, false, "DOCTOR");
    }, 2000);
  };

  const stopTyping = () => {
    if (typingDebounce.current) clearTimeout(typingDebounce.current);
    if (isTypingNow.current) {
      isTypingNow.current = false;
      setTyping(jamaahId, false, "DOCTOR");
    }
  };

  // ===== Send text via Supabase INSERT =====
  async function sendText(content?: string) {
    // Use ref to get the latest input value (avoids stale closure)
    const text = (content ?? inputValRef.current).trim();
    if (!text) return; // prevent empty/whitespace-only messages
    // ===== Null-ID validation: silent return (no error toast) =====
    if (!jamaahId) return;

    console.log("[DoctorChat] ===== BEFORE SEND =====");
    console.log("[DoctorChat] text:", text);
    console.log("[DoctorChat] input state (before):", input);
    console.log("[DoctorChat] inputValRef (before):", inputValRef.current);

    stopTyping();

    // Clear input IMMEDIATELY (before async) — both state AND ref AND DOM
    const savedInput = inputValRef.current;
    setInput("");
    inputValRef.current = "";
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    console.log("[DoctorChat] ===== AFTER CLEAR INPUT =====");
    console.log("[DoctorChat] input state (after clear):", "");
    console.log("[DoctorChat] inputValRef (after clear):", inputValRef.current);

    const inserted = await supabaseSend({
      senderType: "DOCTOR",
      type: "TEXT",
      content: text,
    });

    console.log("[DoctorChat] ===== AFTER INSERT =====");
    console.log("[DoctorChat] inserted:", !!inserted);
    console.log("[DoctorChat] input state (after insert):", input);
    console.log("[DoctorChat] inputValRef (after insert):", inputValRef.current);

    if (inserted) {
      toast.success("Pesan terkirim");
      // Refocus input for next message
      if (inputRef.current) {
        inputRef.current.focus();
      }
      // Scroll to bottom after sending
      isNearBottomRef.current = true;
      setTimeout(() => scrollToBottom(true), 50);
    } else {
      // Restore input on failure so user doesn't lose their message
      setInput(savedInput);
      inputValRef.current = savedInput;
      if (inputRef.current) {
        inputRef.current.value = savedInput;
      }
      toast.error("Gagal mengirim pesan");
    }

    console.log("[DoctorChat] ===== AFTER SEND COMPLETE =====");
    console.log("[DoctorChat] input state (final):", input);
    console.log("[DoctorChat] inputValRef (final):", inputValRef.current);
  }

  // ===== Send attachment placeholder via Supabase INSERT =====
  async function sendAttachment(type: ChatMessageType, content: string) {
    await supabaseSend({
      senderType: "DOCTOR",
      type,
      content,
      attachmentName: `placeholder-${type.toLowerCase()}.bin`,
    });
  }

  // ===== Send template via Supabase INSERT =====
  async function sendTemplate(t: { title: string; content: string }) {
    const inserted = await supabaseSend({
      senderType: "DOCTOR",
      type: "TEMPLATE",
      content: t.content,
    });
    if (inserted) {
      setTemplateOpen(false);
    }
  }

  // ===== Quick actions =====
  const handleQuickAction = (a: QuickAction) => {
    switch (a.key) {
      case "ttv": setTtvOpen(true); break;
      case "skrining": setSkriningOpen(true); break;
      case "edukasi": setEdukasiOpen(true); break;
      case "obat": setObatOpen(true); break;
      case "monitoring": setMonitoringOpen(true); break;
      case "file": setFileOpen(true); break;
      case "ai": setAiOpen(true); break;
    }
  };

  const openPatientFill = (req: TelemedicineRequestData) => {
    setPatientDialogRequest(req);
    setPatientDialogOpen(true);
  };

  const afterRequestSent = () => {
    // Refetch to capture new request message + request
    load();
  };

  // ===== Derived =====
  const online = onlineMap[jamaahId];
  const isOnline = online?.jamaah ?? false;
  const typing = typingMap[jamaahId];
  const isJamaahTyping = typing?.isTyping && typing.role !== "DOCTOR";

  const j = jamaah ?? jamaahProp;
  const riskStyle = j ? RISK_STYLE[j.riskLevel] : null;

  // Group messages by date for date separators (simplified)
  return (
    <div className="flex h-full flex-col bg-background">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {j ? initials(j.nama) : "?"}
          </div>
          {isOnline && (
            <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{j?.nama ?? "Memuat…"}</p>
            {j && <RiskBadge level={j.riskLevel} className="hidden sm:inline-flex" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {isJamaahTyping ? (
              <span className="text-primary">⌨️ sedang mengetik…</span>
            ) : isOnline ? (
              <span className="text-emerald-600 dark:text-emerald-400">● Online</span>
            ) : (
              <span>Terakhir dilihat baru saja</span>
            )}
            {j ? ` · ${j.usia}th · ${j.kloter}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Telepon" onClick={() => toast.info("Fitur panggilan suara akan segera hadir")}>
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Video Call (segera)" disabled onClick={() => toast.info("Video call akan segera hadir")}>
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Info Pasien" onClick={() => setInfoOpen(true)}>
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ===== Messages ===== */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-thin bg-muted/30 px-3 py-4 sm:px-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Phone className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium">Belum ada pesan</p>
            <p className="max-w-xs text-xs text-muted-foreground">Mulai percakapan telemedicine atau kirim form TTV/Skrining.</p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                m={m}
                requests={requests}
                onFillPatient={openPatientFill}
              />
            ))}
          </div>
        )}
        {/* Bottom anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {/* ===== Composer ===== */}
      <footer className="border-t border-border bg-card px-2 py-2 sm:px-4">
        <div className="mb-2">
          <QuickActionMenu onAction={handleQuickAction} />
        </div>
        <div className="flex items-end gap-1.5">
          {/* Emoji */}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Emoji">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <div className="grid grid-cols-8 gap-1">
                {COMMON_EMOJIS.map((e, i) => (
                  <button
                    key={`${e}-${i}`}
                    type="button"
                    onClick={() => { setInput((s) => s + e); setEmojiOpen(false); }}
                    className="rounded-md p-1.5 text-lg hover:bg-accent"
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
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Lampiran">
                <Paperclip className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-1">
              {[
                { key: "IMAGE" as const, label: "Foto", icon: ImageIcon },
                { key: "PDF" as const, label: "PDF", icon: FileText },
                { key: "FILE" as const, label: "File", icon: FileIcon },
                { key: "LOCATION" as const, label: "Lokasi", icon: MapPin },
                { key: "STICKER" as const, label: "Sticker", icon: Sparkles },
              ].map((it) => {
                const I = it.icon;
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => { sendAttachment(it.key, `[${it.label}]`); setAttachOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <I className="h-3.5 w-3.5 text-muted-foreground" />
                    {it.label}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          {/* Template */}
          <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Template pesan">
                <FileText className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-1">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Template Pesan</p>
              {DEFAULT_TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => sendTemplate(t)}
                  className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                >
                  <span className="text-xs font-medium">{t.title}</span>
                  <span className="text-[11px] text-muted-foreground line-clamp-2">{t.content}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={stopTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendText();
              }
            }}
            placeholder="Tulis pesan…"
            rows={1}
            className="max-h-32 min-h-[36px] flex-1 resize-none rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          {/* Send */}
          <Button
            onClick={() => sendText()}
            disabled={sending || !input.trim()}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            title="Kirim"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </footer>

      {/* ===== Info Pasien Dialog ===== */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Info Pasien</DialogTitle>
            <DialogDescription>Ringkasan identitas & risiko</DialogDescription>
          </DialogHeader>
          {j ? (
            <div className="space-y-2 text-sm">
              <InfoRow label="Nama" value={j.nama} />
              <InfoRow label="Usia" value={`${j.usia} tahun`} />
              <InfoRow label="Jenis Kelamin" value={j.kelamin === "L" ? "Laki-laki" : "Perempuan"} />
              <InfoRow label="Kloter" value={j.kloter} />
              <InfoRow label="Puskesmas" value={j.puskesmas} />
              <InfoRow label="Dokter Keluarga" value={j.dokterKeluarga} />
              <InfoRow label="HP" value={j.hp} />
              <InfoRow label="Kontak Keluarga" value={j.kontakKeluarga} />
              <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                <span className="text-muted-foreground">Risiko</span>
                <RiskBadge level={j.riskLevel} />
              </div>
              {j.riskSummary && (
                <p className="rounded-md bg-accent/50 px-3 py-2 text-xs text-muted-foreground">{j.riskSummary}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Data pasien tidak tersedia.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Form Dialogs ===== */}
      <TtvFormDialog jamaahId={jamaahId} open={ttvOpen} onOpenChange={setTtvOpen} onSent={afterRequestSent} />
      <SkriningFormDialog
        jamaahId={jamaahId}
        open={skriningOpen}
        onOpenChange={setSkriningOpen}
        onSent={afterRequestSent}
        initialPhase={j?.tanggalTiba ? "PASCA" : "PRA"}
      />
      <EdukasiFormDialog jamaahId={jamaahId} open={edukasiOpen} onOpenChange={setEdukasiOpen} onSent={afterRequestSent} />
      <ObatFormDialog jamaahId={jamaahId} open={obatOpen} onOpenChange={setObatOpen} onSent={afterRequestSent} />
      <FileSendDialog jamaahId={jamaahId} open={fileOpen} onOpenChange={setFileOpen} onSent={afterRequestSent} />
      <SmartMonitoringDialog
        jamaahId={jamaahId}
        open={monitoringOpen}
        onOpenChange={setMonitoringOpen}
        onSent={afterRequestSent}
        tanggalTiba={j?.tanggalTiba ?? null}
      />
      <PatientFormFillDialog
        request={patientDialogRequest}
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
        onSubmitted={afterRequestSent}
      />

      {/* ===== AI Panel Dialog ===== */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600" />
              AI Summary Telemedicine
            </DialogTitle>
            <DialogDescription>Analisis AI kondisi pasien berbasis chat & rekam medis</DialogDescription>
          </DialogHeader>
          <AiSummaryPanel jamaahId={jamaahId} variant="panel" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

// ===== Message bubble =====
function MessageBubble({
  m, requests, onFillPatient,
}: {
  m: ChatMessageData;
  requests: TelemedicineRequestData[];
  onFillPatient: (req: TelemedicineRequestData) => void;
}) {
  const isDoctor = m.senderType === "DOCTOR";
  const isSystem = m.senderType === "SYSTEM" || m.senderType === "AI";
  const I = TYPE_ICON[m.type];

  // System / AI centered
  if (isSystem) {
    return (
      <div className="my-1 flex justify-center">
        <div className={cn(
          "flex max-w-md items-start gap-2 rounded-lg border px-3 py-2 text-xs",
          m.type === "ALERT"
            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            : "border-border bg-muted text-muted-foreground"
        )}>
          {I && <I className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
          <span className="whitespace-pre-wrap">{m.content}</span>
        </div>
      </div>
    );
  }

  // Form request / result cards
  if (m.type === "TTV_REQUEST" || m.type === "SKRINING_REQUEST" || m.type === "EDUKASI" || m.type === "OBAT" || m.type === "MONITORING") {
    const req = m.requestId ? requests.find((r) => r.id === m.requestId) : null;
    return (
      <FormRequestCard m={m} req={req} onFillPatient={onFillPatient} />
    );
  }

  if (m.type === "TTV_RESULT" || m.type === "SKRINING_RESULT") {
    return <FormResultCard m={m} />;
  }

  if (m.type === "ALERT") {
    return (
      <div className="my-1 flex justify-center">
        <div className="flex max-w-md items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="whitespace-pre-wrap">{m.content}</span>
        </div>
      </div>
    );
  }

  // Attachment placeholders
  if (m.type === "VOICE" || m.type === "IMAGE" || m.type === "FILE" || m.type === "PDF" || m.type === "LOCATION" || m.type === "STICKER") {
    return (
      <BubbleWrap sender={m.senderType} createdAt={m.createdAt} readByJamaah={m.readByJamaah}>
        <div className="flex items-center gap-2">
          {I && <I className="h-4 w-4 shrink-0 opacity-70" />}
          <span className="text-xs">{labelForType(m.type)}: {m.content || m.attachmentName || "—"}</span>
        </div>
      </BubbleWrap>
    );
  }

  // Default: TEXT or TEMPLATE bubble
  return (
    <BubbleWrap sender={m.senderType} createdAt={m.createdAt} readByJamaah={m.readByJamaah}>
      <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
    </BubbleWrap>
  );
}

function labelForType(t: ChatMessageType): string {
  switch (t) {
    case "VOICE": return "🎙️ Pesan suara";
    case "IMAGE": return "📷 Foto";
    case "PDF": return "📄 PDF";
    case "FILE": return "📎 File";
    case "LOCATION": return "📍 Lokasi";
    case "STICKER": return "🎨 Sticker";
    default: return t;
  }
}

function BubbleWrap({
  sender, createdAt, readByJamaah, children,
}: {
  sender: ChatSenderType;
  createdAt: string;
  readByJamaah: boolean;
  children: React.ReactNode;
}) {
  const isDoctor = sender === "DOCTOR";
  return (
    <div className={cn("flex", isDoctor ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[70%]",
        isDoctor
          ? "rounded-br-sm bg-primary text-primary-foreground"
          : "rounded-bl-sm bg-card text-card-foreground border border-border"
      )}>
        {children}
        <div className={cn(
          "mt-0.5 flex items-center gap-1 text-[10px]",
          isDoctor ? "justify-end text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <span>{new Date(createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
          {isDoctor && (
            readByJamaah
              ? <CheckCheck className="h-3 w-3" />
              : <Check className="h-3 w-3" />
          )}
        </div>
      </div>
    </div>
  );
}

function FormRequestCard({
  m, req, onFillPatient,
}: {
  m: ChatMessageData;
  req: TelemedicineRequestData | null | undefined;
  onFillPatient: (req: TelemedicineRequestData) => void;
}) {
  const I = TYPE_ICON[m.type] ?? FileText;
  const isSubmitted = req?.status === "SUBMITTED";
  return (
    <div className="my-1 flex justify-start">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <I className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">
              {m.content || req?.title || "Form Request"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {req?.category}{req?.subType ? ` · ${req.subType}` : ""}
              {req?.hariKe ? ` · Hari ${req.hariKe}` : ""}
            </p>
          </div>
          {req && (
            isSubmitted ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">✓ Diisi</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Menunggu</Badge>
            )
          )}
        </div>
        {req && !isSubmitted && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-full border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => onFillPatient(req)}
          >
            <Smartphone className="mr-1.5 h-3.5 w-3.5" />
            Isi sebagai Pasien
          </Button>
        )}
        {req && isSubmitted && req.skor && (
          <div className="mt-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300">
            Hasil: <span className="font-semibold">{req.skor}</span>
          </div>
        )}
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          {new Date(m.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          {m.senderType === "DOCTOR" && (m.readByJamaah ? <CheckCheck className="ml-1 inline h-3 w-3" /> : <Check className="ml-1 inline h-3 w-3" />)}
        </div>
      </div>
    </div>
  );
}

function FormResultCard({ m }: { m: ChatMessageData }) {
  const I = TYPE_ICON[m.type] ?? Activity;
  return (
    <div className="my-1 flex justify-start">
      <div className="w-full max-w-md rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
        <div className="flex items-center gap-2 border-b border-emerald-200/60 dark:border-emerald-900/60 pb-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
            <I className="h-3.5 w-3.5" />
          </span>
          <p className="text-xs font-semibold text-foreground">
            {m.type === "TTV_RESULT" ? "Hasil TTV" : "Hasil Skrining"}
          </p>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{m.content}</p>
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          {new Date(m.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
