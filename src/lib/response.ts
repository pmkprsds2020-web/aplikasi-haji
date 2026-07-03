import { NextResponse } from "next/server";

// ============================================================================
// Standardized API Response (Chapter 15)
// Every mutation returns: { success, message, data, error }
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  error: string | null;
}

export function ok<T>(data: T, message = "Operasi berhasil"): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, message, data, error: null });
}

export function fail(
  error: string,
  message = "Operasi gagal",
  status = 400
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    { success: false, message, data: null, error },
    { status }
  );
}

export function unauthorized(message = "Tidak terautentikasi"): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    { success: false, message, data: null, error: "UNAUTHORIZED" },
    { status: 401 }
  );
}

export function forbidden(message = "Akses ditolak"): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    { success: false, message, data: null, error: "FORBIDDEN" },
    { status: 403 }
  );
}

export function notFound(message = "Data tidak ditemukan"): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    { success: false, message, data: null, error: "NOT_FOUND" },
    { status: 404 }
  );
}
