import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeChatRoom,
  serializeChatMessage,
  serializeJamaah,
} from "@/lib/serialize";

// GET /api/telemedicine/rooms — daftar semua jamaah + room chat + last message
export async function GET(_req: NextRequest) {
  const jamaahList = await db.jamaah.findMany({
    include: {
      chatRoom: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: [{ riskLevel: "desc" }, { tanggalTiba: "desc" }],
  });

  const rooms = jamaahList.map((j) => {
    const room = j.chatRoom;
    const lastMsg = room?.messages?.[0] ?? null;
    return {
      id: room?.id ?? j.id, // fallback to jamaah id when no room yet
      jamaahId: j.id,
      jamaah: serializeJamaah(j),
      room: room ? serializeChatRoom(room) : null,
      lastMessage: lastMsg ? serializeChatMessage(lastMsg) : null,
      lastMessageAt: room?.lastMessageAt ? room.lastMessageAt.toISOString() : j.createdAt.toISOString(),
      unreadByDoctor: room?.unreadByDoctor ?? 0,
      unreadByJamaah: room?.unreadByJamaah ?? 0,
    };
  });

  // Sort: rooms with unreadByDoctor > 0 first, then by lastMessageAt desc,
  // then jamaah without room by riskLevel desc (already pre-sorted by risk).
  const withRoom = rooms.filter((r) => r.room !== null);
  const withoutRoom = rooms.filter((r) => r.room === null);

  withRoom.sort((a, b) => {
    const ua = a.unreadByDoctor > 0 ? 1 : 0;
    const ub = b.unreadByDoctor > 0 ? 1 : 0;
    if (ua !== ub) return ub - ua;
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({ rooms: [...withRoom, ...withoutRoom] });
}
