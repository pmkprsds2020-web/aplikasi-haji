"use client";

import * as React from "react";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, User, Plane, Activity, History, Sparkles, Pencil,
  Phone, MapPin, Calendar, Stethoscope, Users, ShieldCheck, MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { useApp, type DetailMainTab } from "@/lib/store";
import {
  RISK_STYLE, formatTanggal, hariSejak, initials, kelaminLabel,
} from "@/lib/format";
import { RiskBadge, EmptyState, getIcon as getScreeningIcon } from "./shared";
import { computeCompleteness, completenessBadge, istithaahStyle } from "@/lib/completeness";
import { ProfilTab } from "./profil-tab";
import { RiwayatTab } from "./riwayat-tab";
import { PascaTimeline, PascaTrendCharts } from "./pasca-haji-enhancements";
import { JamaahFormDialog } from "./jamaah-form-dialog";
import { ScreeningDialog } from "./screening-dialog";
import { VitalSignDialog } from "./vital-sign-dialog";
import { VitalSignsChart } from "./vital-signs-chart";
import type { JamaahDetail, JenisSkrining, RiskFlag } from "@/lib/types";
import type { PreHajjBundle, PreHajjSubTab } from "@/lib/pre-hajj-types";
import { PRE_HAJJ_SUBTABS } from "@/lib/pre-hajj-types";
import { getIcon } from "./pre-hajj/pre-hajj-sub-views-utils";
import { SCREENING_META, SCREENING_ORDER, DIMENSI_META } from "@/lib/screening-meta";
import { formatTanggalWaktu } from "@/lib/format";

// re-export pasca haji sub-content lazily
import {
  RingkasanSubView, TtvSubView, LabSubView, KronisSubView,
  SkriningSubView, ObatSubView, ImunisasiSubView, KebugaranSubView,
  EdukasiSubView,
} from "./pre-hajj/pre-hajj-sub-views";

const MAIN_TABS: { key: DetailMainTab; label: string; icon: LucideIcon }[] = [
  { key: "profil", label: "Profil", icon: User },
  { key: "pra-haji", label: "Pra Haji", icon: ShieldCheck },
  { key: "pasca-haji", label: "Pasca Haji", icon: Activity },
  { key: "riwayat", label: "Riwayat", icon: History },
];

export function JamaahDetailView() {
  const {
    selectedJamaahId, goJamaahList, goAI, goTelemedicine, detailTab, setDetailTab,
    pascaTab, setPascaTab, refreshKey, bumpRefresh,
  } = useApp();
  const [detail, setDetail] = React.useState<JamaahDetail | null>(null);
  const [preHajj, setPreHajj] = React.useState<PreHajjBundle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [riskFlags, setRiskFlags] = React.useState<RiskFlag[]>([]);
  const [screeningOpen, setScreeningOpen] = React.useState<JenisSkrining | null>(null);
  const [vitalOpen, setVitalOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [preSubTab, setPreSubTab] = React.useState<PreHajjSubTab>("ringkasan");

  const load = React.useCallback(async () => {
    if (!selectedJamaahId) return;
    setLoading(true);
    try {
      const [dRes, rRes, pRes] = await Promise.all([
        fetch(`/api/jamaah/${selectedJamaahId}`),
        fetch(`/api/jamaah/${selectedJamaahId}/risk`),
        fetch(`/api/jamaah/${selectedJamaahId}/pre-haji`),
      ]);
      const d = await dRes.json();
      setDetail(d.jamaah as JamaahDetail);
      const r = await rRes.json();
      setRiskFlags((r.flags as RiskFlag[]) ?? []);
      const p = await pRes.json();
      setPreHajj((p.bundle as PreHajjBundle) ?? null);
    } catch {
      setDetail(null);
      setPreHajj(null);
    } finally {
      setLoading(false);
    }
  }, [selectedJamaahId]);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  React.useEffect(() => {
    setDialogOpen(screeningOpen !== null);
  }, [screeningOpen]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-12 rounded-lg" />
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
  const pascaScreeningCount = j.screenings.length;
  const pascaVitalCount = j.vitalSigns.length;
  const completeness = computeCompleteness(j, preHajj, pascaScreeningCount, pascaVitalCount);
  const istithaah = istithaahStyle(j.statusIstithaah);

  const tabBadge = (tab: DetailMainTab) => {
    const pct = tab === "profil" ? completeness.profil : tab === "pra-haji" ? completeness.praHaji : tab === "pasca-haji" ? completeness.pascaHaji : 100;
    const b = completenessBadge(pct);
    return (
      <span className={`ml-1.5 hidden rounded-full border px-1.5 py-0 text-[10px] font-semibold sm:inline-block ${b.className}`}>
        {pct}%
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={goJamaahList} className="text-muted-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Data Jamaah
      </Button>

      {/* EHHR Header */}
      <Card className={`overflow-hidden border-2 ${s.bg} ${j.riskLevel === "MERAH" ? "border-rose-200 dark:border-rose-900" : j.riskLevel === "KUNING" ? "border-amber-200 dark:border-amber-900" : "border-emerald-200 dark:border-emerald-900"}`}>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${s.bg} ${s.text} ring-2 ${s.ring}`}>
                {initials(j.nama)}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">{j.nama}</h1>
                  <RiskBadge level={j.riskLevel} />
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${istithaah.className}`}>
                    <ShieldCheck className="h-3 w-3" /> {istithaah.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {j.usia} tahun · {kelaminLabel(j.kelamin)} · Kloter {j.kloter} · Porsi {j.porsi}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {j.hp || "-"}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.kabupatenKota}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Tiba {formatTanggal(j.tanggalTiba)} ({hariSejak(j.tanggalTiba)}h)</span>
                  <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> {j.dokterKeluarga}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {j.kontakKeluarga}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => goTelemedicine(j.id)}>
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Chat Jamaah
                </Button>
                <Button size="sm" onClick={() => goAI(j.id)}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Analisis AI
                </Button>
              </div>
            </div>
          </div>

          {/* Progress kelengkapan */}
          <div className="mt-4 rounded-xl border border-border/50 bg-card/70 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Kelengkapan Data Jamaah (EHHR)
              </span>
              <span className="text-xs font-bold text-primary">{completeness.overall}%</span>
            </div>
            <Progress value={completeness.overall} className="h-2" />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>Profil <strong className="text-foreground">{completeness.profil}%</strong></span>
              <span>Pra Haji <strong className="text-foreground">{completeness.praHaji}%</strong></span>
              <span>Pasca Haji <strong className="text-foreground">{completeness.pascaHaji}%</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main tabs */}
      <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as DetailMainTab)}>
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          {MAIN_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.key} value={t.key} className="flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm">
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {tabBadge(t.key)}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* PROFIL */}
        <TabsContent value="profil">
          <ProfilTab jamaah={j} profilPct={completeness.profil} onEdit={() => setEditOpen(true)} />
        </TabsContent>

        {/* PRA HAJI */}
        <TabsContent value="pra-haji" className="space-y-3">
          {/* sub-tab nav */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin rounded-lg border border-border/60 bg-card p-1">
            {PRE_HAJJ_SUBTABS.map((st) => {
              const Icon = getIcon(st.icon);
              const active = preSubTab === st.key;
              return (
                <button
                  key={st.key}
                  onClick={() => setPreSubTab(st.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {st.label}
                </button>
              );
            })}
          </div>

          {/* sub-tab content */}
          {preHajj ? (
            <>
              {preSubTab === "ringkasan" && <RingkasanSubView jamaahId={j.id} bundle={preHajj} onChanged={load} />}
              {preSubTab === "ttv" && <TtvSubView jamaahId={j.id} bundle={preHajj} onChanged={load} />}
              {preSubTab === "lab" && <LabSubView jamaahId={j.id} bundle={preHajj} onChanged={load} />}
              {preSubTab === "kronis" && <KronisSubView jamaahId={j.id} bundle={preHajj} onChanged={load} />}
              {preSubTab === "skrining" && <SkriningSubView jamaahId={j.id} bundle={preHajj} onChanged={load} />}
              {preSubTab === "obat" && <ObatSubView jamaahId={j.id} bundle={preHajj} onChanged={load} />}
              {preSubTab === "imunisasi" && <ImunisasiSubView jamaahId={j.id} bundle={preHajj} onChanged={load} />}
              {preSubTab === "kebugaran" && <KebugaranSubView jamaahId={j.id} bundle={preHajj} onChanged={load} />}
              {preSubTab === "edukasi" && <EdukasiSubView jamaahId={j.id} bundle={preHajj} onChanged={load} />}
            </>
          ) : (
            <Card className="p-6">
              <EmptyState icon={ShieldCheck} title="Data Pra Haji belum dimuat" />
            </Card>
          )}
        </TabsContent>

        {/* PASCA HAJI */}
        <TabsContent value="pasca-haji" className="space-y-4">
          {/* Timeline + Trend charts (enhancements) */}
          <PascaTimeline jamaah={j} />
          <PascaTrendCharts jamaah={j} />

          {/* Existing pasca haji sub-tabs (overview/ttv/screening/history) */}
          <Card>
            <CardContent className="p-3">
              <div className="mb-3 flex items-center gap-1 overflow-x-auto scrollbar-thin">
                {(["overview", "ttv", "screening", "history"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPascaTab(t)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${pascaTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    {t === "overview" ? "Ringkasan" : t === "ttv" ? "TTV & Grafik" : t === "screening" ? "Skrining" : "Riwayat Singkat"}
                  </button>
                ))}
                <div className="ml-auto flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setVitalOpen(true)} className="h-7 text-xs">
                    <Activity className="mr-1 h-3 w-3" /> Input TTV
                  </Button>
                </div>
              </div>
              <PascaSubContent
                tab={pascaTab}
                detail={j}
                riskFlags={riskFlags}
                onOpenScreening={(jenis) => setScreeningOpen(jenis)}
                onGoScreening={() => setPascaTab("screening")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* RIWAYAT */}
        <TabsContent value="riwayat">
          <RiwayatTab jamaah={j} preHajj={preHajj} />
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

// Sub-content Pasca Haji (refactored dari view lama)
function PascaSubContent({
  tab, detail, riskFlags, onOpenScreening, onGoScreening,
}: {
  tab: string;
  detail: JamaahDetail;
  riskFlags: RiskFlag[];
  onOpenScreening: (jenis: JenisSkrining) => void;
  onGoScreening: () => void;
}) {
  if (tab === "overview") {
    const latestVital = detail.vitalSigns[0] ?? null;
    const merahFlags = riskFlags.filter((f) => f.level === "MERAH");
    const kuningFlags = riskFlags.filter((f) => f.level === "KUNING");
    return (
      <div className="space-y-3">
        {/* Risk summary */}
        <div className="rounded-lg border border-border/50 bg-accent/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ringkasan Risiko Pasca Haji</p>
          <p className="mt-1 text-sm">{detail.riskSummary}</p>
          {(merahFlags.length > 0 || kuningFlags.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {merahFlags.map((f, i) => (
                <span key={`m${i}`} className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  {f.detail}
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
        {/* Latest vitals */}
        {latestVital ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <MiniStat label="TD" value={`${latestVital.tdSistolik ?? "-"}/${latestVital.tdDiastolik ?? "-"}`} unit="mmHg" warn={latestVital.tdSistolik != null && latestVital.tdSistolik >= 140} />
            <MiniStat label="Nadi" value={latestVital.nadi ?? "-"} unit="×/mnt" warn={latestVital.nadi != null && latestVital.nadi > 100} />
            <MiniStat label="Suhu" value={latestVital.suhu != null ? latestVital.suhu.toFixed(1) : "-"} unit="°C" warn={latestVital.suhu != null && latestVital.suhu >= 38} />
            <MiniStat label="SpO₂" value={latestVital.spo2 != null ? latestVital.spo2.toFixed(0) : "-"} unit="%" warn={latestVital.spo2 != null && latestVital.spo2 < 94} />
            <MiniStat label="Gula D." value={latestVital.gulaDarah ?? "-"} unit="mg/dL" warn={latestVital.gulaDarah != null && (latestVital.gulaDarah >= 180 || latestVital.gulaDarah < 70)} />
            <MiniStat label="BB" value={latestVital.beratBadan ?? "-"} unit="kg" />
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Belum ada data TTV pasca haji.</p>
        )}
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={onGoScreening}>Lihat Semua Skrining Pasca Haji →</Button>
        </div>
      </div>
    );
  }

  if (tab === "ttv") {
    return <VitalSignsChart vitals={detail.vitalSigns} />;
  }

  if (tab === "screening") {
    return <PascaScreeningList detail={detail} onOpen={onOpenScreening} />;
  }

  // history
  return <PascaHistoryList detail={detail} onOpen={onOpenScreening} />;
}

function MiniStat({
  label, value, unit, warn,
}: {
  label: string; value: string | number; unit: string; warn?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-2.5 ${warn ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40" : "border-border/60 bg-accent/20"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-bold tabular-nums ${warn ? "text-rose-600 dark:text-rose-300" : ""}`}>
        {value} <span className="text-[10px] font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

function PascaScreeningList({
  detail, onOpen,
}: {
  detail: JamaahDetail;
  onOpen: (jenis: JenisSkrining) => void;
}) {
  const latestByJenis: Record<string, JamaahDetail["screenings"][number]> = {};
  for (const s of detail.screenings) {
    const ex = latestByJenis[s.jenis];
    if (!ex || new Date(s.createdAt) > new Date(ex.createdAt)) latestByJenis[s.jenis] = s;
  }
  return (
    <div className="space-y-3">
      {(["BIOLOGIS", "PSIKOLOGIS", "SOSIAL", "SPIRITUAL"] as const).map((dim) => {
        const jenisList = SCREENING_ORDER.filter((jns) => SCREENING_META[jns].dimensi === dim);
        return (
          <div key={dim}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dimensi {DIMENSI_META[dim].label}
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {jenisList.map((jenis) => {
                const meta = SCREENING_META[jenis];
                const latest = latestByJenis[jenis];
                const Icon = getScreeningIcon(meta.icon);
                return (
                  <div key={jenis} className="flex items-center gap-3 rounded-lg border border-border/60 p-2.5">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{meta.judul}</p>
                      <p className="text-xs text-muted-foreground">
                        {latest ? `${latest.skor} · H${latest.hariKe}` : "Belum"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpen(jenis)}>
                      Skrining
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PascaHistoryList({
  detail, onOpen,
}: {
  detail: JamaahDetail;
  onOpen: (jenis: JenisSkrining) => void;
}) {
  const items = [...detail.screenings, ...detail.vitalSigns.map((v) => ({ ...v, jenis: "VITAL" }))].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (!items.length) return <p className="py-4 text-center text-sm text-muted-foreground">Belum ada riwayat.</p>;
  return (
    <div className="max-h-96 divide-y divide-border/40 overflow-y-auto scrollbar-thin">
      {items.map((it) => {
        const meta = it.jenis !== "VITAL" ? SCREENING_META[it.jenis as JenisSkrining] : null;
        const Icon = meta ? getScreeningIcon(meta.icon) : Activity;
        return (
          <div key={it.id} className="flex items-start gap-3 px-1 py-2">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{meta ? meta.judul : "Tanda Vital"}</p>
                {"skor" in it && it.skor && <Badge variant="secondary" className="text-[10px]">{it.skor}</Badge>}
                {"hariKe" in it && <span className="text-[10px] text-muted-foreground">Hari {it.hariKe}</span>}
              </div>
              <p className="text-[11px] text-muted-foreground">{formatTanggalWaktu(it.createdAt)}</p>
            </div>
            {meta && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onOpen(it.jenis as JenisSkrining)}>
                Ulangi
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
