import { NextRequest } from "next/server";
import { jamaahService } from "@/services/jamaah.service";
import { ok, fail, unauthorized, forbidden } from "@/lib/response";
import type { QueryParams } from "@/repositories/base.repository";

// GET /api/supabase/jamaah — paginated list with search/sort/filter
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const params: QueryParams = {
      page: sp.get("page") ? Number(sp.get("page")) : undefined,
      pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
      search: sp.get("q") ?? undefined,
      sortBy: sp.get("sortBy") ?? undefined,
      sortOrder: (sp.get("sortOrder") as "asc" | "desc") ?? undefined,
    };
    const result = await jamaahService.list(params);
    return ok(result, "Daftar jamaah berhasil dimuat");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat daftar jamaah";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return fail(msg, "Gagal memuat daftar jamaah", 500);
  }
}

// POST /api/supabase/jamaah — create
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.nama || !body.nik || !body.kloter || !body.porsi || body.usia == null || !body.kelamin || !body.tanggal_tiba) {
      return fail("Field wajib belum lengkap (nama, nik, kloter, porsi, usia, kelamin, tanggal_tiba)");
    }
    const record = await jamaahService.create(body);
    return ok(record, "Jamaah berhasil ditambahkan");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menambah jamaah";
    if (msg === "UNAUTHORIZED") return unauthorized();
    if (msg === "FORBIDDEN") return forbidden();
    return fail(msg, "Gagal menambah jamaah", 500);
  }
}
