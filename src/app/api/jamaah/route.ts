import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeJamaah, recomputeAndSaveRisk } from "@/lib/serialize";

// GET /api/jamaah — daftar ringkas semua jamaah
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const risk = req.nextUrl.searchParams.get("risk"); // HIJAU|KUNING|MERAH
  const puskesmas = req.nextUrl.searchParams.get("puskesmas");

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { nama: { contains: q } },
      { nik: { contains: q } },
      { kloter: { contains: q } },
      { porsi: { contains: q } },
    ];
  }
  if (risk) where.riskLevel = risk;
  if (puskesmas) where.puskesmas = puskesmas;

  const list = await db.jamaah.findMany({
    where,
    orderBy: [{ riskLevel: "desc" }, { tanggalTiba: "desc" }],
  });

  // Hitung ringkasan skrining per jamaah
  const ids = list.map((j) => j.id);
  const screenings = await db.screening.groupBy({
    by: ["jamaahId", "jenis"],
    where: { jamaahId: { in: ids } },
    _count: { _all: true },
  });
  const counts: Record<string, Set<string>> = {};
  for (const s of screenings) {
    counts[s.jamaahId] ??= new Set();
    counts[s.jamaahId].add(s.jenis);
  }

  return NextResponse.json({
    jamaah: list.map((j) => ({
      ...serializeJamaah(j),
      screeningCount: counts[j.id]?.size ?? 0,
    })),
  });
}

// POST /api/jamaah — tambah jamaah baru
export async function POST(req: NextRequest) {
  const body = await req.json();
  const required = ["nama", "nik", "kloter", "porsi", "usia", "kelamin", "tanggalTiba"];
  for (const f of required) {
    if (body[f] === undefined || body[f] === null || body[f] === "") {
      return NextResponse.json({ error: `Field ${f} wajib diisi` }, { status: 400 });
    }
  }
  try {
    const created = await db.jamaah.create({
      data: {
        nama: body.nama,
        nik: body.nik,
        kloter: body.kloter,
        porsi: body.porsi,
        usia: Number(body.usia),
        kelamin: body.kelamin,
        alamat: body.alamat ?? "",
        hp: body.hp ?? "",
        kontakKeluarga: body.kontakKeluarga ?? "",
        tanggalTiba: new Date(body.tanggalTiba),
        bandara: body.bandara ?? "",
        kabupatenKota: body.kabupatenKota ?? "",
        puskesmas: body.puskesmas ?? "",
        dokterKeluarga: body.dokterKeluarga ?? "",
      },
    });
    await recomputeAndSaveRisk(created.id);
    return NextResponse.json({ jamaah: serializeJamaah(created) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal membuat jamaah";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
