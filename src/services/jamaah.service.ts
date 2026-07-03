import { createClient } from "@/lib/supabase/server";
import {
  jamaahRepository,
  type JamaahRecord,
} from "@/repositories/jamaah.repository";
import type { QueryParams, PagedResult } from "@/repositories/base.repository";
import { logAudit } from "@/lib/audit";

// ============================================================================
// Jamaah Service (Chapter 2: Service layer — business logic + authorization)
// UI → Service → Repository → Supabase
// ============================================================================

export interface JamaahInput {
  nama: string;
  nik: string;
  kloter: string;
  porsi: string;
  usia: number;
  kelamin: "L" | "P";
  alamat?: string;
  hp?: string;
  kontak_keluarga?: string;
  tanggal_tiba: string;
  bandara?: string;
  kabupaten_kota?: string;
  puskesmas?: string;
  dokter_keluarga?: string;
  paspor?: string | null;
  embarkasi?: string | null;
  gol_darah?: string | null;
  riwayat_penyakit?: string | null;
  riwayat_operasi?: string | null;
  alergi?: string | null;
  obat_rutin?: string | null;
  status_istithaah?: string | null;
  tanggal_berangkat?: string | null;
  tanggal_pulang?: string | null;
}

/** Assert the caller is authenticated and is staff (doctor/admin/etc). */
async function requireStaff(): Promise<{ id: string; role: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error("UNAUTHORIZED");
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) throw error;
  const role = ((profile as { role?: string } | null)?.role) ?? "viewer";
  const staffRoles = ["super_admin", "admin", "kepala_klinik", "pj_mutu", "petugas"];
  if (!staffRoles.includes(role)) {
    throw new Error("FORBIDDEN");
  }
  return { id: userData.user.id, role };
}

export const jamaahService = {
  /** CREATE */
  async create(input: JamaahInput): Promise<JamaahRecord> {
    await requireStaff();
    const record = await jamaahRepository.create(input as unknown as Partial<JamaahRecord>);
    await logAudit({
      action: "INSERT",
      tableName: "jamaah",
      recordId: record.id,
      newValue: record as unknown as Record<string, unknown>,
    });
    return record;
  },

  /** READ (paged) */
  async list(params?: QueryParams): Promise<PagedResult<JamaahRecord>> {
    await requireStaff();
    return jamaahRepository.findMany(params);
  },

  /** READ by id */
  async getById(id: string): Promise<JamaahRecord | null> {
    await requireStaff();
    return jamaahRepository.findById(id);
  },

  /** UPDATE */
  async update(id: string, patch: Partial<JamaahInput>): Promise<JamaahRecord> {
    await requireStaff();
    const oldRecord = await jamaahRepository.findById(id);
    const updated = await jamaahRepository.update(id, patch as Partial<JamaahRecord>);
    await logAudit({
      action: "UPDATE",
      tableName: "jamaah",
      recordId: id,
      oldValue: (oldRecord ?? null) as unknown as Record<string, unknown> | null,
      newValue: updated as unknown as Record<string, unknown>,
    });
    return updated;
  },

  /** SOFT DELETE */
  async delete(id: string, reason?: string): Promise<void> {
    await requireStaff();
    const oldRecord = await jamaahRepository.findById(id);
    await jamaahRepository.softDelete(id);
    await logAudit({
      action: "DELETE",
      tableName: "jamaah",
      recordId: id,
      oldValue: (oldRecord ?? null) as unknown as Record<string, unknown> | null,
      reason,
    });
  },

  /** BULK SOFT DELETE */
  async deleteBulk(ids: string[], reason?: string): Promise<void> {
    await requireStaff();
    await jamaahRepository.softDeleteBulk(ids);
    for (const id of ids) {
      await logAudit({ action: "DELETE", tableName: "jamaah", recordId: id, reason });
    }
  },

  /** RESTORE */
  async restore(id: string): Promise<JamaahRecord> {
    await requireStaff();
    const record = await jamaahRepository.restore(id);
    await logAudit({ action: "RESTORE", tableName: "jamaah", recordId: id, newValue: record as unknown as Record<string, unknown> });
    return record;
  },

  /** Dashboard stats (Chapter 10: query Supabase, not React state) */
  async stats() {
    await requireStaff();
    return jamaahRepository.countByRiskLevel();
  },
};
