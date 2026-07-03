"use client";

import { createClient } from "@/lib/supabase/client";
import type { AuditAction } from "@/lib/audit";

// ============================================================================
// Client-side Audit Logger (Chapter 11)
// Logs LOGIN/LOGOUT/EXPORT/IMPORT events from the browser to the audit_log
// table via Supabase (RLS allows authenticated users to insert audit rows).
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
      // Audit logging must never break the main operation.
      console.error("[audit-client] insert failed:", error.message);
    }
  } catch (err) {
    console.error("[audit-client] unexpected error:", err);
  }
}
