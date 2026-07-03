import { BaseRepository } from "./base.repository";

// ============================================================================
// Jamaah Repository (Chapter 2: Repository layer → Supabase)
// Typed CRUD for the `jamaah` table. Inherits standard CRUD from BaseRepository.
// ============================================================================

export interface JamaahRecord {
  id: string;
  user_id: string | null;
  nama: string;
  nik: string;
  kloter: string;
  porsi: string;
  usia: number;
  kelamin: string;
  alamat: string;
  hp: string;
  kontak_keluarga: string;
  tanggal_tiba: string;
  bandara: string;
  kabupaten_kota: string;
  puskesmas: string;
  dokter_keluarga: string;
  paspor: string | null;
  embarkasi: string | null;
  gol_darah: string | null;
  riwayat_penyakit: string | null;
  riwayat_operasi: string | null;
  alergi: string | null;
  obat_rutin: string | null;
  status_istithaah: string | null;
  tanggal_berangkat: string | null;
  tanggal_pulang: string | null;
  risk_level: string;
  risk_summary: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  is_active: boolean;
}

class JamaahRepositoryClass extends BaseRepository<JamaahRecord> {
  constructor() {
    super("jamaah", ["nama", "nik", "kloter", "porsi", "puskesmas"]);
  }

  /** Find jamaah linked to a specific auth user (patient self-view) */
  async findByUserId(userId: string): Promise<JamaahRecord | null> {
    const result = await this.findMany({
      filters: { user_id: userId },
      pageSize: 1,
    });
    return result.data[0] ?? null;
  }

  /** Count by risk level (for dashboard) */
  async countByRiskLevel(): Promise<{ hijau: number; kuning: number; merah: number; total: number }> {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("jamaah")
      .select("risk_level")
      .is("deleted_at", null);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ risk_level: string }>;
    return {
      total: rows.length,
      merah: rows.filter((r) => r.risk_level === "MERAH").length,
      kuning: rows.filter((r) => r.risk_level === "KUNING").length,
      hijau: rows.filter((r) => r.risk_level === "HIJAU").length,
    };
  }
}

export const jamaahRepository = new JamaahRepositoryClass();
