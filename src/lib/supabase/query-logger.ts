"use client";

import { createClient } from "./client";

// ============================================================================
// Supabase Query Logger — structured logging for all client-side Supabase ops.
// ============================================================================

export interface LogEntry {
  op: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "STORAGE" | "AUTH" | "REALTIME";
  table: string;
  filter?: string;
  payload?: unknown;
  rowsAffected?: number;
  rowsReturned?: number;
  durationMs?: number;
  error?: string;
  errorCode?: string;
  timestamp: string;
}

const logBuffer: LogEntry[] = [];

export function getLogBuffer(): LogEntry[] { return [...logBuffer]; }
export function clearLogBuffer(): void { logBuffer.length = 0; }

export function logQuery(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > 100) logBuffer.shift();
  if (process.env.NODE_ENV === "production") return;
  const parts = [
    `[Supabase] ${entry.op} ${entry.table}`,
    entry.filter ? `filter=${entry.filter}` : "",
    entry.rowsAffected !== undefined ? `rows=${entry.rowsAffected}` : "",
    entry.durationMs !== undefined ? `${entry.durationMs}ms` : "",
    entry.error ? `ERROR[${entry.errorCode ?? "?"}]: ${entry.error}` : "",
  ].filter(Boolean);
  if (entry.error) {
    console.error(parts.join(" · "));
  } else {
    console.log(parts.join(" · "));
  }
}

export function logSelect(table: string, filter: string | undefined, data: unknown[] | null, error: { code?: string; message: string } | null, durationMs: number): void {
  logQuery({ op: "SELECT", table, filter, rowsReturned: data?.length ?? 0, durationMs, error: error?.message, errorCode: error?.code, timestamp: new Date().toISOString() });
}
export function logInsert(table: string, payload: unknown, data: unknown | null, error: { code?: string; message: string } | null, durationMs: number): void {
  logQuery({ op: "INSERT", table, payload, rowsAffected: data ? 1 : 0, durationMs, error: error?.message, errorCode: error?.code, timestamp: new Date().toISOString() });
}
export function logUpdate(table: string, filter: string, payload: unknown, data: unknown[] | null, error: { code?: string; message: string } | null, durationMs: number): void {
  logQuery({ op: "UPDATE", table, filter, payload, rowsAffected: data?.length ?? 0, durationMs, error: error?.message, errorCode: error?.code, timestamp: new Date().toISOString() });
}
export function logDelete(table: string, filter: string, data: unknown[] | null, error: { code?: string; message: string } | null, durationMs: number): void {
  logQuery({ op: "DELETE", table, filter, rowsAffected: data?.length ?? 0, durationMs, error: error?.message, errorCode: error?.code, timestamp: new Date().toISOString() });
}

export { createClient };
