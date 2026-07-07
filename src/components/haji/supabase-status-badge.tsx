"use client";

import * as React from "react";
import { Database, Wifi, WifiOff, Loader2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

type Status = "checking" | "connected" | "disconnected" | "reconnecting";

export function SupabaseStatusBadge({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = React.useState<Status>("checking");
  const { goStatus } = useApp();

  const check = React.useCallback(async () => {
    setStatus((prev) => prev === "connected" ? "checking" : prev === "disconnected" ? "reconnecting" : prev);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
      if (error && error.code === "PGRST205") { setStatus("disconnected"); return; }
      setStatus("connected");
    } catch { setStatus("disconnected"); }
  }, []);

  React.useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [check]);

  const config = {
    checking: { icon: Loader2, label: "Menyambung…", className: "bg-muted text-muted-foreground border-border", animate: true, dot: "bg-muted-foreground" },
    connected: { icon: Database, label: "Supabase Terhubung", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900", animate: false, dot: "bg-emerald-500" },
    disconnected: { icon: WifiOff, label: "Supabase Terputus", className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900", animate: false, dot: "bg-rose-500" },
    reconnecting: { icon: RefreshCw, label: "Menyambung ulang…", className: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900", animate: true, dot: "bg-sky-500" },
  }[status];

  const Icon = config.icon;

  return (
    <button type="button" onClick={goStatus} title={`${config.label} — klik untuk lihat detail status`} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition hover:opacity-80", config.className)}>
      <Icon className={cn("h-3 w-3", config.animate && "animate-spin")} />
      {!compact && <span>{config.label}</span>}
      {compact && <span className={cn("h-2 w-2 rounded-full", config.dot, config.animate && "animate-pulse")} />}
    </button>
  );
}
