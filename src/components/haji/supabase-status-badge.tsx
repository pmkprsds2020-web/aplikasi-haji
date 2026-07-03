"use client";

import * as React from "react";
import { Database, Wifi, WifiOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ============================================================================
// Supabase Connection Status Badge
// Shows a live indicator that the app is connected to Supabase.
// Pings the `profiles` table (1 row) on mount and on visibility change.
// ============================================================================

type Status = "checking" | "connected" | "disconnected";

export function SupabaseStatusBadge({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = React.useState<Status>("checking");

  const check = React.useCallback(async () => {
    try {
      const supabase = createClient();
      // Lightweight probe — select 1 column from a table that always exists.
      const { error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1)
        .maybeSingle();
      // PGRST205 = schema cache miss (table not found) → disconnected
      // Any other error could be RLS (which means connected but unauthorized)
      if (error && error.code === "PGRST205") {
        setStatus("disconnected");
        return;
      }
      setStatus("connected");
    } catch {
      setStatus("disconnected");
    }
  }, []);

  React.useEffect(() => {
    check();
    const interval = setInterval(check, 30000); // re-check every 30s
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  const config = {
    checking: {
      icon: Loader2,
      label: "Menyambung…",
      className: "bg-muted text-muted-foreground border-border",
      animate: true,
    },
    connected: {
      icon: Database,
      label: "Supabase Terhubung",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900",
      animate: false,
    },
    disconnected: {
      icon: WifiOff,
      label: "Supabase Terputus",
      className: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900",
      animate: false,
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
      title={config.label}
    >
      <Icon className={cn("h-3 w-3", config.animate && "animate-spin")} />
      {!compact && <span>{config.label}</span>}
      {compact && status === "connected" && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
      {compact && status === "disconnected" && <span className="h-2 w-2 rounded-full bg-rose-500" />}
      {compact && status === "checking" && <span className="h-2 w-2 rounded-full bg-muted-foreground" />}
    </span>
  );
}
