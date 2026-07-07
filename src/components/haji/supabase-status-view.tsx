"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Database,
  Eye,
  FileWarning,
  Globe,
  HardDrive,
  Hash,
  HeartPulse,
  History,
  Link2,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  Timer,
  UserCheck,
  Users,
  Wifi,
  Zap,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  useSupabaseHealth,
  type ConnectionState,
  type HealthLevel,
  type HealthState,
} from "@/hooks/use-supabase-health";

// ============================================================================
// Helpers
// ============================================================================

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function Row({
  label,
  value,
  mono,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 py-1.5 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right font-medium break-words",
          mono && "font-mono text-xs",
        )}
      >
        {value === null || value === undefined || value === "" ? "—" : value}
      </span>
    </div>
  );
}

function StatusBadge({
  ok,
  labelOk,
  labelBad,
}: {
  ok: boolean;
  labelOk: string;
  labelBad: string;
}) {
  return (
    <Badge
      className={cn(
        "border-transparent",
        ok
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
          : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
      )}
    >
      {ok ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {ok ? labelOk : labelBad}
    </Badge>
  );
}

function SystemStatusBadge({
  level,
  onColor = false,
}: {
  level: HealthLevel;
  onColor?: boolean;
}) {
  const label =
    level === "healthy"
      ? "System Healthy"
      : level === "warning"
        ? "System Warning"
        : "System Error";

  if (onColor) {
    return (
      <Badge
        variant="outline"
        className="border-white/30 bg-white/15 text-white backdrop-blur"
      >
        <ShieldCheck className="h-3 w-3" /> {label}
      </Badge>
    );
  }

  const cls =
    level === "healthy"
      ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
      : level === "warning"
        ? "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
        : "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300";

  return (
    <Badge variant="outline" className={cls}>
      <ShieldCheck className="h-3 w-3" /> {label}
    </Badge>
  );
}

// ============================================================================
// Connection Hero
// ============================================================================

const CONNECTION_HERO: Record<
  ConnectionState,
  { emoji: string; label: string; gradient: string; ring: string }
> = {
  connected: {
    emoji: "🟢",
    label: "Connected",
    gradient: "from-emerald-500 via-emerald-600 to-teal-700",
    ring: "ring-emerald-300/40",
  },
  disconnected: {
    emoji: "🔴",
    label: "Disconnected",
    gradient: "from-rose-500 via-rose-600 to-red-700",
    ring: "ring-rose-300/40",
  },
  connecting: {
    emoji: "🟡",
    label: "Connecting",
    gradient: "from-amber-400 via-amber-500 to-orange-600",
    ring: "ring-amber-300/40",
  },
  reconnecting: {
    emoji: "🔵",
    label: "Reconnecting",
    gradient: "from-sky-500 via-sky-600 to-cyan-700",
    ring: "ring-sky-300/40",
  },
};

function ConnectionHero({ state }: { state: HealthState }) {
  const cfg = CONNECTION_HERO[state.connection];
  return (
    <Card className={cn("relative overflow-hidden border-0 ring-2", cfg.ring)}>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-95",
          cfg.gradient,
        )}
      />
      <CardContent className="relative px-6 py-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-white">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide opacity-90">
              <Wifi className="h-3.5 w-3.5" /> Supabase Connection
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-3xl leading-none">{cfg.emoji}</span>
              <span className="text-2xl font-bold sm:text-3xl">{cfg.label}</span>
              {state.checking && (
                <Loader2 className="h-5 w-5 animate-spin opacity-80" />
              )}
            </div>
            <p className="mt-1.5 text-sm text-white/80">
              {state.project.name}
              {" · "}
              {state.lastCheckedAt
                ? `Last checked ${fmtTime(state.lastCheckedAt)}`
                : "Memulai pengecekan…"}
            </p>
          </div>
          <SystemStatusBadge level={state.sipulanghaji.systemStatus} onColor />
        </div>
        {state.checking && (
          <div className="relative mt-4">
            <Progress value={65} className="h-1.5 bg-white/20" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Si Pulang Haji Panel
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", accent)} />
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", accent)}>
        {value}
      </div>
    </div>
  );
}

function SiPulangHajiPanel({ state }: { state: HealthState }) {
  const s = state.sipulanghaji;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-600" /> Si Pulang Haji Panel
        </CardTitle>
        <CardDescription>
          Statistik realtime monitoring jamaah haji
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatCard
            icon={Users}
            label="Total Jamaah"
            value={s.totalJamaah}
            accent="text-emerald-600"
          />
          <StatCard
            icon={HeartPulse}
            label="TTV Today"
            value={s.ttvToday}
            accent="text-rose-600"
          />
          <StatCard
            icon={Eye}
            label="Skrining Today"
            value={s.skriningToday}
            accent="text-amber-600"
          />
          <StatCard
            icon={Link2}
            label="Active Chats"
            value={s.activeChats}
            accent="text-sky-600"
          />
          <StatCard
            icon={Bell}
            label="Unread"
            value={s.unreadNotifications}
            accent="text-purple-600"
          />
          <StatCard
            icon={FileWarning}
            label="Failed Sync"
            value={s.failedSync}
            accent="text-rose-600"
          />
        </div>
        <div>
          <Row label="Last Sync" value={fmtTime(s.lastSync)} />
          <Row
            label="Realtime Chat"
            value={
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  s.realtimeChatStatus === "connected" &&
                    "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300",
                  s.realtimeChatStatus === "disconnected" &&
                    "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300",
                  s.realtimeChatStatus === "reconnecting" &&
                    "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300",
                )}
              >
                {s.realtimeChatStatus}
              </Badge>
            }
          />
          <Row label="Last Backup" value={fmtTime(s.lastBackup)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
          <span className="text-sm font-medium text-muted-foreground">
            System Status
          </span>
          <SystemStatusBadge level={s.systemStatus} />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Project Info
// ============================================================================

function ProjectInfoPanel({ state }: { state: HealthState }) {
  const p = state.project;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-4 w-4 text-emerald-600" /> Project Info
        </CardTitle>
        <CardDescription>Identitas project Supabase</CardDescription>
      </CardHeader>
      <CardContent>
        <Row label="Name" value={p.name} />
        <Row label="Project ID" value={p.id} mono />
        <Row label="URL" value={p.url} mono />
        <Row label="Region" value={p.region} />
        <Row
          label="Environment"
          value={<Badge variant="secondary">{p.environment}</Badge>}
        />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Database Status
// ============================================================================

function DatabasePanel({ state }: { state: HealthState }) {
  const d = state.database;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-600" /> Database
          </CardTitle>
          <StatusBadge
            ok={d.connected}
            labelOk="Connected"
            labelBad="Offline"
          />
        </div>
        <CardDescription>Postgres connection health</CardDescription>
      </CardHeader>
      <CardContent>
        <Row label="Connected" value={d.connected ? "Yes" : "No"} />
        <Row
          label="Response Time"
          value={d.responseTimeMs !== null ? `${d.responseTimeMs} ms` : null}
        />
        <Row label="Last Query" value={fmtTime(d.lastSuccessfulQuery)} />
        <Row label="Server Timestamp" value={fmtTime(d.currentTimestamp)} />
        <Row label="Timezone" value={d.timezone} />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Auth Status
// ============================================================================

function AuthPanel({ state }: { state: HealthState }) {
  const a = state.auth;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Auth
          </CardTitle>
          {a.running ? (
            <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> Auth Running
            </Badge>
          ) : (
            <Badge className="border-transparent bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <AlertTriangle className="h-3 w-3" /> Auth Error
            </Badge>
          )}
        </div>
        <CardDescription>Supabase Auth service status</CardDescription>
      </CardHeader>
      <CardContent>
        <Row label="Running" value={a.running ? "Yes" : "No"} />
        <Row label="Error" value={a.error} mono />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Realtime
// ============================================================================

function RealtimePanel({ state }: { state: HealthState }) {
  const r = state.realtime;
  const color =
    r.status === "connected"
      ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
      : r.status === "reconnecting"
        ? "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300"
        : "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300";
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" /> Realtime
          </CardTitle>
          <Badge variant="outline" className={cn("capitalize", color)}>
            {r.status}
          </Badge>
        </div>
        <CardDescription>WebSocket realtime subscriptions</CardDescription>
      </CardHeader>
      <CardContent>
        <Row label="Active Channels" value={r.activeChannels} />
        <Row
          label="Health"
          value={
            r.status === "connected" ? (
              <span className="text-emerald-600">Stable</span>
            ) : r.status === "reconnecting" ? (
              <span className="text-amber-600">Retrying</span>
            ) : (
              <span className="text-rose-600">Down</span>
            )
          }
        />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Storage
// ============================================================================

function StoragePanel({ state }: { state: HealthState }) {
  const st = state.storage;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-emerald-600" /> Storage
          </CardTitle>
          <StatusBadge
            ok={st.connected}
            labelOk="Connected"
            labelBad="Offline"
          />
        </div>
        <CardDescription>Storage buckets availability</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Row label="Connected" value={st.connected ? "Yes" : "No"} />
        <Row label="Bucket Count" value={st.bucketCount} />
        {st.error && <Row label="Error" value={st.error} mono />}
        {st.buckets.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border/60">
            {st.buckets.map((b) => (
              <div
                key={b.name}
                className="flex items-center justify-between border-b border-border/40 px-3 py-1.5 text-xs last:border-0"
              >
                <span className="truncate font-mono">{b.name}</span>
                <Badge
                  variant={b.public ? "secondary" : "outline"}
                  className="ml-2 shrink-0 text-[10px]"
                >
                  {b.public ? "public" : "private"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Edge Functions
// ============================================================================

function EdgeFunctionPanel({ state }: { state: HealthState }) {
  const e = state.edgeFunctions;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600" /> Edge Functions
          </CardTitle>
          {e.active ? (
            <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              Active
            </Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
        </div>
        <CardDescription>Deno edge runtime</CardDescription>
      </CardHeader>
      <CardContent>
        <Row label="Status" value={e.active ? "Active" : "Inactive"} />
        {e.name && <Row label="Function" value={e.name} mono />}
        {e.error && <Row label="Error" value={e.error} mono />}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// API Status
// ============================================================================

function ApiPanel({ state }: { state: HealthState }) {
  const a = state.api;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" /> API Status
          </CardTitle>
          <StatusBadge
            ok={a.reachable}
            labelOk="Reachable"
            labelBad="Unreachable"
          />
        </div>
        <CardDescription>REST API endpoint</CardDescription>
      </CardHeader>
      <CardContent>
        <Row label="Reachable" value={a.reachable ? "Yes" : "No"} />
        <Row label="HTTP Status" value={a.httpStatus} />
        <Row label="Network Error" value={a.networkError} mono />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Latency
// ============================================================================

function LatencyPanel({ state }: { state: HealthState }) {
  const l = state.latency;
  const ping = l.pingMs;
  const pct =
    ping === null ? 0 : Math.min(100, Math.round((ping / 2000) * 100));
  const barColor =
    l.level === "fast"
      ? "bg-emerald-500"
      : l.level === "normal"
        ? "bg-amber-500"
        : "bg-rose-500";
  const textColor =
    l.level === "fast"
      ? "text-emerald-600"
      : l.level === "normal"
        ? "text-amber-600"
        : "text-rose-600";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-emerald-600" /> Latency
        </CardTitle>
        <CardDescription>Round-trip time ke Supabase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <div className={cn("text-3xl font-bold tabular-nums", textColor)}>
              {ping !== null ? ping : "—"}
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                ms
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Current ping</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums">
              {l.avgMs !== null ? `${l.avgMs} ms` : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              Average (last 10)
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Latency level</span>
            <Badge variant="outline" className={cn("capitalize", textColor)}>
              {l.level}
            </Badge>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0ms</span>
            <span>300ms</span>
            <span>1000ms</span>
            <span>2000ms+</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Session
// ============================================================================

function SessionPanel({ state }: { state: HealthState }) {
  const s = state.session;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-600" /> Session
          </CardTitle>
          <StatusBadge
            ok={s.active && !s.expired}
            labelOk="Active"
            labelBad={s.expired ? "Expired" : "Inactive"}
          />
        </div>
        <CardDescription>Active auth session</CardDescription>
      </CardHeader>
      <CardContent>
        <Row label="Current User" value={s.currentUser} mono />
        <Row label="Active" value={s.active ? "Yes" : "No"} />
        <Row label="Expired" value={s.expired ? "Yes" : "No"} />
        <Row label="Login Time" value={fmtTime(s.loginTime)} />
        <Row label="Last Refresh" value={fmtTime(s.lastRefresh)} />
        <Row label="Expires At" value={fmtTime(s.expiresAt)} />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Data Sync
// ============================================================================

function SyncPanel({ state }: { state: HealthState }) {
  const s = state.sync;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-emerald-600" /> Data Sync
        </CardTitle>
        <CardDescription>Riwayat sinkronisasi data</CardDescription>
      </CardHeader>
      <CardContent>
        <Row label="Last Sync" value={fmtTime(s.lastSync)} />
        <Row label="Pending" value={s.pending} />
        <Row
          label="Success"
          value={
            <span className="font-semibold text-emerald-600">{s.success}</span>
          }
        />
        <Row
          label="Failed"
          value={
            <span className="font-semibold text-rose-600">{s.failed}</span>
          }
        />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Table Health
// ============================================================================

function TableHealthPanel({ state }: { state: HealthState }) {
  const accessible = state.tables.filter((t) => t.accessible).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-600" /> Table Health
        </CardTitle>
        <CardDescription>
          {accessible}/{state.tables.length} tabel dapat diakses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {state.tables.map((t) => (
            <div
              key={t.key}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm",
                t.accessible
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30"
                  : "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/30",
              )}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{t.label}</span>
                {t.error && (
                  <span className="truncate text-[10px] font-mono text-rose-600 dark:text-rose-400">
                    {t.error}
                  </span>
                )}
              </div>
              <span className="shrink-0 text-xs font-medium">
                {t.accessible ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ✅ Accessible
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400">
                    ❌ Error
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Record Counts
// ============================================================================

function RecordCountsPanel({ state }: { state: HealthState }) {
  const c = state.counts;
  const items: Array<{
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }> = [
    { label: "Jamaah", value: c.jamaah, icon: Users, color: "text-emerald-600" },
    { label: "Chat", value: c.chat, icon: Link2, color: "text-sky-600" },
    { label: "TTV", value: c.ttv, icon: HeartPulse, color: "text-rose-600" },
    { label: "Skrining", value: c.skrining, icon: Eye, color: "text-amber-600" },
    { label: "Lab", value: c.lab, icon: Activity, color: "text-purple-600" },
    { label: "User", value: c.user, icon: UserCheck, color: "text-teal-600" },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-emerald-600" /> Record Counts
        </CardTitle>
        <CardDescription>Jumlah record per tabel</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <div
                key={it.label}
                className="rounded-lg border border-border/60 bg-muted/30 p-3"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className={cn("h-3.5 w-3.5", it.color)} />
                  {it.label}
                </div>
                <div className={cn("mt-1 text-2xl font-bold tabular-nums", it.color)}>
                  {it.value.toLocaleString("id-ID")}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Error Log
// ============================================================================

function ErrorLogPanel({ state }: { state: HealthState }) {
  const errs = state.errors;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-600" /> Error Log
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              errs.length === 0
                ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
                : "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300",
            )}
          >
            {errs.length} error
          </Badge>
        </div>
        <CardDescription>10 error terakhir</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto rounded-md border border-border/60">
          {errs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              Tidak ada error tercatat.
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-[150px]">Time</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errs.map((e, i) => (
                  <TableRow key={`${e.time}-${i}`}>
                    <TableCell className="whitespace-normal text-xs text-muted-foreground">
                      {fmtTime(e.time)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {e.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal font-mono text-xs">
                      {e.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main View
// ============================================================================

export function SupabaseStatusView() {
  const { state, refresh } = useSupabaseHealth();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Supabase Health Monitor
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoring menyeluruh koneksi &amp; layanan Supabase
            {state.lastCheckedAt && (
              <span> · Diperbarui {fmtTime(state.lastCheckedAt)}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                state.checking
                  ? "animate-pulse bg-amber-500"
                  : "bg-emerald-500",
              )}
            />
            Auto-refresh 30s
          </Badge>
          <Button
            onClick={() => refresh()}
            disabled={state.checking}
            size="sm"
          >
            {state.checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </header>

      {/* Progress while checking */}
      {state.checking && <Progress value={65} className="h-1" />}

      {/* Connection hero */}
      <ConnectionHero state={state} />

      {/* Si Pulang Haji panel (full width) */}
      <SiPulangHajiPanel state={state} />

      {/* Two-column grid */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProjectInfoPanel state={state} />
        <DatabasePanel state={state} />
        <AuthPanel state={state} />
        <RealtimePanel state={state} />
        <StoragePanel state={state} />
        <EdgeFunctionPanel state={state} />
        <ApiPanel state={state} />
        <LatencyPanel state={state} />
        <SessionPanel state={state} />
        <SyncPanel state={state} />
      </section>

      {/* Table health (full width) */}
      <TableHealthPanel state={state} />

      {/* Record counts (full width) */}
      <RecordCountsPanel state={state} />

      {/* Error log (full width) */}
      <ErrorLogPanel state={state} />
    </div>
  );
}
