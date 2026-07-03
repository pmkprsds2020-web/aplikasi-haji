import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/telemedicine/dashboard — aggregate counts for the doctor dashboard
export async function GET(_req: NextRequest) {
  const totalJamaah = await db.jamaah.count();

  // Rooms with unreadByDoctor > 0
  const unreadRooms = await db.chatRoom.findMany({
    where: { unreadByDoctor: { gt: 0 } },
    select: { jamaahId: true, unreadByDoctor: true },
  });

  // Pending requests
  const pendingReqs = await db.telemedicineRequest.findMany({
    where: { status: "PENDING" },
    select: { id: true, jamaahId: true, category: true, title: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const pendingJamaahIds = Array.from(new Set(pendingReqs.map((r) => r.jamaahId)));

  // High risk jamaah
  const highRisk = await db.jamaah.findMany({
    where: { riskLevel: "MERAH" },
    select: { id: true, nama: true, puskesmas: true },
  });

  // Follow-up = KUNING risk
  const followUp = await db.jamaah.findMany({
    where: { riskLevel: "KUNING" },
    select: { id: true, nama: true, puskesmas: true },
  });

  return NextResponse.json({
    totalJamaah,
    unread: {
      count: unreadRooms.length,
      jamaahIds: unreadRooms.map((r) => r.jamaahId),
    },
    pendingForms: {
      count: pendingReqs.length,
      jamaahIds: pendingJamaahIds,
      items: pendingReqs,
    },
    highRisk: {
      count: highRisk.length,
      jamaahIds: highRisk.map((j) => j.id),
      items: highRisk,
    },
    followUp: {
      count: followUp.length,
      jamaahIds: followUp.map((j) => j.id),
      items: followUp,
    },
    // Online presence is tracked inside the socket.io mini-service (port 3003)
    // and pushed to clients via 'telemedicine:presence' events. Here we return 0
    // as a static placeholder; live online count comes via socket realtime.
    online: { count: 0 },
  });
}
