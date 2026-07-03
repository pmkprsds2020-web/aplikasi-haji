import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeTelemedicineTemplate } from "@/lib/serialize";
import { DEFAULT_TEMPLATES } from "@/lib/telemedicine-types";

// GET /api/telemedicine/templates — list all templates, seed defaults if empty
export async function GET(_req: NextRequest) {
  const count = await db.telemedicineTemplate.count();
  if (count === 0) {
    await db.telemedicineTemplate.createMany({
      data: DEFAULT_TEMPLATES.map((t) => ({
        title: t.title,
        category: t.category,
        content: t.content,
      })),
    });
  }

  const templates = await db.telemedicineTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ templates: templates.map(serializeTelemedicineTemplate) });
}
