import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  ALERT_RULES,
  type AlertLevel,
  type ChatMessageType,
  type ChatSenderType,
} from "@/lib/telemedicine-types";

// ===== Helpers =====

const numOrUndefined = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const matchesRule = (value: number, threshold: number, cond: string): boolean => {
  switch (cond) {
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    case ">":  return value > threshold;
    case "<":  return value < threshold;
    default:   return false;
  }
};

// ===== Row shapes (snake_case from Supabase) =====

interface ChatRoomRow {
  id: string;
  jamaah_id: string;
  doctor_id: string;
  last_message_at: string;
  unread_by_doctor: number;
  unread_by_jamaah: number;
  created_at: string;
}

interface ChatMessageRow {
  id: string;
  room_id: string;
  sender_type: string;
  sender_name: string | null;
  type: string;
  content: string;
  attachment_url: string | null;
  attachment_name: string | null;
  request_id: string | null;
  read_by_doctor: boolean;
  read_by_jamaah: boolean;
  created_at: string;
}

interface TelemedicineRequestRow {
  id: string;
  room_id: string;
  jamaah_id: string;
  category: string;
  sub_type: string | null;
  title: string;
  fields: string;
  status: string;
  scheduled_for: string | null;
  submitted_at: string | null;
  response: string | null;
  skor: string | null;
  hari_ke: number | null;
  created_at: string;
}

interface VitalSignRow {
  id: string;
  jamaah_id: string;
  td_sistolik: number | null;
  td_diastolik: number | null;
  nadi: number | null;
  rr: number | null;
  suhu: number | null;
  spo2: number | null;
  berat_badan: number | null;
  gula_darah: number | null;
  hari_ke: number;
  catatan: string | null;
  created_at: string;
}

interface ScreeningRow {
  id: string;
  jamaah_id: string;
  jenis: string;
  data: string;
  skor: string | null;
  catatan: string | null;
  hari_ke: number;
  created_at: string;
}

interface JamaahRow {
  id: string;
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
}

interface TelemedicineAiSummaryRow {
  id: string;
  jamaah_id: string;
  room_id: string;
  ringkasan: string;
  soap: string | null;
  assessment: string | null;
  plan: string | null;
  prioritas: string | null;
  rekomendasi: string | null;
  alerts: string | null;
  created_at: string;
}

// ===== Inline serializers =====

function serializeChatRoom(r: ChatRoomRow) {
  return {
    id: r.id,
    jamaahId: r.jamaah_id,
    doctorId: r.doctor_id,
    lastMessageAt: r.last_message_at,
    unreadByDoctor: r.unread_by_doctor,
    unreadByJamaah: r.unread_by_jamaah,
    createdAt: r.created_at,
  };
}

function serializeChatMessage(m: ChatMessageRow) {
  return {
    id: m.id,
    roomId: m.room_id,
    senderType: m.sender_type as ChatSenderType,
    senderName: m.sender_name,
    type: m.type as ChatMessageType,
    content: m.content,
    attachmentUrl: m.attachment_url,
    attachmentName: m.attachment_name,
    requestId: m.request_id,
    readByDoctor: m.read_by_doctor,
    readByJamaah: m.read_by_jamaah,
    createdAt: m.created_at,
  };
}

function serializeVital(v: VitalSignRow) {
  return {
    id: v.id,
    jamaahId: v.jamaah_id,
    tdSistolik: v.td_sistolik,
    tdDiastolik: v.td_diastolik,
    nadi: v.nadi,
    rr: v.rr,
    suhu: v.suhu,
    spo2: v.spo2,
    beratBadan: v.berat_badan,
    gulaDarah: v.gula_darah,
    hariKe: v.hari_ke,
    catatan: v.catatan,
    createdAt: v.created_at,
  };
}

function serializeScreening(s: ScreeningRow) {
  let parsed: Record<string, unknown> = {};
  try {
    if (s.data) parsed = JSON.parse(s.data);
  } catch {
    parsed = {};
  }
  return {
    id: s.id,
    jamaahId: s.jamaah_id,
    jenis: s.jenis,
    data: parsed,
    skor: s.skor,
    catatan: s.catatan,
    hariKe: s.hari_ke,
    createdAt: s.created_at,
  };
}

function serializeJamaah(j: JamaahRow) {
  return {
    id: j.id,
    nama: j.nama,
    nik: j.nik,
    kloter: j.kloter,
    porsi: j.porsi,
    usia: j.usia,
    kelamin: j.kelamin as "L" | "P",
    alamat: j.alamat,
    hp: j.hp,
    kontakKeluarga: j.kontak_keluarga,
    tanggalTiba: j.tanggal_tiba,
    bandara: j.bandara,
    kabupatenKota: j.kabupaten_kota,
    puskesmas: j.puskesmas,
    dokterKeluarga: j.dokter_keluarga,
    riskLevel: j.risk_level as any,
    riskSummary: j.risk_summary,
    createdAt: j.created_at,
    updatedAt: j.updated_at,
    paspor: j.paspor,
    embarkasi: j.embarkasi,
    golDarah: j.gol_darah,
    riwayatPenyakit: j.riwayat_penyakit,
    riwayatOperasi: j.riwayat_operasi,
    alergi: j.alergi,
    obatRutin: j.obat_rutin,
    statusIstithaah: j.status_istithaah,
    tanggalBerangkat: j.tanggal_berangkat,
    tanggalPulang: j.tanggal_pulang,
  };
}

function serializeAiSummary(a: TelemedicineAiSummaryRow) {
  let rekomendasi: Array<{ kategori: string; tindakan: string; urutan: number }> | null = null;
  if (a.rekomendasi !== null && a.rekomendasi !== undefined) {
    try {
      const p = JSON.parse(a.rekomendasi);
      if (Array.isArray(p)) {
        rekomendasi = p.map((r: Record<string, unknown>) => ({
          kategori: String(r?.kategori ?? ""),
          tindakan: String(r?.tindakan ?? ""),
          urutan: Number(r?.urutan ?? 0),
        }));
      }
    } catch {
      rekomendasi = null;
    }
  }
  let alerts: Array<{ level: AlertLevel; detail: string }> | null = null;
  if (a.alerts !== null && a.alerts !== undefined) {
    try {
      const p = JSON.parse(a.alerts);
      if (Array.isArray(p)) {
        alerts = p.map((r: Record<string, unknown>) => ({
          level: (r?.level as AlertLevel) ?? "YELLOW",
          detail: String(r?.detail ?? ""),
        }));
      }
    } catch {
      alerts = null;
    }
  }
  return {
    id: a.id,
    jamaahId: a.jamaah_id,
    roomId: a.room_id,
    ringkasan: a.ringkasan,
    soap: a.soap,
    assessment: a.assessment,
    plan: a.plan,
    prioritas: a.prioritas,
    rekomendasi,
    alerts,
    createdAt: a.created_at,
  };
}

// ===== POST: Generate AI summary =====

// POST /api/telemedicine/rooms/[jamaahId]/ai-summary
// Generate AI summary from chat + clinical data
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  const { jamaahId } = await params;
  const supabase = createAdminClient();

  try {
    // Parallel fetches: jamaah, chat_room, vital_sign, screening
    const [jamaahRes, roomRes, vitalRes, screeningRes] = await Promise.all([
      supabase.from("jamaah").select("*").eq("id", jamaahId).maybeSingle(),
      supabase.from("chat_room").select("*").eq("jamaah_id", jamaahId).maybeSingle(),
      supabase
        .from("vital_sign")
        .select("*")
        .eq("jamaah_id", jamaahId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("screening")
        .select("*")
        .eq("jamaah_id", jamaahId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (jamaahRes.error) {
      console.error("[ai-summary POST] jamaah select error:", jamaahRes.error);
    }
    if (roomRes.error) {
      console.error("[ai-summary POST] room select error:", roomRes.error);
    }
    if (vitalRes.error) {
      console.error("[ai-summary POST] vital select error:", vitalRes.error);
    }
    if (screeningRes.error) {
      console.error("[ai-summary POST] screening select error:", screeningRes.error);
    }

    const jamaah = jamaahRes.data as JamaahRow | null;

    // Upsert room if missing (never 404)
    let room: ChatRoomRow;
    if (roomRes.data) {
      room = roomRes.data as ChatRoomRow;
    } else {
      const now = new Date().toISOString();
      const { data: newRoom, error: newRoomErr } = await supabase
        .from("chat_room")
        .insert({
          jamaah_id: jamaahId,
          doctor_id: "dokter-1",
          last_message_at: now,
          unread_by_doctor: 0,
          unread_by_jamaah: 0,
        } as never)
        .select("*")
        .single();
      if (newRoomErr || !newRoom) {
        console.error("[ai-summary POST] room insert error:", newRoomErr);
        return NextResponse.json(
          {
            summary: null,
            error: newRoomErr?.message ?? "Gagal membuat room",
          },
          { status: 200 }
        );
      }
      room = newRoom as ChatRoomRow;
    }

    // Fetch chat_message (last 30)
    const { data: msgRows, error: msgErr } = await supabase
      .from("chat_message")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (msgErr) console.error("[ai-summary POST] message select error:", msgErr);

    const messages = (Array.isArray(msgRows) ? (msgRows as ChatMessageRow[]) : [])
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-30)
      .map((m) => ({
        senderType: m.sender_type,
        type: m.type,
        content: m.content,
        createdAt: m.created_at,
      }));

    const vitalRows = (vitalRes.data ?? []) as VitalSignRow[];
    const screeningRows = (screeningRes.data ?? []) as ScreeningRow[];

    const latestVital = vitalRows[0] ? serializeVital(vitalRows[0]) : null;

    // Latest screening per jenis
    const latestScreenings: Record<string, unknown> = {};
    for (const s of screeningRows) {
      if (!latestScreenings[s.jenis]) {
        latestScreenings[s.jenis] = serializeScreening(s);
      }
    }

    // Pending forms
    const { data: pendingRows, error: pendingErr } = await supabase
      .from("telemedicine_request")
      .select("id, category, sub_type, title, hari_ke, created_at")
      .eq("room_id", room.id)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(10);
    if (pendingErr) console.error("[ai-summary POST] pending select error:", pendingErr);

    const pendingForms = (Array.isArray(pendingRows) ? pendingRows : []).map((p: any) => ({
      id: p.id,
      category: p.category,
      subType: p.sub_type,
      title: p.title,
      hariKe: p.hari_ke,
      createdAt: p.created_at,
    }));

    const context = {
      jamaah: jamaah ? serializeJamaah(jamaah) : null,
      recentMessages: messages,
      latestVital,
      latestScreenings: Object.values(latestScreenings),
      pendingForms,
    };

    const systemPrompt =
      "Anda adalah dokter keluarga senior menganalisis sesi telemedicine jamaah haji. Baca percakapan, keluhan, TTV, skrining, dan obat. Jawab HANYA JSON valid.";

    const userPrompt = `Analisis sesi telemedicine jamaah berikut. Konteks (JSON):

${JSON.stringify(context, null, 2)}

Berikan respons dalam format JSON PERSIS seperti ini:
{
  "ringkasan": "Ringkasan kondisi jamaah berdasarkan percakapan & data klinis (3-5 kalimat).",
  "soap": "Catatan SOAP (Subjective, Objective, Assessment, Plan).",
  "assessment": "Diagnosis kerja / masalah aktif.",
  "plan": "Rencana tindak lanjut (pemeriksaan, obat, edukasi, rujukan).",
  "prioritas": "URGENT" | "TINGGI" | "SEDANG" | "RUTIN",
  "rekomendasi": [
    { "kategori": "Medis|Kronis|Mental|Nutrisi|Aktivitas|Edukasi|Rujukan|Monitoring", "tindakan": "...", "urutan": 1 }
  ],
  "alerts": [
    { "level": "RED" | "ORANGE" | "YELLOW", "detail": "..." }
  ]
}

Pertimbangkan: keluhan aktif dari chat, TTV terbaru (SpO₂<94, suhu≥38, TD≥180/110, GDS≥250 atau <60, nadi>120, RR≥25 = merah), hasil skrining (mental, frailty, risiko jatuh, nutrisi), kepatuhan obat, dan form pending yang belum diisi. Gunakan bahasa Indonesia medis.`;

    const fallbackRingkasan = "Analisis AI tidak tersedia.";

    // Rule-based fallback alerts (in case LLM fails)
    const ruleAlerts: Array<{ level: AlertLevel; detail: string }> = [];
    if (latestVital) {
      const vitalMap = latestVital as unknown as Record<string, unknown>;
      for (const rule of ALERT_RULES) {
        const v = numOrUndefined(vitalMap[rule.param]);
        if (v === undefined) continue;
        if (matchesRule(v, rule.threshold, rule.condition)) {
          ruleAlerts.push({ level: rule.level, detail: rule.message });
        }
      }
    }

    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        thinking: { type: "disabled" },
      });
      const raw = completion.choices[0]?.message?.content ?? "";

      let parsed: {
        ringkasan?: string;
        soap?: string | null;
        assessment?: string | null;
        plan?: string | null;
        prioritas?: string | null;
        rekomendasi?: unknown;
        alerts?: unknown;
      } = {};
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      try {
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
      } catch {
        parsed = {};
      }

      const ringkasan =
        typeof parsed.ringkasan === "string" && parsed.ringkasan.trim()
          ? parsed.ringkasan
          : fallbackRingkasan;
      const soap = typeof parsed.soap === "string" ? parsed.soap : null;
      const assessment = typeof parsed.assessment === "string" ? parsed.assessment : null;
      const plan = typeof parsed.plan === "string" ? parsed.plan : null;
      const prioritasRaw =
        typeof parsed.prioritas === "string" ? parsed.prioritas.toUpperCase() : "RUTIN";
      const prioritas =
        prioritasRaw === "URGENT" || prioritasRaw === "TINGGI" ||
        prioritasRaw === "SEDANG" || prioritasRaw === "RUTIN"
          ? prioritasRaw
          : "RUTIN";

      const rekomendasi = Array.isArray(parsed.rekomendasi)
        ? parsed.rekomendasi.map((r: Record<string, unknown>) => ({
            kategori: String(r?.kategori ?? ""),
            tindakan: String(r?.tindakan ?? ""),
            urutan: Number(r?.urutan ?? 0),
          }))
        : [];

      let alerts: Array<{ level: AlertLevel; detail: string }> = [];
      if (Array.isArray(parsed.alerts)) {
        alerts = parsed.alerts
          .map((a: Record<string, unknown>) => {
            const lv = String(a?.level ?? "").toUpperCase();
            const level: AlertLevel =
              lv === "RED" || lv === "ORANGE" || lv === "YELLOW" ? lv : "YELLOW";
            return { level, detail: String(a?.detail ?? "") };
          })
          .filter((a: { detail: string }) => a.detail.length > 0);
      }
      // Merge rule-based alerts if LLM missed any obvious ones
      if (ruleAlerts.length && alerts.length === 0) alerts = ruleAlerts;

      const { data: created, error: insErr } = await supabase
        .from("telemedicine_ai_summary")
        .insert({
          jamaah_id: jamaahId,
          room_id: room.id,
          ringkasan,
          soap,
          assessment,
          plan,
          prioritas,
          rekomendasi: JSON.stringify(rekomendasi),
          alerts: JSON.stringify(alerts),
        } as never)
        .select("*")
        .single();

      if (insErr || !created) {
        console.error("[ai-summary POST] insert error:", insErr);
        return NextResponse.json(
          { summary: null, error: insErr?.message ?? "Gagal menyimpan ringkasan" },
          { status: 200 }
        );
      }

      return NextResponse.json({
        summary: serializeAiSummary(created as TelemedicineAiSummaryRow),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memanggil AI";
      const { data: created, error: insErr } = await supabase
        .from("telemedicine_ai_summary")
        .insert({
          jamaah_id: jamaahId,
          room_id: room.id,
          ringkasan: fallbackRingkasan,
          soap: null,
          assessment: null,
          plan: null,
          prioritas: ruleAlerts.some((a) => a.level === "RED") ? "URGENT" : "RUTIN",
          rekomendasi: JSON.stringify([]),
          alerts: JSON.stringify(ruleAlerts),
        } as never)
        .select("*")
        .single();

      if (insErr || !created) {
        console.error("[ai-summary POST] fallback insert error:", insErr);
        return NextResponse.json(
          { summary: null, error: msg },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          summary: serializeAiSummary(created as TelemedicineAiSummaryRow),
          error: msg,
        },
        { status: 200 }
      );
    }
  } catch (e) {
    console.error("[ai-summary POST] unhandled error:", e);
    return NextResponse.json(
      {
        summary: null,
        error: e instanceof Error ? e.message : "Internal error",
      },
      { status: 200 }
    );
  }
}

// ===== GET: Fetch latest saved summary =====

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  const { jamaahId } = await params;
  const supabase = createAdminClient();

  try {
    // Parallel: latest summary + chat_room (for serialization) + recent messages
    const [summaryRes, roomRes] = await Promise.all([
      supabase
        .from("telemedicine_ai_summary")
        .select("*")
        .eq("jamaah_id", jamaahId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("chat_room")
        .select("*")
        .eq("jamaah_id", jamaahId)
        .maybeSingle(),
    ]);

    if (summaryRes.error) console.error("[ai-summary GET] summary select error:", summaryRes.error);
    if (roomRes.error) console.error("[ai-summary GET] room select error:", roomRes.error);

    const summaryRow = summaryRes.data as TelemedicineAiSummaryRow | null;
    const roomRow = roomRes.data as ChatRoomRow | null;

    // Recent messages (only if room exists)
    let messages: ReturnType<typeof serializeChatMessage>[] = [];
    if (roomRow) {
      const { data: msgRows, error: msgErr } = await supabase
        .from("chat_message")
        .select("*")
        .eq("room_id", roomRow.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (msgErr) console.error("[ai-summary GET] messages select error:", msgErr);
      messages = (Array.isArray(msgRows) ? (msgRows as ChatMessageRow[]) : []).map(serializeChatMessage);
    }

    return NextResponse.json({
      summary: summaryRow ? serializeAiSummary(summaryRow) : null,
      room: roomRow ? serializeChatRoom(roomRow) : null,
      messages,
    });
  } catch (e) {
    console.error("[ai-summary GET] unhandled error:", e);
    return NextResponse.json(
      {
        summary: null,
        room: null,
        messages: [],
        error: e instanceof Error ? e.message : "Internal error",
      },
      { status: 200 }
    );
  }
}
