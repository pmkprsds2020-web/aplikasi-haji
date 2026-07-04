// Helper: validate jamaah_id before Supabase INSERT
// If the column is uuid type and jamaah_id is a Prisma cuid, the INSERT
// will fail with "invalid input syntax for type uuid".
// This helper detects that case and gives a clear actionable error.

export function validateJamaahId(jamaahId: string | null | undefined): { valid: boolean; error?: string } {
  if (!jamaahId) {
    return { valid: false, error: "jamaah_id is null or undefined" };
  }

  // Prisma cuid format: starts with "c" and is 24 chars
  const isPrismaCuid = /^c[a-z0-9]{20,}$/i.test(jamaahId);

  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jamaahId);

  if (isPrismaCuid && !isUuid) {
    return {
      valid: false,
      error: `jamaah_id "${jamaahId}" is a Prisma cuid, not a UUID. ` +
        `Run supabase/FIX-UUID-TO-TEXT.sql to change jamaah_id columns to text type, ` +
        `or use the Supabase UUID from the jamaah table.`,
    };
  }

  return { valid: true };
}
