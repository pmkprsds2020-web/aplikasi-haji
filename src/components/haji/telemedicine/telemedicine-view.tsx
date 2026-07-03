"use client";

import * as React from "react";
import {
  Search, Loader2, Wifi, WifiOff, MessageSquare, Stethoscope,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTelemedicineSocket } from "./use-telemedicine-socket";
import { TelemedicineDashboardWidget, type DashboardStats } from "./telemedicine-dashboard-widget";
import { ConversationPanel } from "./conversation-panel";
import { EmptyState, RiskBadge } from "../shared";
import { initials, RISK_STYLE } from "@/lib/format";
import type { JamaahData } from "@/lib/types";
import type { ChatMessageData } from "@/lib/telemedicine-types";
import { toast } from "sonner";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RoomListItem {
  id: string;
  jamaahId: string;
  unreadByDoctor: number;
  unreadByJamaah: number;
  lastMessageAt: string;
  online?: { doctor: boolean; jamaah: boolean };
  jamaah: JamaahData;
  lastMessage?: ChatMessageData;
}

interface Props {
  initialJamaahId?: string;
}

export function TelemedicineView({ initialJamaahId }: Props) {
  const { isConnected, onlineMap, onMessage, onAlert } = useTelemedicineSocket();

  const [rooms, setRooms] = React.useState<RoomListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(initialJamaahId ?? null);
  const [dashOpen, setDashOpen] = React.useState(false);
  const [dashRefresh, setDashRefresh] = React.useState(0);
  const [activeFilter, setActiveFilter] = React.useState<"unread" | "pending" | "highRisk" | "online" | "followUp" | null>(null);

  // ===== Load rooms =====
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/telemedicine/rooms", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rooms: RoomListItem[] };
      setRooms(data.rooms ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat daftar percakapan");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // ===== Auto-select initial =====
  React.useEffect(() => {
    if (initialJamaahId) setSelected(initialJamaahId);
  }, [initialJamaahId]);

  // ===== Realtime: incoming message → update list (move to top, lastMessage, unread) =====
  React.useEffect(() => {
    const off = onMessage((p) => {
      const m = p.message;
      if (!m) return;
      // Try to find room by jamaahId (need to look up by lastMessage.roomId match)
      setRooms((prev) => {
        const idx = prev.findIndex((r) => r.id === m.roomId);
        if (idx === -1) return prev;
        const room = prev[idx];
        const isCurrentRoom = room.jamaahId === selected;
        const updated: RoomListItem = {
          ...room,
          lastMessage: m,
          lastMessageAt: m.createdAt,
          unreadByDoctor: isCurrentRoom ? 0 : (room.unreadByDoctor + (m.senderType !== "DOCTOR" ? 1 : 0)),
        };
        // Move to top
        const next = [updated, ...prev.filter((_, i) => i !== idx)];
        return next;
      });
      // If currently selected, refresh dashboard after a moment
      setDashRefresh((k) => k + 1);
    });
    return off;
  }, [onMessage, selected]);

  // ===== Realtime: alert → toast + mark room =====
  React.useEffect(() => {
    const off = onAlert((p) => {
      // Optionally highlight the room row
      setRooms((prev) => prev.map((r) => r.jamaahId === p.jamaahId ? { ...r } : r));
    });
    return off;
  }, [onAlert]);

  // ===== Filter + search =====
  const filtered = React.useMemo(() => {
    let r = rooms;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((x) => x.jamaah?.nama?.toLowerCase().includes(q) || x.jamaah?.kloter?.toLowerCase().includes(q));
    }
    if (activeFilter === "unread") r = r.filter((x) => x.unreadByDoctor > 0);
    else if (activeFilter === "pending") r = r.filter((x) => (x.jamaah as { pendingForms?: number } | null)?.pendingForms ?? 0 > 0); // simplistic
    else if (activeFilter === "highRisk") r = r.filter((x) => x.jamaah?.riskLevel === "MERAH");
    else if (activeFilter === "online") r = r.filter((x) => onlineMap[x.jamaahId]?.jamaah);
    else if (activeFilter === "followUp") r = r.filter((x) => (x.jamaah as { followUp?: boolean } | null)?.followUp);
    return r;
  }, [rooms, search, activeFilter, onlineMap]);

  const selectedRoom = rooms.find((r) => r.jamaahId === selected) ?? null;
  const totalUnread = rooms.reduce((a, r) => a + r.unreadByDoctor, 0);

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-3 lg:h-[calc(100vh-8rem)]">
      {/* ===== Top bar ===== */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Stethoscope className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-bold leading-tight">Telemedicine</h1>
              <p className="text-xs text-muted-foreground">
                {totalUnread > 0 ? `${totalUnread} pesan belum dibaca` : "Tidak ada pesan baru"}
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              "border",
              isConnected
                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900"
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? "Terhubung" : "Mode REST"}
          </Badge>
        </div>

        {/* Dashboard widget (collapsible) */}
        <Collapsible open={dashOpen} onOpenChange={setDashOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-full justify-between px-2 text-xs">
              <span className="flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-primary" />
                Dashboard Dokter
              </span>
              <span className="text-muted-foreground">{dashOpen ? "Sembunyikan" : "Tampilkan"}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <TelemedicineDashboardWidget
              className="mt-1.5"
              activeFilter={activeFilter}
              onFilter={(f) => setActiveFilter(f)}
              refreshKey={dashRefresh}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ===== 2-pane layout ===== */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* Left: rooms list */}
        <aside
          className={cn(
            "flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:w-80 xl:w-96",
            selected && "hidden lg:flex"
          )}
        >
          {/* Search */}
          <div className="border-b border-border/60 p-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari jamaah / kloter…"
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {activeFilter && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">Filter: {activeFilter}</Badge>
                <button onClick={() => setActiveFilter(null)} className="text-[10px] text-primary hover:underline">
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex h-full items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="Belum ada percakapan"
                desc={search ? "Coba kata kunci lain." : "Percakapan telemedicine akan muncul di sini."}
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {filtered.map((r) => (
                  <RoomRow
                    key={r.id}
                    room={r}
                    isOnline={onlineMap[r.jamaahId]?.jamaah ?? false}
                    active={selected === r.jamaahId}
                    onClick={() => {
                      setSelected(r.jamaahId);
                      // Mark read on open
                      setRooms((prev) => prev.map((x) => x.id === r.id ? { ...x, unreadByDoctor: 0 } : x));
                      fetch(`/api/telemedicine/rooms/${r.jamaahId}/read`, { method: "POST" }).catch(() => {});
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Right: conversation */}
        <section
          className={cn(
            "min-w-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
            !selected && "hidden lg:block"
          )}
        >
          {selected ? (
            <ConversationPanel
              jamaahId={selected}
              jamaah={selectedRoom?.jamaah ?? null}
              onBack={() => setSelected(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Pilih jamaah untuk memulai telemedicine"
                desc="Pilih percakapan dari daftar di kiri, atau mulai telemedicine baru dari halaman detail jamaah."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ===== Room row =====
function RoomRow({
  room, isOnline, active, onClick,
}: {
  room: RoomListItem;
  isOnline: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const j = room.jamaah;
  const s = RISK_STYLE[j.riskLevel];
  const last = room.lastMessage;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
          active ? "bg-primary/5" : "hover:bg-accent/40"
        )}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ring-2",
            s.bg, s.text, s.ring
          )}>
            {initials(j.nama)}
          </div>
          {isOnline && (
            <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{j.nama}</p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {last ? new Date(last.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : new Date(room.lastMessageAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted-foreground">
              {last ? (
                last.senderType === "DOCTOR" ? "Anda: " : last.senderType === "SYSTEM" || last.senderType === "AI" ? "" : ""
              ) : ""}
              {last?.content || "Belum ada pesan"}
            </p>
            <div className="flex items-center gap-1.5">
              {j.riskLevel === "MERAH" && <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} title="Risiko Tinggi" />}
              {room.unreadByDoctor > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {room.unreadByDoctor > 99 ? "99+" : room.unreadByDoctor}
                </span>
              )}
            </div>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <RiskBadge level={j.riskLevel} className="text-[10px] py-0" />
            <span className="text-[10px] text-muted-foreground">{j.usia}th · {j.kloter}</span>
          </div>
        </div>
      </button>
    </li>
  );
}

// Helper export (parent might want to invalidate dashboard)
export type { DashboardStats };
