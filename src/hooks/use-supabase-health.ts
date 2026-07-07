"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

const HEALTH_TIMEOUT_MS = 8000;
const REFRESH_INTERVAL_MS = 30_000;

export type ConnectionState = "connected" | "disconnected" | "connecting" | "reconnecting";
export type HealthLevel = "healthy" | "warning" | "error";

export interface ProjectInfo { name: string; id: string; url: string; region: string; environment: string; }
export interface DatabaseStatus { connected: boolean; responseTimeMs: number | null; lastSuccessfulQuery: string | null; currentTimestamp: string | null; timezone: string; }
export interface AuthStatus { running: boolean; error?: string; }
export interface RealtimeStatus { status: "connected" | "disconnected" | "reconnecting"; activeChannels: number; }
export interface StorageStatus { connected: boolean; bucketCount: number; buckets: Array<{ name: string; public: boolean }>; error?: string; }
export interface EdgeFunctionStatus { active: boolean; name?: string; error?: string; }
export interface ApiStatus { reachable: boolean; httpStatus: number | null; networkError?: string; }
export interface LatencyStatus { pingMs: number | null; avgMs: number | null; level: "fast" | "normal" | "slow"; }
export interface SessionStatus { currentUser: string | null; active: boolean; expired: boolean; loginTime: string | null; lastRefresh: string | null; expiresAt: string | null; }
export interface SyncStatus { lastSync: string | null; pending: number; success: number; failed: number; }
export interface TableHealth { key: string; label: string; table: string; accessible: boolean; error?: string; }
export interface RecordCounts { jamaah: number; chat: number; ttv: number; skrining: number; lab: number; user: number; }
export interface ErrorLogEntry { time: string; type: string; message: string; }
export interface SiPulangHajiStats { totalJamaah: number; ttvToday: number; skriningToday: number; activeChats: number; unreadNotifications: number; lastSync: string | null; realtimeChatStatus: "connected" | "disconnected" | "reconnecting"; lastBackup: string | null; failedSync: number; systemStatus: HealthLevel; }

export interface HealthState {
  checking: boolean; connection: ConnectionState; lastCheckedAt: string | null;
  project: ProjectInfo; database: DatabaseStatus; auth: AuthStatus; realtime: RealtimeStatus;
  storage: StorageStatus; edgeFunctions: EdgeFunctionStatus; api: ApiStatus; latency: LatencyStatus;
  session: SessionStatus; sync: SyncStatus; tables: TableHealth[]; counts: RecordCounts;
  errors: ErrorLogEntry[]; sipulanghaji: SiPulangHajiStats;
}

function withTimeout<T>(promise: Promise<T>, ms = HEALTH_TIMEOUT_MS): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Network timeout")), ms))]);
}
function latencyLevel(ms: number | null): "fast" | "normal" | "slow" { if (ms === null) return "normal"; if (ms < 300) return "fast"; if (ms <= 1000) return "normal"; return "slow"; }
function parseProjectFromUrl(url: string): { ref: string; region: string } { try { const u = new URL(url); return { ref: u.hostname.split(".")[0], region: "—" }; } catch { return { ref: "unknown", region: "—" }; } }

const PROBE_TABLE = "profiles";
const TABLE_CHECKS: Array<{ key: string; label: string; table: string }> = [
  { key: "users", label: "users (profiles)", table: "profiles" },
  { key: "jamaah", label: "jamaah", table: "jamaah" },
  { key: "ttv", label: "ttv (vital_sign)", table: "vital_sign" },
  { key: "lab", label: "lab (pasca_hajj_lab)", table: "pasca_hajj_lab" },
  { key: "skrining", label: "skrining (screening)", table: "screening" },
  { key: "chat", label: "chat (chat_message)", table: "chat_message" },
  { key: "riwayat", label: "riwayat (pre_hajj_screening)", table: "pre_hajj_screening" },
];

export function useSupabaseHealth() {
  const supabase = React.useMemo(() => createClient(), []);
  const [state, setState] = React.useState<HealthState>(() => initialIdleState());
  const latencyHistory = React.useRef<number[]>([]);
  const syncStats = React.useRef<{ success: number; failed: number; lastSync: string | null }>({ success: 0, failed: 0, lastSync: null });
  const errorLog = React.useRef<ErrorLogEntry[]>([]);
  const realtimeChannel = React.useRef<RealtimeChannel | null>(null);
  const realtimeStatusRef = React.useRef<"connected" | "disconnected" | "reconnecting">("disconnected");
  const prevConnection = React.useRef<ConnectionState>("connecting");

  const logError = React.useCallback((type: string, message: string) => {
    errorLog.current = [{ time: new Date().toISOString(), type, message }, ...errorLog.current].slice(0, 10);
  }, []);

  const runCheck = React.useCallback(async (): Promise<HealthState> => {
    const now = new Date().toISOString();
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "—";
    const { ref, region } = parseProjectFromUrl(projectUrl);
    const environment = process.env.NODE_ENV === "production" ? "Production" : "Development";
    const project: ProjectInfo = { name: `SiHaji Care (${ref})`, id: ref, url: projectUrl, region, environment };

    let database: DatabaseStatus = { connected: false, responseTimeMs: null, lastSuccessfulQuery: null, currentTimestamp: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    let api: ApiStatus = { reachable: false, httpStatus: null };
    let connection: ConnectionState = "connecting";
    let pingMs: number | null = null;

    try {
      const t0 = performance.now();
      const probe = await withTimeout(supabase.from(PROBE_TABLE).select("id").limit(1).maybeSingle());
      pingMs = Math.round(performance.now() - t0);
      if (probe.error && probe.error.code === "PGRST205") { connection = "disconnected"; api = { reachable: false, httpStatus: 404, networkError: probe.error.message }; logError("Schema", probe.error.message); }
      else { connection = "connected"; api = { reachable: true, httpStatus: probe.error?.status ? Number(probe.error.status) : 200 }; database = { connected: true, responseTimeMs: pingMs, lastSuccessfulQuery: now, currentTimestamp: now, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }; syncStats.current.success += 1; syncStats.current.lastSync = now; }
    } catch (e) { connection = "disconnected"; const msg = e instanceof Error ? e.message : "Unknown DB error"; api = { reachable: false, httpStatus: null, networkError: msg }; logError("Network", msg); syncStats.current.failed += 1; }

    latencyHistory.current = [...latencyHistory.current, pingMs].filter((v): v is number => v !== null).slice(-10);
    const avgMs = latencyHistory.current.length > 0 ? Math.round(latencyHistory.current.reduce((a, b) => a + b, 0) / latencyHistory.current.length) : null;
    const latency: LatencyStatus = { pingMs, avgMs, level: latencyLevel(pingMs) };

    let auth: AuthStatus = { running: false };
    let sessionInfo: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] = null;
    try {
      const { data: sessionData, error: authErr } = await withTimeout(supabase.auth.getSession());
      if (authErr) { auth = { running: false, error: authErr.message }; logError("Auth", authErr.message); }
      else { auth = { running: true }; sessionInfo = sessionData.session; }
    } catch (e) { const msg = e instanceof Error ? e.message : "Auth check failed"; auth = { running: false, error: msg }; logError("Auth", msg); }

    const sess = sessionInfo;
    const expiresAt = sess?.expires_at ? new Date(sess.expires_at * 1000).toISOString() : null;
    const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
    const sessionStatus: SessionStatus = { currentUser: sess?.user?.email ?? null, active: !!sess, expired: isExpired, loginTime: sess?.user?.created_at ?? null, lastRefresh: sess ? now : null, expiresAt };

    let storage: StorageStatus = { connected: false, bucketCount: 0, buckets: [] };
    try {
      const { data: buckets, error: stErr } = await withTimeout(supabase.storage.listBuckets());
      if (stErr) { storage = { connected: false, bucketCount: 0, buckets: [], error: stErr.message }; logError("Storage", stErr.message); }
      else { storage = { connected: true, bucketCount: buckets?.length ?? 0, buckets: (buckets ?? []).map((b) => ({ name: b.name, public: b.public })) }; }
    } catch (e) { const msg = e instanceof Error ? e.message : "Storage check failed"; storage = { connected: false, bucketCount: 0, buckets: [], error: msg }; logError("Storage", msg); }

    const edgeFunctions: EdgeFunctionStatus = { active: false };
    const tables: TableHealth[] = await Promise.all(TABLE_CHECKS.map(async (t) => {
      try { const { error } = await withTimeout(supabase.from(t.table).select("id").limit(1).maybeSingle()); if (error && error.code === "PGRST205") return { ...t, accessible: false, error: "Table not found" }; return { ...t, accessible: true }; }
      catch (e) { return { ...t, accessible: false, error: e instanceof Error ? e.message : "Table check failed" }; }
    }));

    const countOf = async (table: string): Promise<number> => { try { const { count, error } = await withTimeout(supabase.from(table).select("*", { count: "exact", head: true })); if (error) { logError("Count", `${table}: ${error.message}`); return 0; } return count ?? 0; } catch { return 0; } };
    const [jamaahCount, chatCount, ttvCount, skriningCount, labCount, userCount] = await Promise.all([countOf("jamaah"), countOf("chat_message"), countOf("vital_sign"), countOf("screening"), countOf("pasca_hajj_lab"), countOf("profiles")]);
    const counts: RecordCounts = { jamaah: jamaahCount, chat: chatCount, ttv: ttvCount, skrining: skriningCount, lab: labCount, user: userCount };

    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0); const todayISO = startOfToday.toISOString();
    const countToday = async (table: string): Promise<number> => { try { const { count } = await withTimeout(supabase.from(table).select("*", { count: "exact", head: true }).gte("created_at", todayISO)); return count ?? 0; } catch { return 0; } };
    const [ttvToday, skriningToday] = await Promise.all([countToday("vital_sign"), countToday("screening")]);
    let activeChats = 0, unread = 0;
    try { const { count: rc } = await withTimeout(supabase.from("chat_room").select("*", { count: "exact", head: true })); activeChats = rc ?? 0; } catch { /* */ }
    try { const { count: uc } = await withTimeout(supabase.from("chat_message").select("*", { count: "exact", head: true }).eq("read_by_doctor", false)); unread = uc ?? 0; } catch { /* */ }

    const realtime: RealtimeStatus = { status: realtimeStatusRef.current, activeChannels: realtimeChannel.current ? 1 : 0 };
    const tableErrors = tables.filter((t) => !t.accessible).length;
    const systemStatus: HealthLevel = (() => { if (connection === "disconnected" || !database.connected || !auth.running) return "error"; if (tableErrors > 0 || latency.level === "slow") return "warning"; return "healthy"; })();
    const sipulanghaji: SiPulangHajiStats = { totalJamaah: counts.jamaah, ttvToday, skriningToday, activeChats, unreadNotifications: unread, lastSync: syncStats.current.lastSync, realtimeChatStatus: realtime.status, lastBackup: null, failedSync: syncStats.current.failed, systemStatus };

    return { checking: false, connection, lastCheckedAt: now, project, database, auth, realtime, storage, edgeFunctions, api, latency, session: sessionStatus, sync: { lastSync: syncStats.current.lastSync, pending: 0, success: syncStats.current.success, failed: syncStats.current.failed }, tables, counts, errors: [...errorLog.current], sipulanghaji };
  }, [supabase, logError]);

  const refresh = React.useCallback(async () => {
    setState((s) => ({ ...s, checking: true, connection: "connecting" }));
    try {
      const next = await runCheck(); setState(next);
      if (next.connection === "disconnected" && prevConnection.current !== "disconnected") { toast.error("Koneksi Supabase terputus. Mencoba menyambungkan ulang…"); }
      if (next.connection === "disconnected") {
        setState((s) => ({ ...s, connection: "reconnecting" }));
        setTimeout(async () => { try { const retry = await runCheck(); setState(retry); if (retry.connection === "connected") toast.success("Koneksi Supabase tersambung kembali."); } catch { /* */ } }, 3000);
      }
      prevConnection.current = next.connection;
    } catch (e) { const msg = e instanceof Error ? e.message : "Health check failed"; logError("Health", msg); setState((s) => ({ ...s, checking: false, connection: "disconnected", lastCheckedAt: new Date().toISOString(), errors: [...errorLog.current] })); }
  }, [runCheck, logError]);

  React.useEffect(() => {
    const channel = supabase.channel("health-monitor").on("postgres_changes", { event: "*", schema: "public", table: "jamaah" }, () => {}).subscribe((status) => {
      if (status === "SUBSCRIBED") realtimeStatusRef.current = "connected";
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") realtimeStatusRef.current = "reconnecting";
      else if (status === "CLOSED") realtimeStatusRef.current = "disconnected";
      setState((s) => ({ ...s, realtime: { status: realtimeStatusRef.current, activeChannels: realtimeChannel.current ? 1 : 0 } }));
    });
    realtimeChannel.current = channel;
    return () => { try { supabase.removeChannel(channel); } catch { /* */ } realtimeChannel.current = null; };
  }, [supabase]);

  React.useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);

  return { state, refresh };
}

function initialIdleState(): HealthState {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "—";
  const { ref, region } = parseProjectFromUrl(projectUrl);
  return {
    checking: true, connection: "connecting", lastCheckedAt: null,
    project: { name: `SiHaji Care (${ref})`, id: ref, url: projectUrl, region, environment: process.env.NODE_ENV === "production" ? "Production" : "Development" },
    database: { connected: false, responseTimeMs: null, lastSuccessfulQuery: null, currentTimestamp: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    auth: { running: false }, realtime: { status: "disconnected", activeChannels: 0 },
    storage: { connected: false, bucketCount: 0, buckets: [] }, edgeFunctions: { active: false },
    api: { reachable: false, httpStatus: null }, latency: { pingMs: null, avgMs: null, level: "normal" },
    session: { currentUser: null, active: false, expired: false, loginTime: null, lastRefresh: null, expiresAt: null },
    sync: { lastSync: null, pending: 0, success: 0, failed: 0 },
    tables: TABLE_CHECKS.map((t) => ({ ...t, accessible: false })),
    counts: { jamaah: 0, chat: 0, ttv: 0, skrining: 0, lab: 0, user: 0 }, errors: [],
    sipulanghaji: { totalJamaah: 0, ttvToday: 0, skriningToday: 0, activeChats: 0, unreadNotifications: 0, lastSync: null, realtimeChatStatus: "disconnected", lastBackup: null, failedSync: 0, systemStatus: "warning" },
  };
}
