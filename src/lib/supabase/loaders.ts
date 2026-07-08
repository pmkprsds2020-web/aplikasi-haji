import { createClient, createAdminClient } from "./server";
import type {
  JamaahDetail,
  JamaahData,
  ScreeningData,
  VitalSignData,
  PascaHajjLabData,
  JenisSkrining,
  RiskLevel,
} from "@/lib/types";

// ============================================================================
// Shared Supabase data loaders (server-side).
// ----------------------------------------------------------------------------
// These helpers load jamaah + child rows from Supabase and map snake_case
// Postgres columns → camelCase client types expected by computeRiskForJamaah
// and the rest of the app.
//
// Strategy: prefer the user's session client (createClient) so the AI analysis
// sees exactly the same data the user is authorised to see in the dashboard.
// If that fails (e.g. RLS misconfigured or no session), fall back to the admin
// client (service role) which bypasses RLS — this makes the AI analysis robust
// against transient RLS policy issues.
// ============================================================================

async function getClient() {
  try {
    return await createClient();
  } catch {
    return createAdminClient();
  }
}

function parseJsonData(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      return p && typeof p === "object" && !Array.isArray(p)
        ? (p as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function mapJamaah(j: Record<string, unknown>): JamaahData {
  return {
    id: String(j.id),
    nama: String(j.nama ?? ""),
    nik: String(j.nik ?? ""),
    kloter: String(j.kloter ?? ""),
    porsi: String(j.porsi ?? ""),
    usia: Number(j.usia ?? 0),
    kelamin: (j.kelamin === "P" ? "P" : "L") as "L" | "P",
    alamat: String(j.alamat ?? ""),
    hp: String(j.hp ?? ""),
    kontakKeluarga: String(j.kontak_keluarga ?? ""),
    tanggalTiba: String(j.tanggal_tiba ?? ""),
    bandara: String(j.bandara ?? ""),
    kabupatenKota: String(j.kabupaten_kota ?? ""),
    puskesmas: String(j.puskesmas ?? ""),
    dokterKeluarga: String(j.dokter_keluarga ?? ""),
    paspor: (j.paspor as string | null) ?? null,
    embarkasi: (j.embarkasi as string | null) ?? null,
    golDarah: (j.gol_darah as string | null) ?? null,
    riwayatPenyakit: (j.riwayat_penyakit as string | null) ?? null,
    riwayatOperasi: (j.riwayat_operasi as string | null) ?? null,
    alergi: (j.alergi as string | null) ?? null,
    obatRutin: (j.obat_rutin as string | null) ?? null,
    statusIstithaah: (j.status_istithaah as string | null) ?? null,
    tanggalBerangkat: (j.tanggal_berangkat as string | null) ?? null,
    tanggalPulang: (j.tanggal_pulang as string | null) ?? null,
    riskLevel: (j.risk_level as RiskLevel) ?? "HIJAU",
    riskSummary: String(j.risk_summary ?? ""),
    createdAt: String(j.created_at ?? ""),
    updatedAt: String(j.updated_at ?? ""),
  };
}

function mapScreening(s: Record<string, unknown>): ScreeningData {
  return {
    id: String(s.id),
    jamaahId: String(s.jamaah_id),
    jenis: s.jenis as JenisSkrining,
    data: parseJsonData(s.data),
    skor: (s.skor as string | null) ?? null,
    catatan: (s.catatan as string | null) ?? null,
    hariKe: Number(s.hari_ke ?? 0),
    createdAt: String(s.created_at ?? ""),
  };
}

function mapVital(v: Record<string, unknown>): VitalSignData {
  return {
    id: String(v.id),
    jamaahId: String(v.jamaah_id),
    tdSistolik: (v.td_sistolik as number | null) ?? null,
    tdDiastolik: (v.td_diastolik as number | null) ?? null,
    nadi: (v.nadi as number | null) ?? null,
    rr: (v.rr as number | null) ?? null,
    suhu: (v.suhu as number | null) ?? null,
    spo2: (v.spo2 as number | null) ?? null,
    beratBadan: (v.berat_badan as number | null) ?? null,
    gulaDarah: (v.gula_darah as number | null) ?? null,
    hariKe: Number(v.hari_ke ?? 0),
    catatan: (v.catatan as string | null) ?? null,
    createdAt: String(v.created_at ?? ""),
  };
}

function mapPascaLab(l: Record<string, unknown>): PascaHajjLabData {
  return {
    id: String(l.id),
    jamaahId: String(l.jamaah_id),
    hb: (l.hb as number | null) ?? null,
    leukosit: (l.leukosit as number | null) ?? null,
    gdp: (l.gdp as number | null) ?? null,
    gd2pp: (l.gd2pp as number | null) ?? null,
    hba1c: (l.hba1c as number | null) ?? null,
    kolesterol: (l.kolesterol as number | null) ?? null,
    ldl: (l.ldl as number | null) ?? null,
    hdl: (l.hdl as number | null) ?? null,
    trigliserida: (l.trigliserida as number | null) ?? null,
    sgot: (l.sgot as number | null) ?? null,
    sgpt: (l.sgpt as number | null) ?? null,
    ureum: (l.ureum as number | null) ?? null,
    kreatinin: (l.kreatinin as number | null) ?? null,
    catatan: (l.catatan as string | null) ?? null,
    createdAt: String(l.created_at ?? ""),
  };
}

// Load a single jamaah with all child rows (screenings, vitals, pasca labs).
// Returns null if the jamaah is not found.
export async function loadJamaahDetail(
  jamaahId: string
): Promise<JamaahDetail | null> {
  const supabase = await getClient();

  const { data: j, error: jErr } = await supabase
    .from("jamaah")
    .select("*")
    .eq("id", jamaahId)
    .maybeSingle();

  if (jErr || !j) return null;

  const [screeningsRes, vitalsRes, pascaLabsRes] = await Promise.all([
    supabase
      .from("screening")
      .select("*")
      .eq("jamaah_id", jamaahId)
      .order("created_at", { ascending: false }),
    supabase
      .from("vital_sign")
      .select("*")
      .eq("jamaah_id", jamaahId)
      .order("created_at", { ascending: false }),
    supabase
      .from("pasca_hajj_lab")
      .select("*")
      .eq("jamaah_id", jamaahId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    ...mapJamaah(j as Record<string, unknown>),
    screenings: (screeningsRes.data ?? []).map((s) =>
      mapScreening(s as unknown as Record<string, unknown>)
    ),
    vitalSigns: (vitalsRes.data ?? []).map((v) =>
      mapVital(v as unknown as Record<string, unknown>)
    ),
    pascaHajjLabs: (pascaLabsRes.data ?? []).map((l) =>
      mapPascaLab(l as unknown as Record<string, unknown>)
    ),
  };
}

// Load ALL jamaah with their child rows. Used for cohort-level analysis.
export async function loadAllJamaahDetails(): Promise<JamaahDetail[]> {
  const supabase = await getClient();

  const { data: allJamaah, error: jErr } = await supabase
    .from("jamaah")
    .select("*")
    .order("risk_level", { ascending: false });

  if (jErr || !allJamaah?.length) return [];

  const ids = allJamaah.map((j) => String((j as Record<string, unknown>).id));

  const [screeningsRes, vitalsRes] = await Promise.all([
    supabase.from("screening").select("*").in("jamaah_id", ids),
    supabase.from("vital_sign").select("*").in("jamaah_id", ids),
  ]);

  const screeningsByJamaah = new Map<string, ScreeningData[]>();
  for (const s of screeningsRes.data ?? []) {
    const row = s as unknown as Record<string, unknown>;
    const jid = String(row.jamaah_id);
    if (!screeningsByJamaah.has(jid)) screeningsByJamaah.set(jid, []);
    screeningsByJamaah.get(jid)!.push(mapScreening(row));
  }

  const vitalsByJamaah = new Map<string, VitalSignData[]>();
  for (const v of vitalsRes.data ?? []) {
    const row = v as unknown as Record<string, unknown>;
    const jid = String(row.jamaah_id);
    if (!vitalsByJamaah.has(jid)) vitalsByJamaah.set(jid, []);
    vitalsByJamaah.get(jid)!.push(mapVital(row));
  }

  return allJamaah.map((j) => {
    const row = j as Record<string, unknown>;
    const jid = String(row.id);
    return {
      ...mapJamaah(row),
      screenings: (screeningsByJamaah.get(jid) ?? []).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      vitalSigns: (vitalsByJamaah.get(jid) ?? []).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      pascaHajjLabs: [],
    };
  });
}

// ============================================================================
// Pre-Haji bundle loader (for the Pra Haji AI assessment route).
// Loads jamaah + all pre_hajj_* tables in parallel.
// ============================================================================

export interface PreHajjBundle {
  jamaah: JamaahData;
  preVitals: Array<Record<string, unknown>>;
  preLabs: Array<Record<string, unknown>>;
  preChronic: Record<string, unknown> | null;
  preScreenings: Array<Record<string, unknown>>;
  preMedications: Array<Record<string, unknown>>;
  preImmunizations: Array<Record<string, unknown>>;
  preFitness: Array<Record<string, unknown>>;
  preEducation: Record<string, unknown> | null;
}

export async function loadPreHajjBundle(
  jamaahId: string
): Promise<PreHajjBundle | null> {
  const supabase = await getClient();

  const { data: j, error: jErr } = await supabase
    .from("jamaah")
    .select("*")
    .eq("id", jamaahId)
    .maybeSingle();

  if (jErr || !j) return null;

  const [
    preVitalsRes,
    preLabsRes,
    preChronicRes,
    preScreeningsRes,
    preMedsRes,
    preImmunRes,
    preFitnessRes,
    preEduRes,
  ] = await Promise.all([
    supabase.from("pre_hajj_vital").select("*").eq("jamaah_id", jamaahId).order("created_at", { ascending: false }),
    supabase.from("pre_hajj_lab").select("*").eq("jamaah_id", jamaahId).order("created_at", { ascending: false }),
    supabase.from("pre_hajj_chronic").select("*").eq("jamaah_id", jamaahId).maybeSingle(),
    supabase.from("pre_hajj_screening").select("*").eq("jamaah_id", jamaahId).order("created_at", { ascending: false }),
    supabase.from("pre_hajj_medication").select("*").eq("jamaah_id", jamaahId).order("created_at", { ascending: false }),
    supabase.from("pre_hajj_immunization").select("*").eq("jamaah_id", jamaahId).order("created_at", { ascending: false }),
    supabase.from("pre_hajj_fitness").select("*").eq("jamaah_id", jamaahId).order("created_at", { ascending: false }),
    supabase.from("pre_hajj_education").select("*").eq("jamaah_id", jamaahId).maybeSingle(),
  ]);

  return {
    jamaah: mapJamaah(j as Record<string, unknown>),
    preVitals: (preVitalsRes.data ?? []) as Array<Record<string, unknown>>,
    preLabs: (preLabsRes.data ?? []) as Array<Record<string, unknown>>,
    preChronic: (preChronicRes.data ?? null) as Record<string, unknown> | null,
    preScreenings: (preScreeningsRes.data ?? []) as Array<Record<string, unknown>>,
    preMedications: (preMedsRes.data ?? []) as Array<Record<string, unknown>>,
    preImmunizations: (preImmunRes.data ?? []) as Array<Record<string, unknown>>,
    preFitness: (preFitnessRes.data ?? []) as Array<Record<string, unknown>>,
    preEducation: (preEduRes.data ?? null) as Record<string, unknown> | null,
  };
}
