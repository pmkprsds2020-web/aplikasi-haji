import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeChatRoom,
  serializeChatMessage,
  serializeTelemedicineAiSummary,
  serializeVital,
  serializeScreening,
  serializeJamaah,
} from "@/lib/serialize";
import {
  ALERT_RULES,
  type AlertLevel,
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

// POST /api/telemedicine/rooms/[jamaahId]/ai-summary
// Generate AI summary from chat + clinical data
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  const { jamaahId } = await params;

  const jamaah = await db.jamaah.findUnique({
    where: { id: jamaahId },
    include: {
      chatRoom: {
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 30 },
        },
      },
      screenings: { orderBy: { createdAt: "desc" }, take: 20 },
      vitalSigns: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!jamaah) {
    return NextResponse.json({ error: "Jamaah tidak ditemukan" }, { status: 404 });
  }

  // Upsert room if missing (rare path)
  let room = jamaah.chatRoom;
  if (!room) {
    room = await db.chatRoom.create({
      data: { jamaahId, doctorId: "dokter-1" },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 30 } },
    });
  }

  const recentMessages = [...room.messages]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .reverse()
    .slice(0, 30)
    .map((m) => ({
      senderType: m.senderType,
      type: m.type,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));

  const latestVital = jamaah.vitalSigns[0]
    ? serializeVital(jamaah.vitalSigns[0])
    : null;

  // Latest screening per jenis
  const latestScreenings: Record<string, unknown> = {};
  for (const s of jamaah.screenings) {
    if (!latestScreenings[s.jenis]) {
      latestScreenings[s.jenis] = serializeScreening(s);
    }
  }

  // Pending forms
  const pendingForms = await db.telemedicineRequest.findMany({
    where: { roomId: room.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true, category: true, subType: true, title: true,
      hariKe: true, createdAt: true,
    },
  });

  const context = {
    jamaah: serializeJamaah(jamaah),
    recentMessages,
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
    const prioritasRaw = typeof parsed.prioritas === "string" ? parsed.prioritas.toUpperCase() : "RUTIN";
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

    const created = await db.telemedicineAiSummary.create({
      data: {
        jamaahId,
        roomId: room.id,
        ringkasan,
        soap,
        assessment,
        plan,
        prioritas,
        rekomendasi: JSON.stringify(rekomendasi),
        alerts: JSON.stringify(alerts),
      },
    });

    return NextResponse.json({
      summary: serializeTelemedicineAiSummary(created),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memanggil AI";
    const created = await db.telemedicineAiSummary.create({
      data: {
        jamaahId,
        roomId: room.id,
        ringkasan: fallbackRingkasan,
        soap: null,
        assessment: null,
        plan: null,
        prioritas: ruleAlerts.some((a) => a.level === "RED") ? "URGENT" : "RUTIN",
        rekomendasi: JSON.stringify([]),
        alerts: JSON.stringify(ruleAlerts),
      },
    });
    return NextResponse.json(
      {
        summary: serializeTelemedicineAiSummary(created),
        error: msg,
      },
      { status: 200 }
    );
  }
}

// Also expose a GET for fetching the latest saved summary
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jamaahId: string }> }
) {
  const { jamaahId } = await params;
  const room = await db.chatRoom.findUnique({ where: { jamaahId } });
  if (!room) {
    return NextResponse.json({ summary: null });
  }
  const latest = await db.telemedicineAiSummary.findFirst({
    where: { jamaahId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    summary: latest ? serializeTelemedicineAiSummary(latest) : null,
    room: serializeChatRoom(room),
    // include a few recent messages for the panel preview
    messages: (
      await db.chatMessage.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    ).map(serializeChatMessage),
  });
}
