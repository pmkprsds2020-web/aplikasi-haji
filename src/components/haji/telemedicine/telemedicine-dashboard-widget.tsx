"use client";

import * as React from "react";
import {
  MessagesSquare, ClipboardList, AlertTriangle, CalendarClock, Users,
  Loader2, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RISK_STYLE } from "@/lib/format";
import type { RiskLevel } from "@/lib/types";
import { loadTelemedicineDashboardStats } from "@/lib/supabase/telemedicine";

export interface DashboardStats {
  unread: number;
  pendingForms: number;
  highRisk: number;
  online: number;
  followUp: number;
}

interface StatCard {
  key: keyof DashboardStats | "highRisk";
  label: string;
  icon: LucideIcon;
  color: string; // tailwind text/border color base (e.g. "emerald")
  value: number;
  hint: string;
}

interface Props {
  /** Optional filter callback when a stat card is clicked */
  onFilter?: (filter: "unread" | "pending" | "highRisk" | "online" | "followUp" | null) => void;
  activeFilter?: "unread" | "pending" | "highRisk" | "online" | "followUp" | null;
  refreshKey?: number;
  className?: string;
}

export function TelemedicineDashboardWidget({ onFilter, activeFilter, refreshKey = 0, className }: Props) {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { stats, error } = await loadTelemedicineDashboardStats();
      if (error) throw new Error(error);
      setStats(stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat dashboard");
      setStats({ unread: 0, pendingForms: 0, highRisk: 0, online: 0, followUp: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  const cards: StatCard[] = [
    { key: "unread", label: "Belum Dibaca", icon: MessagesSquare, color: "emerald", value: stats?.unread ?? 0, hint: "Pesan masuk" },
    { key: "pendingForms", label: "Form Tertunda", icon: ClipboardList, color: "amber", value: stats?.pendingForms ?? 0, hint: "Menunggu pasien" },
    { key: "highRisk", label: "Risiko Tinggi", icon: AlertTriangle, color: "rose", value: stats?.highRisk ?? 0, hint: "Risk MERAH" },
    { key: "followUp", label: "Perlu Follow-up", icon: CalendarClock, color: "violet", value: stats?.followUp ?? 0, hint: "Tindak lanjut" },
    { key: "online", label: "Online", icon: Users, color: "sky", value: stats?.online ?? 0, hint: "Jamaah aktif" },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string; ring: string }> = {
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-900", ring: "ring-emerald-500/30" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-900", ring: "ring-amber-500/30" },
    rose: { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-900", ring: "ring-rose-500/30" },
    violet: { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-900", ring: "ring-violet-500/30" },
    sky: { bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200 dark:border-sky-900", ring: "ring-sky-500/30" },
  };

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5", className)}>
      {cards.map((c) => {
        const I = c.icon;
        const col = colorMap[c.color] ?? colorMap.emerald;
        const isActive = activeFilter === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onFilter?.(isActive ? null : (c.key as "unread" | "pending" | "highRisk" | "online" | "followUp"))}
            className={cn(
              "group flex flex-col gap-1.5 rounded-xl border p-3 text-left transition hover:shadow-sm",
              col.border, col.bg,
              isActive && cn("ring-2", col.ring),
              !onFilter && "cursor-default"
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/70 dark:bg-black/20", col.text)}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <I className="h-3.5 w-3.5" />}
              </span>
              <span className={cn("text-2xl font-bold tabular-nums", col.text)}>
                {stats ? c.value : "—"}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight text-foreground">{c.label}</p>
              <p className="text-[10px] text-muted-foreground">{c.hint}</p>
            </div>
          </button>
        );
      })}
      {error && (
        <div className="col-span-full text-[11px] text-amber-600 dark:text-amber-400">
          Dashboard mini-service belum tersedia ({error}). Menampilkan 0.
        </div>
      )}
    </div>
  );
}

// Helper for risk color (used elsewhere if needed)
export function riskColorClass(level: RiskLevel): string {
  return RISK_STYLE[level].text;
}
