import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeChatMessage,
  serializeTelemedicineRequest,
  recomputeAndSaveRisk,
} from "@/lib/serialize";
import { broadcastTelemedicine } from "@/lib/telemedicine-broadcast";
import {
  ALERT_RULES,
  TTV_PARAMS,
  type AlertLevel,
  type AlertRule,
  type ChatMessageType,
} from "@/lib/telemedicine-types";

// ===== Helpers =====

const numOrUndefined = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const matchesRule = (value: number, rule: AlertRule): boolean => {
  switch (rule.condition) {
    case ">=": return value >= rule.threshold;
    case "<=": return value <= rule.threshold;
    case ">":  return value > rule.threshold;
    case "<":  return value < rule.threshold;
    default:   return false;
  }
};

const alertEmoji = (level: AlertLevel): string =>
  level === "RED" ? "🔴" : level === "ORANGE" ? "🟠" : "🟡";

function summarizeTtvResponse(response: Record<string, unknown>): string {
  const parts: string[] = [];
  const tdS = numOrUndefined(response.tdSistolik);
  const tdD = numOrUndefined(response.tdDiastolik);
  if (tdS !== undefined && tdD !== undefined) parts.push(`TD ${tdS}/${tdD}`);
  else if (tdS !== undefined) parts.push(`TD ${tdS}`);
  for (const p of TTV_PARAMS) {
    if (p.key === "tdSistolik" || p.key === "tdDiastolik") continue;
    const v = numOrUndefined(response[p.key]);
    if (v !== undefined) parts.push(`${p.label} ${v}${p.unit ? " " + p.unit : ""}`);
  }
  return parts.join(" · ") || "TTV tercatat";
}

// ===== Main handler =====

// POST /api/telemedicine/request/[requestId]/submit
// Body: { response: Record<string, unknown>, skor? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  const body = await req.json();
  const response: Record<string, unknown> =
    body.response && typeof body.response === "object" && !Array.isArray(body.response)
      ? (body.response as Record<string, unknown>)
      : {};
  const skor = typeof body.skor === "string" ? body.skor : (body.skor !== undefined && body.skor !== null ? String(body.skor) : null);

  const request = await db.telemedicineRequest.findUnique({
    where: { id: requestId },
    include: { room: true },
  });
  if (!request) {
    return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
  }

  // Update request as SUBMITTED
  await db.telemedicineRequest.update({
    where: { id: requestId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      response: JSON.stringify(response),
      skor,
    },
  });

  const roomId = request.roomId;
  const jamaahId = request.jamaahId;
  const hariKe = request.hariKe ?? 1;
  const newMessages: ReturnType<typeof serializeChatMessage>[] = [];
  const alerts: Array<{ level: AlertLevel; detail: string; param: string }> = [];

  // ===== Write to clinical table based on category =====

  if (request.category === "TTV") {
    // Parse subType as comma-separated TTV keys
    const keys = (request.subType ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const data: Record<string, number | null> = {};
    for (const k of keys) {
      const v = numOrUndefined(response[k]);
      if (v !== undefined) data[k] = v;
    }

    // Only the fields that exist on the pasca VitalSign model
    await db.vitalSign.create({
      data: {
        jamaahId,
        tdSistolik:  data.tdSistolik    !== undefined ? data.tdSistolik    : null,
        tdDiastolik: data.tdDiastolik   !== undefined ? data.tdDiastolik   : null,
        nadi:        data.nadi          !== undefined ? data.nadi          : null,
        rr:          data.rr            !== undefined ? data.rr            : null,
        suhu:        data.suhu          !== undefined ? data.suhu          : null,
        spo2:        data.spo2          !== undefined ? data.spo2          : null,
        beratBadan:  data.beratBadan    !== undefined ? data.beratBadan    : null,
        gulaDarah:   data.gulaDarah     !== undefined ? data.gulaDarah     : null,
        hariKe,
        catatan: `Telemedicine: ${request.title}`,
      },
    });
    await recomputeAndSaveRisk(jamaahId);
  } else if (request.category === "SKRINING") {
    const jenis = request.subType ?? "FOLLOWUP";
    await db.screening.create({
      data: {
        jamaahId,
        jenis,
        data: JSON.stringify(response),
        skor: skor ?? null,
        catatan: `Telemedicine: ${request.title}`,
        hariKe,
      },
    });
    await recomputeAndSaveRisk(jamaahId);
  } else if (request.category === "DAILY_COMPLAINT") {
    await db.screening.create({
      data: {
        jamaahId,
        jenis: "FOLLOWUP",
        data: JSON.stringify(response),
        skor: skor ?? null,
        catatan: `Telemedicine harian: ${request.title}`,
        hariKe,
      },
    });
    await recomputeAndSaveRisk(jamaahId);
  } else if (request.category === "CHRONIC") {
    const fieldMap: Record<string, string> = {
      HIPERTENSI: "hipertensi",
      DIABETES:   "diabetes",
      PPOK:       "ppok",
      CKD:        "ckd",
      JANTUNG:    "jantung",
      STROKE:     "stroke",
      KANKER:     "kanker",
    };
    const field = fieldMap[(request.subType ?? "").toUpperCase()] ?? null;
    const keluhanRaw = response.keluhan ?? response.keluhanAktif ?? response.gejala;
    const hasIssue =
      (typeof keluhanRaw === "string" && keluhanRaw.trim().length > 0) ||
      (typeof keluhanRaw === "boolean" && keluhanRaw === true);
    const status = hasIssue ? "Tidak Terkontrol" : "Terkontrol";

    if (field) {
      await db.preHajjChronic.upsert({
        where: { jamaahId },
        create: {
          jamaahId,
          [field]: status,
          targetTerapi: JSON.stringify(response),
        },
        update: {
          [field]: status,
          targetTerapi: JSON.stringify(response),
        },
      });
    }
  } else if (request.category === "EDUKASI") {
    const st = (request.subType ?? "").toLowerCase();
    const fieldMap: Record<string, string> = {
      diet: "diet",
      aktivitas: "aktivitas",
      obat: "obat",
      hidrasi: "hidrasi",
      istirahat: "istirahat",
      manajemenkronis: "manajemenKronis",
      "manajemen-kronis": "manajemenKronis",
      persiapanperjalanan: "persiapanPerjalanan",
      persiapan: "persiapanPerjalanan",
    };
    const field = fieldMap[st];
    if (field) {
      await db.preHajjEducation.upsert({
        where: { jamaahId },
        create: {
          jamaahId,
          [field]: true,
          catatan: `Edukasi via telemedicine: ${request.title}`,
        },
        update: {
          [field]: true,
          catatan: `Edukasi via telemedicine: ${request.title}`,
        },
      });
    }
  }
  // OBAT category: no clinical write (informational chat message only)

  // ===== Result ChatMessage =====

  let resultType: ChatMessageType = "TEXT";
  let resultContent = "Form terkirim";
  if (request.category === "TTV") {
    resultType = "TTV_RESULT";
    resultContent = summarizeTtvResponse(response);
  } else if (request.category === "SKRINING") {
    resultType = "SKRINING_RESULT";
    const skorStr = skor ? ` (skor: ${skor})` : "";
    resultContent = `Skrining ${request.subType ?? ""} terisi${skorStr}`;
  } else if (request.category === "DAILY_COMPLAINT") {
    const keluhanRaw = response.keluhan ?? response.keluhanAktif;
    const keluhan = typeof keluhanRaw === "string" && keluhanRaw.trim() ? keluhanRaw.trim() : null;
    resultContent = keluhan ? `Keluhan: ${keluhan}` : "Tidak ada keluhan hari ini";
  } else if (request.category === "CHRONIC") {
    resultContent = `Monitoring ${request.subType ?? ""} tercatat`;
  } else if (request.category === "EDUKASI") {
    resultContent = `Edukasi ${request.subType ?? ""} diterima`;
  } else if (request.category === "OBAT") {
    resultContent = `Informasi obat diterima`;
  }

  const resultMsg = await db.chatMessage.create({
    data: {
      roomId,
      senderType: "JAMAAH",
      senderName: "Jamaah",
      type: resultType,
      content: resultContent,
      requestId: request.id,
      readByDoctor: true,
      readByJamaah: true,
    },
  });
  newMessages.push(serializeChatMessage(resultMsg));
  await broadcastTelemedicine(jamaahId, "telemedicine:message", { message: serializeChatMessage(resultMsg) });
  await broadcastTelemedicine(jamaahId, "telemedicine:response", {
    jamaahId,
    request: serializeTelemedicineRequest(request),
  });

  // ===== Alert rules (TTV only) =====

  if (request.category === "TTV" || request.category === "DAILY_COMPLAINT") {
    for (const rule of ALERT_RULES) {
      const v = numOrUndefined(response[rule.param]);
      if (v === undefined) continue;
      if (matchesRule(v, rule)) {
        const alert = { level: rule.level, detail: rule.message, param: rule.param };
        alerts.push(alert);

        const alertMsg = await db.chatMessage.create({
          data: {
            roomId,
            senderType: "AI",
            senderName: "AI Klinis",
            type: "ALERT",
            content: `${alertEmoji(rule.level)} ${rule.message}`,
            requestId: request.id,
            readByDoctor: false,
            readByJamaah: true,
          },
        });
        newMessages.push(serializeChatMessage(alertMsg));

        await broadcastTelemedicine(jamaahId, "telemedicine:alert", {
          jamaahId,
          alert: { level: alert.level, detail: alert.detail },
        });
        await broadcastTelemedicine(jamaahId, "telemedicine:message", {
          message: serializeChatMessage(alertMsg),
        });
      }
    }
  }

  // ===== Update room lastMessageAt + unreadByDoctor (JAMAAH/AI msgs are unread by doctor) =====

  const unreadInc = newMessages.filter(
    (m) => (m.senderType === "JAMAAH" || m.senderType === "AI") && !m.readByDoctor
  ).length;
  await db.chatRoom.update({
    where: { id: roomId },
    data: {
      lastMessageAt: new Date(),
      ...(unreadInc > 0 ? { unreadByDoctor: { increment: unreadInc } } : {}),
    },
  });

  // Re-fetch the updated request
  const updatedRequest = await db.telemedicineRequest.findUnique({ where: { id: requestId } });
  if (!updatedRequest) {
    return NextResponse.json({ error: "Request hilang setelah update" }, { status: 500 });
  }

  return NextResponse.json({
    request: serializeTelemedicineRequest(updatedRequest),
    alerts,
    newMessages,
  }, { status: 201 });
}
