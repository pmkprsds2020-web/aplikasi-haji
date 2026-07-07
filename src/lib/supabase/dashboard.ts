"use client";

import { createClient } from "./client";
import { logSelect } from "./query-logger";
import type { JamaahData, RiskLevel } from "@/lib/types";

// ============================================================================
// Dashboard stats — all computed directly from Supabase (single source of truth).
// ============================================================================

export interface DashboardStats {
  total: number;
  merah: number;
  kuning: number;
  hijau: number;
  lansia: number;
  activeChats: number;
  unreadNotifications: number;
  monitoringToday: number;
  screeningsToday: number;
  ttvToday: number;
}

export interface DashboardJamaahItem extends JamaahData {
  screeningCount: number;
}

function mapJamaah(j: Record<string, unknown>): JamaahData {
  return {
    id: String(j.id), nama: String(j.nama ?? ""), nik: String(j.nik ?? ""),
    kloter: String(j.kloter ?? ""), porsi: String(j.porsi ?? ""),
    usia: Number(j.usia ?? 0), kelamin: (j.kelamin === "P" ? "P" : "L") as "L" | "P",
    alamat: String(j.alamat ?? ""), hp: String(j.hp ?? ""),
    kontakKeluarga: String(j.kontak_keluarga ?? ""),
    tanggalTiba: String(j.tanggal_tiba ?? ""), bandara: String(j.bandara ?? ""),
    kabupatenKota: String(j.kabupaten_kota ?? ""), puskesmas: String(j.puskesmas ?? ""),
    dokterKeluarga: String(j.dokter_keluarga ?? ""),
    paspor: (j.paspor as string | null) ?? null,
    embarkasi: (j.embarkasi as string | null) ?? null,
    golDarah: (j.gol_darah as string | null) ?? null,
    riwayatPenyakit: (j.riwayat_penyakit ?? null) as string | null,
    riwayatOperasi: (j.riwayat_operasi ?? null) as string | null,
    alergi: (j.alergi ?? null) as string | null,
    obatRutin: (j.obat_rutin ?? null) as string | null,
    statusIstithaah: (j.status_istithaah ?? null) as string | null,
    tanggalBerangkat: (j.tanggal_berangkat ?? null) as string | null,
    tanggalPulang: (j.tanggal_pulang ?? null) as string | null,
    riskLevel: ((j.risk_level as string) ?? "HIJAU") as RiskLevel,
    riskSummary: String(j.risk_summary ?? ""),
    createdAt: String(j.created_at ?? ""), updatedAt: String(j.updated_at ?? ""),
  };
}

export async function loadDashboardJamaahList(): Promise<{ list: DashboardJamaahItem[]; error: string | null }> {
  const supabase = createClient();
  const t0 = performance.now();
  const { data: jamaahRows, error: jErr } = await supabase
    .from("jamaah").select("*")
    .order("risk_level", { ascending: false })
    .order("tanggal_tiba", { ascending: false });
  logSelect("jamaah", "ORDER BY risk_level DESC", jamaahRows, jErr, Math.round(performance.now() - t0));
  if (jErr) return { list: [], error: `[${jErr.code}] ${jErr.message}` };
  if (!jamaahRows || jamaahRows.length === 0) return { list: [], error: null };

  const ids = jamaahRows.map((j) => String((j as Record<string, unknown>).id));
  const t2 = performance.now();
  const { data: screeningRows, error: sErr } = await supabase
    .from("screening").select("jamaah_id, jenis").in("jamaah_id", ids);
  logSelect("screening", `jamaah_id IN (${ids.length})`, screeningRows, sErr, Math.round(performance.now() - t2));

  const screeningCountMap = new Map<string, number>();
  if (!sErr && screeningRows) {
    for (const row of screeningRows) {
      const jid = String((row as Record<string, unknown>).jamaah_id);
      screeningCountMap.set(jid, (screeningCountMap.get(jid) ?? 0) + 1);
    }
  }

  const list: DashboardJamaahItem[] = jamaahRows.map((j) => {
    const jData = mapJamaah(j as Record<string, unknown>);
    return { ...jData, screeningCount: screeningCountMap.get(jData.id) ?? 0 };
  });
  return { list, error: null };
}

export async function loadDashboardStats(): Promise<{ stats: DashboardStats; error: string | null }> {
  const supabase = createClient();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const todayISO = startOfToday.toISOString();

  const results = await Promise.allSettled([
    supabase.from("jamaah").select("*", { count: "exact", head: true }),
    supabase.from("jamaah").select("*", { count: "exact", head: true }).eq("risk_level", "MERAH"),
    supabase.from("jamaah").select("*", { count: "exact", head: true }).eq("risk_level", "KUNING"),
    supabase.from("jamaah").select("*", { count: "exact", head: true }).eq("risk_level", "HIJAU"),
    supabase.from("jamaah").select("usia"),
    supabase.from("chat_room").select("*", { count: "exact", head: true }),
    supabase.from("chat_message").select("*", { count: "exact", head: true }).eq("read_by_doctor", false),
    supabase.from("vital_sign").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
    supabase.from("screening").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
  ]);

  const labels = ["jamaah(total)", "jamaah(MERAH)", "jamaah(KUNING)", "jamaah(HIJAU)", "jamaah(usia)", "chat_room", "chat_message(unread)", "vital_sign(today)", "screening(today)"];
  results.forEach((r, i) => {
    if (r.status === "rejected") console.warn(`[Dashboard] ${labels[i]} rejected:`, r.reason);
  });

  const getCount = (idx: number): number => {
    const r = results[idx];
    if (r.status === "fulfilled") return r.value.count ?? 0;
    return 0;
  };
  const getUsiaData = (): Array<Record<string, unknown>> => {
    const r = results[4];
    if (r.status === "fulfilled") return (r.value.data ?? []) as Array<Record<string, unknown>>;
    return [];
  };

  const lansiaCount = getUsiaData().filter((row) => Number(row.usia) >= 60).length;
  const stats: DashboardStats = {
    total: getCount(0), merah: getCount(1), kuning: getCount(2), hijau: getCount(3),
    lansia: lansiaCount, activeChats: getCount(5), unreadNotifications: getCount(6),
    monitoringToday: getCount(7) + getCount(8), screeningsToday: getCount(8), ttvToday: getCount(7),
  };
  const firstError = results.find((r) => r.status === "rejected");
  const error = firstError && firstError.status === "rejected" ? String(firstError.reason) : null;
  return { stats, error };
}
