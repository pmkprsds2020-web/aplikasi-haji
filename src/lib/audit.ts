import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Audit Logger (Chapter 11)
// Writes explicit audit entries for LOGIN/LOGOUT/EXPORT/IMPORT and any
// ad-hoc actions. Row-level INSERT/UPDATE/DELETE are logged automatically
// by the `log_audit()` database trigger defined in supabase/schema.sql.
// ============================================================================

export type AuditAction =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "IMPORT";

export interface AuditEntry {
  action: AuditAction;
  tableName: string;
  recordId?: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string;
}

/**
 * Write an audit log entry. Uses the server Supabase client (RLS-aware).
 * Safe to call without awaiting in fire-and-forget scenarios, but awaiting
 * is recommended for critical operations.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("audit_log").insert({
      user_id: userData.user?.id ?? null,
      action: entry.action,
      table_name: entry.tableName,
      record_id: entry.recordId ?? null,
      old_value: entry.oldValue ?? null,
      new_value: entry.newValue ?? null,
      reason: entry.reason ?? null,
    } as never);
    if (error) {
      // Suppress "schema cache" / "relation does not exist" errors silently —
      // these occur when the SQL schema hasn't been applied yet. Only surface
      // genuine unexpected errors at debug level.
      const msg = error.message || "";
      const isMissingTable =
        msg.includes("schema cache") ||
        msg.includes("does not exist") ||
        msg.includes("Could not find the table");
      if (!isMissingTable) {
        console.debug("[audit] insert failed:", msg);
      }
    }
  } catch {
    // Swallow all errors — audit logging must never break the main operation.
  }
}
