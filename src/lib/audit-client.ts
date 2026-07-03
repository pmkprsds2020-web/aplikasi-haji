"use client";

import { createClient } from "@/lib/supabase/client";
import type { AuditAction } from "@/lib/audit";

// ============================================================================
// Client-side Audit Logger (Chapter 11)
// Logs LOGIN/LOGOUT/EXPORT/IMPORT events from the browser to the audit_log
// table via Supabase (RLS allows authenticated users to insert audit rows).
//
// Resilience: audit logging must NEVER break the main operation or flood the
// console. If the audit_log table doesn't exist yet (e.g. during initial
// setup before the SQL schema is applied), errors are silently swallowed.
// ============================================================================

export async function logAuditClient(
  action: AuditAction,
  tableName: string,
  recordId?: string
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("audit_log").insert({
      action,
      table_name: tableName,
      record_id: recordId ?? null,
    } as never);
    if (error) {
      // Suppress "schema cache" / "relation does not exist" errors silently —
      // these occur when the SQL schema hasn't been applied yet and are not
      // actionable at runtime. Only log genuine unexpected errors at debug level.
      const msg = error.message || "";
      const isMissingTable =
        msg.includes("schema cache") ||
        msg.includes("does not exist") ||
        msg.includes("Could not find the table");
      if (!isMissingTable) {
        console.debug("[audit-client] insert failed:", msg);
      }
    }
  } catch {
    // Swallow all errors — audit logging is fire-and-forget.
  }
}
