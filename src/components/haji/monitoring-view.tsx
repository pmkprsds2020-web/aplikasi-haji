"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock, CheckCircle2, Circle, AlertCircle, ChevronRight,
  Clock,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { MONITORING_SCHEDULE, SCREENING_META } from "@/lib/screening-meta";
import { RISK_STYLE, hariSejak, formatTanggal, initials } from "@/lib/format";
import { RiskBadge, getIcon, EmptyState } from "./shared";
import type { JamaahData, JenisSkrining } from "@/lib/types";

interface ListItem extends JamaahData {
  screeningCount: number;
}

export function MonitoringView() {
  const { goDetail, refreshKey } = useApp();
  const [list, setList] = React.useState<ListItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jamaah");
      const { jamaah } = await res.json();
      setList(jamaah as ListItem[]);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  // For milestone progress, we'd need screening hariKe per jamaah.
  // Fetch detail counts via the list — but we only have screeningCount.
  // We'll show due status based on hariSejak(tiba).
  const milestones = MONITORING_SCHEDULE;

  function milestoneStatus(j: ListItem, hari: number): "due" | "upcoming" | "done-approx" {
    const h = hariSejak(j.tanggalTiba);
    if (h >= hari) return "due";
    return "upcoming";
  }

  // count due per milestone
  const dueCounts = milestones.map((m) => ({
    ...m,
    due: list.filter((j) => milestoneStatus(j, m.hariKe) === "due").length,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Monitoring Berkala</h1>
        <p className="text-sm text-muted-foreground">
          Jadwal monitoring pasca kepulangan — Hari 1 · 7 · 14 · 30 sesuai pedoman Kemenkes
        </p>
      </div>

      {/* Milestone timeline */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dueCounts.map((m, idx) => (
          <Card key={m.hariKe} className="relative overflow-hidden">
            <div className="absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full bg-primary/5" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold">
                  {m.hariKe}
                </span>
                <div>
                  <CardTitle className="text-base">{m.judul}</CardTitle>
                  <CardDescription className="text-xs">{m.kegiatan}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-muted-foreground">{m.deskripsi}</p>
              <div className="mb-3 flex flex-wrap gap-1">
                {m.fokus.map((f) => {
                  const meta = SCREENING_META[f as JenisSkrining];
                  const Icon = getIcon(meta.icon);
                  return (
                    <span key={f} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs">
                      <Icon className="h-3 w-3 text-primary" /> {meta.judul.split(" ")[0]}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-accent/40 px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Jatuh tempo
                </span>
                <Badge variant="secondary" className="text-xs">{m.due} jamaah</Badge>
              </div>
            </CardContent>
            {idx < milestones.length - 1 && (
              <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-muted-foreground/40 lg:block">
                <ChevronRight className="h-5 w-5" />
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Progress table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary" /> Status Monitoring per Jamaah
          </CardTitle>
          <CardDescription className="text-xs">
            Centang hijau = sudah lewat jadwal (perlu dipantau). Klik baris untuk detail & input skrining.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : list.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Belum ada jamaah" />
          ) : (
            <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium">Jamaah</th>
                    <th className="px-2 py-2 text-center font-medium">Hari 1</th>
                    <th className="px-2 py-2 text-center font-medium">Hari 7</th>
                    <th className="px-2 py-2 text-center font-medium">Hari 14</th>
                    <th className="px-2 py-2 text-center font-medium">Hari 30</th>
                    <th className="px-3 py-2 text-right font-medium">Risiko</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((j) => {
                    const h = hariSejak(j.tanggalTiba);
                    return (
                      <tr
                        key={j.id}
                        onClick={() => goDetail(j.id)}
                        className="cursor-pointer border-b border-border/40 transition hover:bg-accent/30"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${RISK_STYLE[j.riskLevel].bg} ${RISK_STYLE[j.riskLevel].text}`}>
                              {initials(j.nama)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{j.nama}</p>
                              <p className="text-xs text-muted-foreground">Tiba {formatTanggal(j.tanggalTiba)} · {h}h lalu</p>
                            </div>
                          </div>
                        </td>
                        {milestones.map((m) => {
                          const status = milestoneStatus(j, m.hariKe);
                          return (
                            <td key={m.hariKe} className="px-2 py-2 text-center">
                              {status === "due" ? (
                                <span className="inline-flex items-center justify-center" title="Jatuh tempo — perlu pemantauan">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center" title="Belum jatuh tempo">
                                  <Circle className="h-4 w-4 text-muted-foreground/30" />
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right">
                          <RiskBadge level={j.riskLevel} withDot={false} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert banner for overdue */}
      {!loading && list.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">Peringatan Dini Monitoring</p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                Pastikan seluruh jamaah yang telah melewati jadwal Hari 1, 7, 14, dan 30 mendapatkan skrining sesuai modul fokus.
                Jamaah berisiko merah ({" "}
                <strong>{list.filter((j) => j.riskLevel === "MERAH").length}</strong> orang) menjadi prioritas home visit.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
