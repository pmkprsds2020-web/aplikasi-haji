"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import {
  Users, AlertTriangle, ShieldCheck, Activity, RefreshCw, Plane,
  ChevronRight, Stethoscope, CalendarClock, HeartPulse, Brain, Users as UsersIcon, Sparkles,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { RISK_STYLE, hariSejak, formatTanggal, initials, kelaminLabel } from "@/lib/format";
import { RiskBadge, RiskDot, EmptyState } from "./shared";
import type { JamaahData, RiskLevel } from "@/lib/types";
import { DIMENSI_META, SCREENING_META } from "@/lib/screening-meta";

interface ListItem extends JamaahData {
  screeningCount: number;
}

export function DashboardView() {
  const { goDetail, goJamaahList, goMonitoring, goAI, refreshKey, bumpRefresh } = useApp();
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

  const total = list.length;
  const merah = list.filter((j) => j.riskLevel === "MERAH").length;
  const kuning = list.filter((j) => j.riskLevel === "KUNING").length;
  const hijau = list.filter((j) => j.riskLevel === "HIJAU").length;
  const lansia = list.filter((j) => j.usia >= 60).length;

  const riskData = [
    { name: "Merah (Risiko Tinggi)", value: merah, level: "MERAH" as RiskLevel },
    { name: "Kuning (Pemantauan)", value: kuning, level: "KUNING" as RiskLevel },
    { name: "Hijau (Stabil)", value: hijau, level: "HIJAU" as RiskLevel },
  ].filter((d) => d.value > 0);

  const RISK_COLOR: Record<RiskLevel, string> = {
    MERAH: "#f43f5e", KUNING: "#f59e0b", HIJAU: "#10b981",
  };

  // prioritas home visit = merah dulu
  const prioritas = [...list]
    .filter((j) => j.riskLevel !== "HIJAU")
    .sort((a, b) => (a.riskLevel === "MERAH" ? -1 : 1) - (b.riskLevel === "MERAH" ? -1 : 1))
    .slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Pendekatan Biopsikososial Spiritual
            </div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Dashboard Monitoring Kepulangan Jamaah Haji
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Pantau kesehatan jamaah 14–30 hari pasca kepulangan: deteksi dini penyakit menular,
              kontrol penyakit kronis, frailty lansia, kesehatan mental, spiritual & dukungan keluarga.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={bumpRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="Total Jamaah" value={total} tone="primary" />
        <StatCard icon={AlertTriangle} label="Risiko Tinggi" value={merah} tone="merah" onClick={goJamaahList} />
        <StatCard icon={Activity} label="Perlu Pemantauan" value={kuning} tone="kuning" />
        <StatCard icon={ShieldCheck} label="Stabil" value={hijau} tone="hijau" />
        <StatCard icon={HeartPulse} label="Lansia (≥60 th)" value={lansia} tone="primary" />
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Risk donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribusi Risiko</CardTitle>
              <CardDescription className="text-xs">Kategorisasi AI berbasis aturan medis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                      {riskData.map((d) => (
                        <Cell key={d.level} fill={RISK_COLOR[d.level]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{total}</span>
                  <span className="text-xs text-muted-foreground">Jamaah</span>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {riskData.map((d) => (
                  <div key={d.level} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <RiskDot level={d.level} /> {d.name}
                    </span>
                    <span className="font-semibold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Priority list */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Prioritas Home Visit & Tindak Lanjut</CardTitle>
                  <CardDescription className="text-xs">Jamaah dengan risiko tertinggi untuk kunjungan prioritas</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={goJamaahList} className="text-xs">
                  Lihat semua <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {prioritas.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="Tidak ada prioritas mendesak" desc="Semua jamaah dalam kondisi stabil." />
              ) : (
                <div className="max-h-[260px] divide-y divide-border/60 overflow-y-auto scrollbar-thin">
                  {prioritas.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => goDetail(j.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-accent/40"
                    >
                      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${RISK_STYLE[j.riskLevel].bg} ${RISK_STYLE[j.riskLevel].text}`}>
                        {initials(j.nama)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{j.nama}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {j.usia} th · {kelaminLabel(j.kelamin)} · {j.kloter} · {j.puskesmas}
                        </p>
                      </div>
                      <div className="hidden max-w-[220px] flex-1 truncate sm:block">
                        <p className="truncate text-xs text-muted-foreground">{j.riskSummary}</p>
                      </div>
                      <RiskBadge level={j.riskLevel} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction icon={CalendarClock} title="Monitoring Berkala" desc="Jadwal Hari 1 · 7 · 14 · 30" onClick={goMonitoring} />
        <QuickAction icon={Brain} title="Analisis AI" desc="Ringkasan kondisi & rekomendasi tindak lanjut" onClick={goAI} />
        <QuickAction icon={Stethoscope} title="Data Jamaah" desc="Kelola & skrining seluruh jamaah" onClick={goJamaahList} />
      </div>

      {/* Dimensi biopsikososial spiritual */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cakupan Skrining per Dimensi</CardTitle>
          <CardDescription className="text-xs">
            Pendekatan holistik: Biologis · Psikologis · Sosial · Spiritual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(DIMENSI_META) as Array<keyof typeof DIMENSI_META>).map((dim) => {
              const metas = Object.values(SCREENING_META).filter((m) => m.dimensi === dim);
              const completed = list.filter((j) => j.screeningCount > 0).length;
              return (
                <div key={dim} className="rounded-xl border border-border/70 bg-accent/20 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      {dim === "BIOLOGIS" && <HeartPulse className="h-3.5 w-3.5" />}
                      {dim === "PSIKOLOGIS" && <Brain className="h-3.5 w-3.5" />}
                      {dim === "SOSIAL" && <UsersIcon className="h-3.5 w-3.5" />}
                      {dim === "SPIRITUAL" && <Sparkles className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-sm font-semibold">{DIMENSI_META[dim].label}</span>
                  </div>
                  <ul className="space-y-1">
                    {metas.map((m) => (
                      <li key={m.jenis} className="text-xs text-muted-foreground">• {m.judul}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs font-medium text-primary">
                    {completed} jamaah terpantau
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent arrivals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="h-4 w-4 text-primary" /> Kedatangan Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {[...list]
              .sort((a, b) => new Date(b.tanggalTiba).getTime() - new Date(a.tanggalTiba).getTime())
              .slice(0, 4)
              .map((j) => (
                <button
                  key={j.id}
                  onClick={() => goDetail(j.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-accent/40"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {initials(j.nama)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{j.nama}</p>
                    <p className="text-xs text-muted-foreground">
                      Tiba {formatTanggal(j.tanggalTiba)} · {hariSejak(j.tanggalTiba)} hari lalu · {j.bandara}
                    </p>
                  </div>
                  <RiskBadge level={j.riskLevel} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, tone, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number;
  tone: "primary" | "merah" | "kuning" | "hijau";
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    merah: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300",
    kuning: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
    hijau: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-left transition hover:border-primary/40 hover:shadow-sm ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </button>
  );
}

function QuickAction({
  icon: Icon, title, desc, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; desc: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card p-4 text-left transition hover:border-primary/40 hover:bg-accent/30"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
    </button>
  );
}
