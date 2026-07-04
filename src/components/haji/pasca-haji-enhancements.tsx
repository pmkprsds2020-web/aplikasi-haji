"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import type { JamaahDetail, RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  jamaah: JamaahDetail;
}

const MILESTONES = [1, 7, 14, 30, 90];

// Status milestone berdasarkan ada/tidaknya data pada hariKe tersebut
function milestoneStatus(jamaah: JamaahDetail, hari: number): "done" | "due" | "upcoming" {
  const hasVital = jamaah.vitalSigns.some((v) => v.hariKe === hari);
  const hasScreening = jamaah.screenings.some((s) => s.hariKe === hari);
  const hariPasca = Math.floor((Date.now() - new Date(jamaah.tanggalTiba).getTime()) / 86400000);
  if (hasVital || hasScreening) return "done";
  if (hariPasca >= hari) return "due";
  return "upcoming";
}

// Level risiko pada milestone tertentu (berdasarkan TTV & screening hari itu)
function milestoneRisk(jamaah: JamaahDetail, hari: number): RiskLevel | null {
  const v = jamaah.vitalSigns.find((x) => x.hariKe === hari);
  if (!v) return null;
  const flags: string[] = [];
  if (v.spo2 != null && v.spo2 < 94) flags.push("r");
  if (v.suhu != null && v.suhu >= 38) flags.push("r");
  if (v.tdSistolik != null && v.tdSistolik >= 180) flags.push("r");
  if (v.gulaDarah != null && (v.gulaDarah >= 250 || v.gulaDarah < 60)) flags.push("r");
  if (flags.length) return "MERAH";
  if (v.spo2 != null && v.spo2 < 96) return "KUNING";
  if (v.tdSistolik != null && v.tdSistolik >= 140) return "KUNING";
  if (v.gulaDarah != null && v.gulaDarah >= 180) return "KUNING";
  return "HIJAU";
}

const RISK_COLOR: Record<RiskLevel, string> = {
  MERAH: "#f43f5e", KUNING: "#f59e0b", HIJAU: "#10b981",
};

export function PascaTimeline({ jamaah }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Timeline Monitoring Pasca Haji</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2">
          {MILESTONES.map((hari, idx) => {
            const status = milestoneStatus(jamaah, hari);
            const risk = milestoneRisk(jamaah, hari);
            return (
              <div
                key={hari}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center",
                  status === "done" && risk === "MERAH" && "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
                  status === "done" && risk === "KUNING" && "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
                  status === "done" && risk === "HIJAU" && "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
                  status === "done" && !risk && "border-primary/30 bg-primary/5",
                  status === "due" && "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20",
                  status === "upcoming" && "border-border bg-muted/30"
                )}
              >
                {idx < MILESTONES.length - 1 && (
                  <div className="absolute -right-[5px] top-1/2 hidden h-px w-2.5 -translate-y-1/2 bg-border sm:block" />
                )}
                <span className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  status === "done" ? "bg-primary text-primary-foreground" : status === "due" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {hari}
                </span>
                <span className="text-[10px] font-medium">Hari {hari}</span>
                <span className="flex items-center justify-center">
                  {status === "done" ? (
                    risk ? (
                      <span className={cn("h-2 w-2 rounded-full")} style={{ backgroundColor: RISK_COLOR[risk] }} />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    )
                  ) : status === "due" ? (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {status === "done" ? "Selesai" : status === "due" ? "Jatuh tempo" : "Akan datang"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Stabil</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pemantauan</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Risiko Tinggi</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Grafik perubahan tren pasca haji
// Grafik perubahan tren pasca haji — Risiko per Milestone dihilangkan sesuai permintaan.
// Jika tidak ada data TTV, tidak menampilkan apa-apa.
export function PascaTrendCharts({ jamaah }: Props) {
  const sorted = [...jamaah.vitalSigns].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  if (!sorted.length) {
    return null;
  }
  return null;
}
