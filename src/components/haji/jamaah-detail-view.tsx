"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Pencil, Activity, Plus, ClipboardList, Stethoscope,
  Phone, MapPin, Calendar, Plane, Users, ChevronRight, Sparkles,
  Brain, Loader2, AlertTriangle, ShieldCheck, History,
} from "lucide-react";
import { useApp } from "@/lib/store";
import {
  RISK_STYLE, formatTanggal, formatTanggalWaktu, hariSejak, initials, kelaminLabel,
} from "@/lib/format";
import { RiskBadge, RiskDot, EmptyState, getIcon, getDimensiIcon } from "./shared";
import { ScreeningDialog } from "./screening-dialog";
import { VitalSignDialog } from "./vital-sign-dialog";
import { VitalSignsChart } from "./vital-signs-chart";
import { JamaahFormDialog } from "./jamaah-form-dialog";
import { SCREENING_META, SCREENING_ORDER, DIMENSI_META } from "@/lib/screening-meta";
import type { JamaahDetail, JenisSkrining, RiskLevel, RiskFlag } from "@/lib/types";

export function JamaahDetailView() {
  const { selectedJamaahId, goJamaahList, goAI, detailTab, setDetailTab, refreshKey, bumpRefresh } = useApp();
  const [detail, setDetail] = React.useState<JamaahDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [riskFlags, setRiskFlags] = React.useState<RiskFlag[]>([]);
  const [screeningOpen, setScreeningOpen] = React.useState<JenisSkrining | null>(null);
  const [vitalOpen, setVitalOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!selectedJamaahId) return;
    setLoading(true);
    try {
      const [dRes, rRes] = await Promise.all([
        fetch(`/api/jamaah/${selectedJamaahId}`),
        fetch(`/api/jamaah/${selectedJamaahId}/risk`),
      ]);
      const d = await dRes.json();
      setDetail(d.jamaah as JamaahDetail);
      const r = await rRes.json();
      setRiskFlags((r.flags as RiskFlag[]) ?? []);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [selectedJamaahId]);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  // sinkronkan dialog open state dengan screeningOpen
  React.useEffect(() => {
    setDialogOpen(screeningOpen !== null);
  }, [screeningOpen]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!detail) {
    return (
      <Card className="p-6">
        <EmptyState title="Jamaah tidak ditemukan" desc="Data jamaah tidak dapat dimuat." />
        <div className="flex justify-center pb-4">
          <Button onClick={goJamaahList}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
        </div>
      </Card>
    );
  }

  const j = detail;
  const s = RISK_STYLE[j.riskLevel];

  // latest screenings per jenis
  const latestByJenis: Record<string, JamaahDetail["screenings"][number]> = {};
  for (const sc of j.screenings) {
    const ex = latestByJenis[sc.jenis];
    if (!ex || new Date(sc.createdAt) > new Date(ex.createdAt)) latestByJenis[sc.jenis] = sc;
  }
  const latestVital = j.vitalSigns[0] ?? null;

  const merahFlags = riskFlags.filter((f) => f.level === "MERAH");
  const kuningFlags = riskFlags.filter((f) => f.level === "KUNING");

  return (
    <div className="space-y-4">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={goJamaahList} className="text-muted-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Data Jamaah
      </Button>

      {/* Header card */}
      <Card className={`overflow-hidden border-2 ${s.bg} ${j.riskLevel === "MERAH" ? "border-rose-200 dark:border-rose-900" : j.riskLevel === "KUNING" ? "border-amber-200 dark:border-amber-900" : "border-emerald-200 dark:border-emerald-900"}`}>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${s.bg} ${s.text} ring-2 ${s.ring}`}>
                {initials(j.nama)}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">{j.nama}</h1>
                  <RiskBadge level={j.riskLevel} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {j.usia} th · {kelaminLabel(j.kelamin)} · Kloter {j.kloter} · Porsi {j.porsi}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {j.hp || "-"}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.alamat || "-"}</span>
                  <span className="flex items-center gap-1"><Plane className="h-3 w-3" /> Tiba {formatTanggal(j.tanggalTiba)} ({hariSejak(j.tanggalTiba)}h)</span>
                  <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> {j.dokterKeluarga}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {j.kontakKeluarga}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" onClick={() => goAI(j.id)}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Analisis AI
              </Button>
            </div>
          </div>

          {/* Risk summary */}
          <div className="mt-4 rounded-xl border border-border/50 bg-card/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ringkasan Risiko</p>
            <p className="mt-1 text-sm">{j.riskSummary}</p>
            {(merahFlags.length > 0 || kuningFlags.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {merahFlags.map((f, i) => (
                  <span key={`m${i}`} className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    <AlertTriangle className="h-3 w-3" /> {f.detail}
                  </span>
                ))}
                {kuningFlags.map((f, i) => (
                  <span key={`k${i}`} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    {f.detail}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={detailTab} onValueChange={setDetailTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview"><Activity className="mr-1.5 h-3.5 w-3.5" /> Ringkasan</TabsTrigger>
          <TabsTrigger value="ttv"><Activity className="mr-1.5 h-3.5 w-3.5" /> TTV</TabsTrigger>
          <TabsTrigger value="screening"><ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Skrining</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-1.5 h-3.5 w-3.5" /> Riwayat</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Latest vitals */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tanda Vital Terbaru</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setVitalOpen(true)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Input
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {latestVital ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <VitalStat label="Tekanan Darah" value={`${latestVital.tdSistolik ?? "-"}/${latestVital.tdDiastolik ?? "-"}`} unit="mmHg" warn={latestVital.tdSistolik != null && latestVital.tdSistolik >= 140} />
                    <VitalStat label="Nadi" value={latestVital.nadi ?? "-"} unit="×/mnt" warn={latestVital.nadi != null && latestVital.nadi > 100} />
                    <VitalStat label="RR" value={latestVital.rr ?? "-"} unit="×/mnt" warn={latestVital.rr != null && latestVital.rr >= 25} />
                    <VitalStat label="Suhu" value={latestVital.suhu != null ? latestVital.suhu.toFixed(1) : "-"} unit="°C" warn={latestVital.suhu != null && latestVital.suhu >= 38} />
                    <VitalStat label="SpO₂" value={latestVital.spo2 != null ? latestVital.spo2.toFixed(0) : "-"} unit="%" warn={latestVital.spo2 != null && latestVital.spo2 < 94} />
                    <VitalStat label="Gula Darah" value={latestVital.gulaDarah ?? "-"} unit="mg/dL" warn={latestVital.gulaDarah != null && (latestVital.gulaDarah >= 180 || latestVital.gulaDarah < 70)} />
                  </div>
                ) : (
                  <EmptyState icon={Activity} title="Belum ada data TTV" desc="Input tanda vital pertama untuk jamaah ini." />
                )}
              </CardContent>
            </Card>

            {/* Screening coverage */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cakupan Skrining</CardTitle>
                <CardDescription className="text-xs">11 modul skrining biopsikososial spiritual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {SCREENING_ORDER.map((jenis) => {
                    const meta = SCREENING_META[jenis];
                    const latest = latestByJenis[jenis];
                    const Icon = getIcon(meta.icon);
                    return (
                      <button
                        key={jenis}
                        onClick={() => setDetailTab("screening")}
                        className="flex items-center gap-2 rounded-lg border border-border/60 p-2 text-left transition hover:border-primary/40 hover:bg-accent/30"
                      >
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{meta.judul}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {latest ? latest.skor : "Belum"}
                          </p>
                        </div>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${latest ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TTV */}
        <TabsContent value="ttv" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pencatatan berkala dengan grafik tren otomatis</p>
            <Button size="sm" onClick={() => setVitalOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Input TTV
            </Button>
          </div>
          <VitalSignsChart vitals={j.vitalSigns} />
          {j.vitalSigns.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Riwayat Pencatatan</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="max-h-72 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium">Waktu</th>
                        <th className="px-2 py-2 text-left font-medium">Hari</th>
                        <th className="px-2 py-2 text-right font-medium">TD</th>
                        <th className="px-2 py-2 text-right font-medium">Nadi</th>
                        <th className="px-2 py-2 text-right font-medium">Suhu</th>
                        <th className="px-2 py-2 text-right font-medium">SpO₂</th>
                        <th className="px-2 py-2 text-right font-medium">GD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {j.vitalSigns.map((v) => (
                        <tr key={v.id} className="border-b border-border/40">
                          <td className="px-3 py-2 text-xs text-muted-foreground">{formatTanggalWaktu(v.createdAt)}</td>
                          <td className="px-2 py-2 text-xs">H{v.hariKe}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{v.tdSistolik ?? "-"}/{v.tdDiastolik ?? "-"}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{v.nadi ?? "-"}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{v.suhu ?? "-"}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{v.spo2 ?? "-"}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{v.gulaDarah ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SCREENING */}
        <TabsContent value="screening" className="space-y-3">
          {(["BIOLOGIS", "PSIKOLOGIS", "SOSIAL", "SPIRITUAL"] as const).map((dim) => {
            const jenisList = SCREENING_ORDER.filter((jns) => SCREENING_META[jns].dimensi === dim);
            const DimIcon = getDimensiIcon(dim);
            return (
              <div key={dim}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <DimIcon className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-sm font-semibold">Dimensi {DIMENSI_META[dim].label}</h3>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {jenisList.map((jenis) => {
                    const meta = SCREENING_META[jenis];
                    const latest = latestByJenis[jenis];
                    const Icon = getIcon(meta.icon);
                    return (
                      <Card key={jenis} className="p-3">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{meta.judul}</p>
                            <p className="text-xs text-muted-foreground">{meta.instrumen}</p>
                            {latest ? (
                              <div className="mt-2">
                                <Badge variant="secondary" className="text-xs">{latest.skor}</Badge>
                                <span className="ml-2 text-xs text-muted-foreground">H{latest.hariKe} · {formatTanggal(latest.createdAt)}</span>
                                {latest.catatan && <p className="mt-1 text-xs italic text-muted-foreground">"{latest.catatan}"</p>}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-muted-foreground">Belum diskrining</p>
                            )}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setScreeningOpen(jenis)}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Skrining
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="space-y-2">
          <TimelineScreenings detail={j} onOpen={(jenis) => setScreeningOpen(jenis)} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ScreeningDialog
        jamaahId={j.id}
        jenis={screeningOpen}
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setScreeningOpen(null); }}
        onSaved={() => bumpRefresh()}
      />
      <VitalSignDialog
        jamaahId={j.id}
        open={vitalOpen}
        onOpenChange={setVitalOpen}
        onSaved={() => bumpRefresh()}
      />
      <JamaahFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={j}
        onSaved={() => bumpRefresh()}
      />
    </div>
  );
}

function VitalStat({
  label, value, unit, warn,
}: {
  label: string; value: string | number; unit: string; warn?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-2.5 ${warn ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40" : "border-border/60 bg-accent/20"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${warn ? "text-rose-600 dark:text-rose-300" : ""}`}>
        {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

function TimelineScreenings({
  detail, onOpen,
}: {
  detail: JamaahDetail;
  onOpen: (jenis: JenisSkrining) => void;
}) {
  type Item = { id: string; tgl: string; jenis: string; skor: string | null; catatan: string | null; hariKe: number; kind: "screening" | "vital" };
  const items: Item[] = [
    ...detail.screenings.map<Item>((s) => ({ id: s.id, tgl: s.createdAt, jenis: s.jenis, skor: s.skor, catatan: s.catatan, hariKe: s.hariKe, kind: "screening" as const })),
    ...detail.vitalSigns.map<Item>((v) => ({ id: v.id, tgl: v.createdAt, jenis: "VITAL", skor: v.spo2 != null ? `SpO₂ ${v.spo2}%` : null, catatan: v.catatan, hariKe: v.hariKe, kind: "vital" as const })),
  ].sort((a, b) => new Date(b.tgl).getTime() - new Date(a.tgl).getTime());

  if (!items.length) {
    return (
      <Card className="p-6">
        <EmptyState icon={History} title="Belum ada riwayat" desc="Riwayat skrining & tanda vital akan muncul di sini." />
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <div className="divide-y divide-border/50">
        {items.map((it) => {
          const meta = it.kind === "screening" ? SCREENING_META[it.jenis as JenisSkrining] : null;
          const Icon = meta ? getIcon(meta.icon) : Activity;
          return (
            <div key={it.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{meta ? meta.judul : "Tanda Vital"}</p>
                  {it.skor && <Badge variant="secondary" className="text-xs">{it.skor}</Badge>}
                  <span className="text-xs text-muted-foreground">Hari {it.hariKe}</span>
                </div>
                <p className="text-xs text-muted-foreground">{formatTanggalWaktu(it.tgl)}</p>
                {it.catatan && <p className="mt-1 text-xs italic text-muted-foreground">"{it.catatan}"</p>}
              </div>
              {meta && (
                <Button variant="ghost" size="sm" onClick={() => onOpen(it.jenis as JenisSkrining)} className="text-xs">
                  Ulangi <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
