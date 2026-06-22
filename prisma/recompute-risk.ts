// Recompute risk for all jamaah — jalankan setelah seed
import { db } from "../src/lib/db";
import { computeRiskForJamaah } from "../src/lib/risk";
import {
  serializeJamaah, serializeScreening, serializeVital,
} from "../src/lib/serialize";

async function main() {
  const all = await db.jamaah.findMany({
    include: { screenings: true, vitalSigns: true },
  });
  for (const j of all) {
    const detail = {
      ...serializeJamaah(j),
      screenings: j.screenings.map(serializeScreening),
      vitalSigns: j.vitalSigns.map(serializeVital),
    };
    const { level, summary, flags } = computeRiskForJamaah(detail);
    await db.jamaah.update({
      where: { id: j.id },
      data: { riskLevel: level, riskSummary: summary },
    });
    console.log(`${j.nama} → ${level} (${flags.length} flag)`);
  }
  console.log("✅ Risk recomputed for", all.length, "jamaah");
}

main().finally(() => db.$disconnect());
