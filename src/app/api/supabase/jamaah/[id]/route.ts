import { NextRequest } from "next/server";
import { jamaahService } from "@/services/jamaah.service";
import { ok, fail, notFound, unauthorized, forbidden } from "@/lib/response";

// GET /api/supabase/jamaah/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await jamaahService.getById(id);
    if (!record) return notFound("Jamaah tidak ditemukan");
    return ok(record, "Detail jamaah berhasil dimuat");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat jamaah";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return fail(msg, "Gagal memuat jamaah", 500);
  }
}

// PUT /api/supabase/jamaah/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const record = await jamaahService.update(id, body);
    return ok(record, "Jamaah berhasil diperbarui");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memperbarui jamaah";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return fail(msg, "Gagal memperbarui jamaah", 500);
  }
}

// DELETE /api/supabase/jamaah/[id]?hard=true for hard delete (super_admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const hard = req.nextUrl.searchParams.get("hard") === "true";
    const reason = req.nextUrl.searchParams.get("reason") ?? undefined;
    if (hard) {
      // Hard delete requires super_admin — enforced at service layer via requireStaff check
      await jamaahService.delete(id, reason);
    } else {
      await jamaahService.delete(id, reason);
    }
    return ok(null, "Jamaah berhasil dihapus");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghapus jamaah";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return fail(msg, "Gagal menghapus jamaah", 500);
  }
}
