"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft, User, Plane, Activity, History, Sparkles, Pencil,
  Phone, MapPin, Calendar, Stethoscope, Users, ShieldCheck, MessageCircle,
  LayoutDashboard, TestTube, ClipboardList, HeartPulse, Pill,
  Plus, Save, Loader2, Trash2, FileText,
  type LucideIcon,
} from "lucide-react";
import { useApp, type DetailMainTab } from "@/lib/store";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";
import {
  RISK_STYLE, formatTanggal, hariSejak, initials, kelaminLabel,
} from "@/lib/format";
import { RiskBadge, EmptyState, getIcon as getScreeningIcon } from "./shared";
import { computeCompleteness, completenessBadge, istithaahStyle } from "@/lib/completeness";
import { ProfilTab } from "./profil-tab";
import { RiwayatTab } from "./riwayat-tab";
import { PascaTimeline, PascaTrendCharts } from "./pasca-haji-enhancements";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { JamaahFormDialog } from "./jamaah-form-dialog";
import { PemeriksaanPenunjangView } from "./pemeriksaan-penunjang-view";
import { ScreeningDialog } from "./screening-dialog";
import { VitalSignDialog } from "./vital-sign-dialog";
import { VitalSignsChart } from "./vital-signs-chart";
import type { JamaahDetail, JenisSkrining, RiskFlag, PascaHajjLabData } from "@/lib/types";
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
  { key: "pemeriksaan", label: "Pemeriksaan Penunjang", icon: FileText },
];

export function JamaahDetailView() {
  const {
    selectedJamaahId, goJamaahList, goAI, goTelemedicine, detailTab, setDetailTab,
    pascaTab, setPascaTab, refreshKey, bumpRefresh,
  } = useApp();
  const { isStaff, isDoctor, canDelete, role } = useSupabaseAuth();
  const [detail, setDetail] = React.useState<JamaahDetail | null>(null);
  const [preHajj, setPreHajj] = React.useState<PreHajjBundle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [riskFlags, setRiskFlags] = React.useState<RiskFlag[]>([]);
  const [screeningOpen, setScreeningOpen] = React.useState<JenisSkrining | null>(null);
  const [vitalOpen, setVitalOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
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
                {(isDoctor || isStaff || canDelete) && (
                  <Button variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
                  </Button>
                )}
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

          {/* ===== Tertiary Navigation: Pasca Haji ===== */}
          <Card>
            <CardContent className="p-3">
              <div className="mb-3 flex items-center gap-1 overflow-x-auto scrollbar-thin">
                {([
                  { key: "ringkasan", label: "Ringkasan", icon: LayoutDashboard },
                  { key: "riwayat", label: "Riwayat Singkat", icon: History },
                  { key: "ttv", label: "TTV", icon: Activity },
                  { key: "lab", label: "Lab", icon: TestTube },
                  { key: "skrining", label: "Skrining", icon: ClipboardList },
                ] as const).map((t) => {
                  const TIcon = t.icon;
                  const active = pascaTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setPascaTab(t.key)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border/60"
                      }`}
                    >
                      <TIcon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
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
                onGoScreening={() => setPascaTab("skrining")}
                onChanged={load}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* RIWAYAT */}
        <TabsContent value="riwayat">
          <RiwayatTab jamaah={j} preHajj={preHajj} />
        </TabsContent>

        {/* PEMERIKSAAN PENUNJANG */}
        <TabsContent value="pemeriksaan">
          <PemeriksaanPenunjangView
            jamaahId={j.id}
            onSendToTelemedicine={(fileUrl, fileName, keterangan) => {
              goTelemedicine(j.id);
              toast.info("File siap dikirim via Telemedicine", { description: fileName });
            }}
          />
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Jamaah</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data jamaah ini? Semua data yang berkaitan dengan jamaah akan ikut dihapus dan tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-border bg-accent/30 px-4 py-2 text-sm">
            <p className="font-semibold">{j.nama}</p>
            <p className="text-xs text-muted-foreground">NIK: {j.nik} · Kloter {j.kloter}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setDeleting(true);
                try {
                  const res = await fetch(`/api/jamaah/${j.id}`, { method: "DELETE" });
                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(data.error ?? "Gagal menghapus data jamaah. Silakan coba kembali.");
                  }
                  toast.success("Data jamaah berhasil dihapus.");
                  setDeleteOpen(false);
                  goJamaahList();
                  bumpRefresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Gagal menghapus data jamaah. Silakan coba kembali.");
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600"
            >
              {deleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghapus...</>
              ) : (
                <><Trash2 className="mr-2 h-4 w-4" /> Hapus</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sub-content Pasca Haji (refactored dari view lama)
function PascaSubContent({
  tab, detail, riskFlags, onOpenScreening, onGoScreening, onChanged,
}: {
  tab: string;
  detail: JamaahDetail;
  riskFlags: RiskFlag[];
  onOpenScreening: (jenis: JenisSkrining) => void;
  onGoScreening: () => void;
  onChanged: () => void;
}) {
  // ===== 1. RINGKASAN — overview kepulangan =====
  if (tab === "ringkasan" || tab === "overview") {
    const latestVital = detail.vitalSigns[0] ?? null;
    const merahFlags = riskFlags.filter((f) => f.level === "MERAH");
    const kuningFlags = riskFlags.filter((f) => f.level === "KUNING");
    const hariPasca = hariSejak(detail.tanggalTiba);
    const lamaPerjalanan = detail.tanggalBerangkat && detail.tanggalTiba
      ? Math.round((new Date(detail.tanggalTiba).getTime() - new Date(detail.tanggalBerangkat).getTime()) / 86400000)
      : null;
    return (
      <div className="space-y-3">
        {/* Info Kepulangan */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <InfoBox icon={Plane} label="Tanggal Pulang" value={formatTanggal(detail.tanggalTiba)} />
          <InfoBox icon={Calendar} label="Lama Perjalanan" value={lamaPerjalanan != null ? `${lamaPerjalanan} hari` : "—"} />
          <InfoBox icon={Activity} label="Hari Pasca Pulang" value={`Hari ${hariPasca}`} />
        </div>

        {/* Status Risiko */}
        <div className="rounded-lg border border-border/50 bg-accent/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Risiko Pasca Haji</p>
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

        {/* Diagnosis & Penyakit Penyerta */}
        <div className="grid gap-2 sm:grid-cols-2">
          <InfoBox icon={HeartPulse} label="Diagnosis Saat Pulang" value={detail.riwayatPenyakit || "Tidak ada"} />
          <InfoBox icon={Pill} label="Obat Rutin" value={detail.obatRutin || "Tidak ada"} />
        </div>

        {/* Ringkasan Monitoring */}
        <div className="rounded-lg border border-border/50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ringkasan Monitoring</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{detail.vitalSigns.length}</p>
              <p className="text-xs text-muted-foreground">TTV</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{detail.screenings.length}</p>
              <p className="text-xs text-muted-foreground">Skrining</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{hariPasca}</p>
              <p className="text-xs text-muted-foreground">Hari</p>
            </div>
          </div>
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

  // ===== 2. RIWAYAT SINGKAT — timeline vertikal pasca haji =====
  if (tab === "riwayat" || tab === "history") {
    return <PascaHistoryList detail={detail} onOpen={onOpenScreening} />;
  }

  // ===== 3. TTV — table + trend chart =====
  if (tab === "ttv") {
    const sorted = [...detail.vitalSigns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const lastUpdate = sorted[0];
    return (
      <div className="space-y-4">
        {lastUpdate && (
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-accent/30 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Update Terakhir</span>
            <span className="text-xs font-semibold">{formatTanggalWaktu(lastUpdate.createdAt)} (Hari {lastUpdate.hariKe})</span>
          </div>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Riwayat TTV Pasca Haji</CardTitle>
          </CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <EmptyState icon={Activity} title="Belum ada data TTV" desc="Klik 'Input TTV' untuk mencatat tanda vital pasca haji." />
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Waktu</TableHead>
                      <TableHead className="text-xs">Hari</TableHead>
                      <TableHead className="text-xs">TD</TableHead>
                      <TableHead className="text-xs">Nadi</TableHead>
                      <TableHead className="text-xs">RR</TableHead>
                      <TableHead className="text-xs">Suhu</TableHead>
                      <TableHead className="text-xs">SpO₂</TableHead>
                      <TableHead className="text-xs">BB</TableHead>
                      <TableHead className="text-xs">GD</TableHead>
                      <TableHead className="text-xs">Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatTanggalWaktu(v.createdAt)}</TableCell>
                        <TableCell className="text-xs">H{v.hariKe}</TableCell>
                        <TableCell className="text-xs tabular-nums">{v.tdSistolik != null && v.tdDiastolik != null ? `${v.tdSistolik}/${v.tdDiastolik}` : "—"}</TableCell>
                        <TableCell className="text-xs tabular-nums">{v.nadi ?? "—"}</TableCell>
                        <TableCell className="text-xs tabular-nums">{v.rr ?? "—"}</TableCell>
                        <TableCell className="text-xs tabular-nums">{v.suhu != null ? v.suhu.toFixed(1) : "—"}</TableCell>
                        <TableCell className="text-xs tabular-nums">{v.spo2 != null ? v.spo2.toFixed(0) : "—"}</TableCell>
                        <TableCell className="text-xs tabular-nums">{v.beratBadan ?? "—"}</TableCell>
                        <TableCell className="text-xs tabular-nums">{v.gulaDarah ?? "—"}</TableCell>
                        <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">{v.catatan ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <VitalSignsChart vitals={detail.vitalSigns} />
      </div>
    );
  }

  // ===== 4. LAB — hasil laboratorium pasca haji =====
  if (tab === "lab") {
    return <PascaLabView detail={detail} onChanged={onChanged} />;
  }

  // ===== 5. SKRINING =====
  if (tab === "screening" || tab === "skrining") {
    return <PascaScreeningList detail={detail} onOpen={onOpenScreening} />;
  }

  return null;
}

// ===== Helper: InfoBox for Ringkasan =====
function InfoBox({
  icon: Icon, label, value,
}: {
  icon: LucideIcon; label: string; value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-accent/20 p-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

// ===== Pasca Lab View — hasil lab pasca haji dengan badge =====
// ===== Lab reference ranges for Normal/Borderline/Abnormal badges =====
const LAB_RANGES: Record<string, { min: number; max: number; unit: string; label: string }> = {
  hb: { min: 12, max: 17, unit: "g/dL", label: "Hb" },
  leukosit: { min: 4, max: 11, unit: "ribu/μL", label: "Leukosit" },
  gdp: { min: 70, max: 125, unit: "mg/dL", label: "GDP" },
  gd2pp: { min: 70, max: 145, unit: "mg/dL", label: "GD 2PP" },
  hba1c: { min: 4, max: 5.7, unit: "%", label: "HbA1c" },
  kolesterol: { min: 0, max: 200, unit: "mg/dL", label: "Kolesterol" },
  ldl: { min: 0, max: 130, unit: "mg/dL", label: "LDL" },
  hdl: { min: 40, max: 100, unit: "mg/dL", label: "HDL" },
  trigliserida: { min: 0, max: 150, unit: "mg/dL", label: "Trigliserida" },
  sgot: { min: 0, max: 35, unit: "U/L", label: "SGOT" },
  sgpt: { min: 0, max: 35, unit: "U/L", label: "SGPT" },
  ureum: { min: 15, max: 40, unit: "mg/dL", label: "Ureum" },
  kreatinin: { min: 0.6, max: 1.3, unit: "mg/dL", label: "Kreatinin" },
};

function labBadge(value: number | null, key: string): React.ReactNode {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  const r = LAB_RANGES[key];
  if (!r) return <span className="text-xs">{value}</span>;
  const normal = value >= r.min && value <= r.max;
  const borderline = value >= r.min * 0.85 && value <= r.max * 1.15;
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
      normal
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
        : borderline
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
        : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
    }`}>
      {normal ? "Normal" : borderline ? "Borderline" : "Abnormal"}
    </span>
  );
}

// ===== Pasca Lab View — table + input button + badges =====
// Fetches directly from Supabase (not Prisma). After INSERT, reloads from DB.
function PascaLabView({ detail, onChanged }: { detail: JamaahDetail; onChanged: () => void }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [labs, setLabs] = React.useState<PascaHajjLabData[]>([]);
  const [loading, setLoading] = React.useState(true);

  // ===== Fetch lab history from Supabase =====
  const fetchLabHistory = React.useCallback(async () => {
    console.log("[PascaLab] Fetching lab history from Supabase for jamaah:", detail.id);
    setLoading(true);
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data, error } = await supabase
        .from("pasca_hajj_lab")
        .select("*")
        .eq("jamaah_id", detail.id)
        .order("created_at", { ascending: false });
      console.log("[PascaLab] Supabase Response:", data);
      console.log("[PascaLab] Supabase Error:", error);
      if (error) {
        console.error("[PascaLab] Fetch error:", error);
        toast.error(`Gagal memuat data lab: ${error.message}`);
      } else {
        // Map snake_case to camelCase for the UI
        const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          jamaahId: row.jamaah_id as string,
          hb: row.hb as number | null,
          leukosit: row.leukosit as number | null,
          gdp: row.gdp as number | null,
          gd2pp: row.gd2pp as number | null,
          hba1c: row.hba1c as number | null,
          kolesterol: row.kolesterol as number | null,
          ldl: row.ldl as number | null,
          hdl: row.hdl as number | null,
          trigliserida: row.trigliserida as number | null,
          sgot: row.sgot as number | null,
          sgpt: row.sgpt as number | null,
          ureum: row.ureum as number | null,
          kreatinin: row.kreatinin as number | null,
          catatan: row.catatan as string | null,
          createdAt: row.created_at as string,
        }));
        setLabs(mapped);
      }
    } catch (err) {
      console.error("[PascaLab] Exception:", err);
      toast.error("Gagal memuat data lab");
    } finally {
      setLoading(false);
    }
  }, [detail.id]);

  React.useEffect(() => {
    fetchLabHistory();
  }, [fetchLabHistory]);

  const sorted = [...labs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Hasil Laboratorium Pasca Haji</p>
          <p className="text-xs text-muted-foreground">{labs.length} pemeriksaan tercatat</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Input Lab
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={TestTube}
          title="Belum ada data lab pasca haji"
          desc="Klik 'Input Lab' untuk mencatat hasil laboratorium pasca haji."
        />
      ) : (
        <div className="max-h-[420px] overflow-auto scrollbar-thin rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Tanggal</TableHead>
                <TableHead className="text-xs">Hb</TableHead>
                <TableHead className="text-xs">Leukosit</TableHead>
                <TableHead className="text-xs">GDP</TableHead>
                <TableHead className="text-xs">GD2PP</TableHead>
                <TableHead className="text-xs">HbA1c</TableHead>
                <TableHead className="text-xs">Kol</TableHead>
                <TableHead className="text-xs">LDL</TableHead>
                <TableHead className="text-xs">HDL</TableHead>
                <TableHead className="text-xs">TG</TableHead>
                <TableHead className="text-xs">SGOT</TableHead>
                <TableHead className="text-xs">SGPT</TableHead>
                <TableHead className="text-xs">Ureum</TableHead>
                <TableHead className="text-xs">Kreat</TableHead>
                <TableHead className="text-xs">Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatTanggal(l.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.hb ?? "—"}</span>
                      {labBadge(l.hb, "hb")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.leukosit ?? "—"}</span>
                      {labBadge(l.leukosit, "leukosit")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.gdp ?? "—"}</span>
                      {labBadge(l.gdp, "gdp")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.gd2pp ?? "—"}</span>
                      {labBadge(l.gd2pp, "gd2pp")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.hba1c ?? "—"}</span>
                      {labBadge(l.hba1c, "hba1c")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.kolesterol ?? "—"}</span>
                      {labBadge(l.kolesterol, "kolesterol")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.ldl ?? "—"}</span>
                      {labBadge(l.ldl, "ldl")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.hdl ?? "—"}</span>
                      {labBadge(l.hdl, "hdl")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.trigliserida ?? "—"}</span>
                      {labBadge(l.trigliserida, "trigliserida")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.sgot ?? "—"}</span>
                      {labBadge(l.sgot, "sgot")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.sgpt ?? "—"}</span>
                      {labBadge(l.sgpt, "sgpt")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.ureum ?? "—"}</span>
                      {labBadge(l.ureum, "ureum")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular-nums">{l.kreatinin ?? "—"}</span>
                      {labBadge(l.kreatinin, "kreatinin")}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate text-xs text-muted-foreground">
                    {l.catatan ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PascaLabDialog
        jamaahId={detail.id}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => {
          // After save, reload from Supabase (not local state)
          fetchLabHistory();
          onChanged();
        }}
      />
    </div>
  );
}

// ===== Pasca Lab Dialog — input form =====
const FIELD_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function PascaLabDialog({
  jamaahId, open, onOpenChange, onSaved,
}: {
  jamaahId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [vals, setVals] = React.useState<Record<string, string>>({});
  const [catatan, setCatatan] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setVals({});
      setCatatan("");
    }
  }, [open]);

  const set = (k: string, v: string) => setVals((d) => ({ ...d, [k]: v }));

  // ===== handleSave: INSERT directly to Supabase pasca_hajj_lab =====
  async function handleSave() {
    console.log("========== Saving Lab... ==========");

    // Build payload — all fields as numbers or null, matching Supabase schema exactly
    const toNum = (v: string | undefined): number | null => {
      if (!v || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const payload = {
      jamaah_id: jamaahId,
      hb: toNum(vals.hb),
      leukosit: toNum(vals.leukosit),
      gdp: toNum(vals.gdp),
      gd2pp: toNum(vals.gd2pp),
      hba1c: toNum(vals.hba1c),
      kolesterol: toNum(vals.kolesterol),
      ldl: toNum(vals.ldl),
      hdl: toNum(vals.hdl),
      trigliserida: toNum(vals.trigliserida),
      sgot: toNum(vals.sgot),
      sgpt: toNum(vals.sgpt),
      ureum: toNum(vals.ureum),
      kreatinin: toNum(vals.kreatinin),
      catatan: catatan || null,
    };

    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("jamaah_id:", jamaahId);

    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // ===== INSERT to Supabase =====
      const { data, error } = await supabase
        .from("pasca_hajj_lab")
        .insert(payload);

      console.log("Supabase Response:", data);
      console.log("Supabase Error:", error);
      console.log("===================================");

      if (error) {
        // Show exact Supabase/PostgreSQL error
        console.error("[PascaLab] INSERT failed:", error);
        const errMsg = error.message || String(error);
        const errCode = (error as { code?: string }).code ?? "";
        toast.error(`Gagal menyimpan lab [${errCode}]: ${errMsg}`);
        return; // Do NOT close dialog — let user see the error
      }

      // ===== INSERT succeeded — reload from Supabase =====
      console.log("[PascaLab] INSERT succeeded — calling onSaved to reload from DB");
      toast.success("Hasil lab pasca haji tersimpan di Supabase");
      onSaved();       // triggers fetchLabHistory() which reloads from Supabase
      onOpenChange(false);
    } catch (err) {
      console.error("[PascaLab] Exception during save:", err);
      toast.error(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: string; label: string; unit: string }[] = [
    { key: "hb", label: "Hb", unit: "g/dL" },
    { key: "leukosit", label: "Leukosit", unit: "ribu/μL" },
    { key: "gdp", label: "Gula Darah Puasa", unit: "mg/dL" },
    { key: "gd2pp", label: "Gula Darah 2PP", unit: "mg/dL" },
    { key: "hba1c", label: "HbA1c", unit: "%" },
    { key: "kolesterol", label: "Kolesterol Total", unit: "mg/dL" },
    { key: "ldl", label: "LDL", unit: "mg/dL" },
    { key: "hdl", label: "HDL", unit: "mg/dL" },
    { key: "trigliserida", label: "Trigliserida", unit: "mg/dL" },
    { key: "sgot", label: "SGOT", unit: "U/L" },
    { key: "sgpt", label: "SGPT", unit: "U/L" },
    { key: "ureum", label: "Ureum", unit: "mg/dL" },
    { key: "kreatinin", label: "Kreatinin", unit: "mg/dL" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TestTube className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Input Hasil Lab Pasca Haji</DialogTitle>
              <DialogDescription>Masukkan hasil pemeriksaan laboratorium</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div key={f.key}>
              <Label className="mb-1 block text-xs font-medium text-muted-foreground">
                {f.label} ({f.unit})
              </Label>
              <input
                type="number"
                step="0.01"
                value={vals[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder="—"
                className={FIELD_CLASS}
              />
            </div>
          ))}
        </div>

        <div>
          <Label className="mb-1 block text-xs font-medium text-muted-foreground">Catatan</Label>
          <input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan klinis…"
            className={FIELD_CLASS}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Hasil Lab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const sortedHistory = [...detail.screenings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const latestByJenis: Record<string, JamaahDetail["screenings"][number]> = {};
  for (const s of detail.screenings) {
    const ex = latestByJenis[s.jenis];
    if (!ex || new Date(s.createdAt) > new Date(ex.createdAt)) latestByJenis[s.jenis] = s;
  }

  return (
    <div className="space-y-4">
      {/* ===== Tabel Riwayat Skrining ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Riwayat Skrining Pasca Haji</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedHistory.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Belum ada riwayat skrining"
              desc="Pilih instrumen di bawah untuk mulai skrining pasca haji."
            />
          ) : (
            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs">Hari</TableHead>
                    <TableHead className="text-xs">Instrumen</TableHead>
                    <TableHead className="text-xs">Skor</TableHead>
                    <TableHead className="text-xs">Catatan</TableHead>
                    <TableHead className="text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHistory.map((s) => {
                    const meta = SCREENING_META[s.jenis as JenisSkrining];
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatTanggalWaktu(s.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs">H{s.hariKe}</TableCell>
                        <TableCell className="text-xs font-medium">
                          {meta?.judul ?? s.jenis}
                        </TableCell>
                        <TableCell>
                          {s.skor && (
                            <Badge variant="secondary" className="text-xs">{s.skor}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                          {s.catatan ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onOpen(s.jenis as JenisSkrining)}
                          >
                            Ulangi
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Grid Instrumen Skrining ===== */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Instrumen Skrining
        </p>
        {(["BIOLOGIS", "PSIKOLOGIS", "SOSIAL", "SPIRITUAL"] as const).map((dim) => {
          const jenisList = SCREENING_ORDER.filter((jns) => SCREENING_META[jns].dimensi === dim);
          return (
            <div key={dim} className="mb-3">
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground/70">
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
                          {latest ? `${latest.skor} · H${latest.hariKe} · ${formatTanggal(latest.createdAt)}` : "Belum diskrining"}
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
