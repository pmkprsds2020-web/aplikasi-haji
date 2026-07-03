"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  Activity, Plus, TestTube, ClipboardList, Pill, Syringe, Footprints,
  GraduationCap, Sparkles, Loader2, AlertTriangle, ShieldCheck, AlertCircle,
  HeartPulse, ChevronDown, ChevronRight, ClipboardCheck, Stethoscope, FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  PRE_HAJJ_SCREENING_META, PRE_HAJJ_SCREENING_ORDER,
  type PreHajjBundle, type PreHajjScreeningJenis, type PreHajjAiAssessmentData,
} from "@/lib/pre-hajj-types";
import { formatTanggal, formatTanggalWaktu } from "@/lib/format";
import { EmptyState, getIcon } from "../shared";
import { PreHajjVitalDialog } from "./pre-hajj-vital-dialog";
import { PreHajjLabDialog } from "./pre-hajj-lab-dialog";
import { PreHajjChronicForm } from "./pre-hajj-chronic-form";
import { PreHajjScreeningDialog } from "./pre-hajj-screening-dialog";
import { PreHajjMedicationDialog } from "./pre-hajj-medication-dialog";
import { PreHajjMedicationList } from "./pre-hajj-medication-list";
import { PreHajjImmunizationDialog } from "./pre-hajj-immunization-dialog";
import { PreHajjImmunizationList } from "./pre-hajj-immunization-list";
import { PreHajjFitnessDialog } from "./pre-hajj-fitness-dialog";
import { PreHajjEducationForm } from "./pre-hajj-education-form";
import { PreHajjVitalsChart } from "./pre-hajj-vitals-chart";
import { PreHajjLabChart } from "./pre-hajj-lab-chart";

interface SubViewProps {
  jamaahId: string;
  bundle: PreHajjBundle;
  onChanged: () => void;
}

// =========================================================
// 1. RingkasanSubView
// =========================================================
export function RingkasanSubView({ jamaahId, bundle, onChanged }: SubViewProps) {
  const latestVital = bundle.vitals[0] ?? null;
  const latestLab = bundle.labs[0] ?? null;
  const chronic = bundle.chronic;

  // Latest screening per jenis
  const latestScreenings: Record<string, { skor: string | null; createdAt: string }> = {};
  for (const s of bundle.screenings) {
    const ex = latestScreenings[s.jenis];
    if (!ex || new Date(s.createdAt) > new Date(ex.createdAt)) {
      latestScreenings[s.jenis] = { skor: s.skor, createdAt: s.createdAt };
    }
  }

  // Chronic active count
  const chronicActive = chronic
    ? (["hipertensi", "diabetes", "ppok", "ckd", "jantung", "stroke", "kanker"] as const)
        .filter((k) => chronic[k] && chronic[k] !== "Tidak").length
    : 0;

  // Education progress
  const eduDone = bundle.education
    ? (["diet", "aktivitas", "obat", "hidrasi", "istirahat", "manajemenKronis", "persiapanPerjalanan"] as const)
        .filter((k) => bundle.education![k]).length
    : 0;

  // Skor Kesiapan Berangkat (heuristic)
  let riskCount = chronicActive;
  if (latestLab) {
    if (latestLab.gdp != null && latestLab.gdp >= 200) riskCount++;
    if (latestLab.hba1c != null && latestLab.hba1c >= 8) riskCount++;
    if (latestLab.kreatinin != null && latestLab.kreatinin >= 1.5) riskCount++;
    if (latestLab.hb != null && latestLab.hb < 11) riskCount++;
  }
  if (latestVital) {
    if (latestVital.tdSistolik != null && latestVital.tdSistolik >= 160) riskCount++;
    if (latestVital.spo2 != null && latestVital.spo2 < 94) riskCount++;
    if (latestVital.suhu != null && latestVital.suhu >= 37.5) riskCount++;
  }
  if (!bundle.immunizations.some((i) => i.jenis === "MENINGITIS")) riskCount++;
  const kesiapan = riskCount === 0 ? "Siap" : riskCount <= 2 ? "Bersyarat" : "Belum Siap";
  const kesiapanTone =
    kesiapan === "Siap"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900"
      : kesiapan === "Bersyarat"
      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900"
      : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900";

  return (
    <div className="space-y-4">
      {/* Kesiapan berangkat + AI trigger */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Skor Kesiapan Berangkat</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold ${kesiapanTone}`}>
                  <ShieldCheck className="h-4 w-4" />
                  {kesiapan}
                </span>
                <span className="text-xs text-muted-foreground">{riskCount} faktor risiko terdeteksi</span>
              </div>
            </div>
            <AiAssessmentBlock jamaahId={jamaahId} bundle={bundle} onChanged={onChanged} />
          </div>
        </CardContent>
      </Card>

      {/* Vital + Lab summary grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" /> TTV Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestVital ? (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Metric label="TD" value={latestVital.tdSistolik != null && latestVital.tdDiastolik != null ? `${latestVital.tdSistolik}/${latestVital.tdDiastolik}` : "—"} unit="mmHg" />
                <Metric label="Nadi" value={latestVital.nadi ?? "—"} unit="×/mnt" />
                <Metric label="Suhu" value={latestVital.suhu ?? "—"} unit="°C" />
                <Metric label="SpO₂" value={latestVital.spo2 ?? "—"} unit="%" />
                <Metric label="BB" value={latestVital.beratBadan ?? "—"} unit="kg" />
                <Metric label="IMT" value={
                  latestVital.beratBadan != null && latestVital.tinggiBadan != null && latestVital.tinggiBadan > 0
                    ? (latestVital.beratBadan / Math.pow(latestVital.tinggiBadan / 100, 2)).toFixed(1)
                    : "—"
                } unit="kg/m²" />
                <p className="col-span-3 mt-1 text-xs text-muted-foreground">
                  {formatTanggalWaktu(latestVital.createdAt)}
                </p>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">Belum ada data TTV.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TestTube className="h-4 w-4 text-primary" /> Lab Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestLab ? (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Metric label="GDP" value={latestLab.gdp ?? "—"} unit="mg/dL" />
                <Metric label="HbA1c" value={latestLab.hba1c ?? "—"} unit="%" />
                <Metric label="Kreatinin" value={latestLab.kreatinin ?? "—"} unit="mg/dL" />
                <Metric label="Kolesterol" value={latestLab.kolesterol ?? "—"} unit="mg/dL" />
                <Metric label="Hb" value={latestLab.hb ?? "—"} unit="g/dL" />
                <Metric label="eGFR" value={latestLab.egfr ?? "—"} unit="mL/min" />
                <p className="col-span-3 mt-1 text-xs text-muted-foreground">
                  {formatTanggalWaktu(latestLab.createdAt)}
                </p>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">Belum ada data lab.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chronic + Immunization + Education */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <HeartPulse className="h-4 w-4 text-primary" /> Penyakit Kronis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chronic ? (
              <div className="flex flex-wrap gap-1.5">
                {(["hipertensi", "diabetes", "ppok", "ckd", "jantung", "stroke", "kanker"] as const).map((k) => {
                  const v = chronic[k];
                  if (!v || v === "Tidak") return null;
                  const tone = v === "Terkontrol"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300";
                  return (
                    <Badge key={k} variant="secondary" className={`text-xs ${tone}`}>
                      {k.charAt(0).toUpperCase() + k.slice(1)}: {v}
                    </Badge>
                  );
                })}
                {chronicActive === 0 && <p className="text-sm text-muted-foreground">Tidak ada penyakit kronis aktif.</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum diisi.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Syringe className="h-4 w-4 text-primary" /> Imunisasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {bundle.immunizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada imunisasi.</p>
              ) : (
                bundle.immunizations.map((im) => (
                  <Badge key={im.id} variant="secondary" className="text-xs">{im.jenis}</Badge>
                ))
              )}
            </div>
            {!bundle.immunizations.some((i) => i.jenis === "MENINGITIS") && (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-3 w-3" /> Meningitis wajib belum tercatat
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <GraduationCap className="h-4 w-4 text-primary" /> Edukasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{eduDone}/7 topik selesai</p>
            <Progress value={(eduDone / 7) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Screening skor grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" /> Skrining Terbaru per Instrumen
          </CardTitle>
          <CardDescription className="text-xs">10 instrumen skrining pra haji</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {PRE_HAJJ_SCREENING_ORDER.map((jns) => {
              const meta = PRE_HAJJ_SCREENING_META[jns];
              const Icon = getIcon(meta.icon);
              const sc = latestScreenings[jns];
              return (
                <div key={jns} className="rounded-lg border border-border/70 bg-card p-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="truncate">{meta.judul}</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-foreground">{sc?.skor ?? "—"}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="rounded-md bg-accent/30 px-2 py-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

// AI block — loads from /api/jamaah/[id]/pre-haji/ai
function AiAssessmentBlock({ jamaahId, bundle, onChanged }: { jamaahId: string; bundle: PreHajjBundle; onChanged: () => void }) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<PreHajjAiAssessmentData | null>(
    bundle.aiAssessments[0] ?? null
  );
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setResult(bundle.aiAssessments[0] ?? null);
  }, [bundle.aiAssessments]);

  async function runAi() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jamaah/${jamaahId}/pre-haji/ai`);
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal memuat analisis AI");
      }
      const json = await res.json();
      const assessment = json.assessment as PreHajjAiAssessmentData;
      setResult(assessment);
      toast.success("Analisis AI pra haji selesai");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat AI");
    } finally {
      setLoading(false);
    }
  }

  const kesiapanTone =
    result?.kesiapanBerangkat === "Siap"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
      : result?.kesiapanBerangkat === "Bersyarat"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
      : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300";

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={runAi} disabled={loading} size="sm">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {loading ? "Menganalisis…" : "Analisis AI Pra Haji"}
      </Button>
      {loading && <Skeleton className="h-24 w-72 rounded-lg" />}
      {!loading && result && (
        <div className="w-full max-w-xl rounded-xl border border-primary/20 bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hasil AI</span>
            </div>
            <Badge className={`text-xs ${kesiapanTone}`}>{result.kesiapanBerangkat}</Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed">{result.ringkasan}</p>
          {result.faktorRisiko?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.faktorRisiko.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
              ))}
            </div>
          )}
          {result.rekomendasi?.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Rekomendasi:</p>
              {[...result.rekomendasi]
                .sort((a, b) => a.urutan - b.urutan)
                .map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {r.urutan}
                    </span>
                    <span>
                      <Badge variant="outline" className="mr-1 text-[10px]">{r.kategori}</Badge>
                      {r.tindakan}
                    </span>
                  </div>
                ))}
            </div>
          )}
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs">
                {open ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronRight className="mr-1 h-3 w-3" />}
                {open ? "Sembunyikan dokumen" : "Lihat SOAP / Resume / Surat Rujukan"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {result.soap && (
                <DetailBlock icon={ClipboardCheck} title="SOAP" body={result.soap} />
              )}
              {result.resumeMedis && (
                <DetailBlock icon={Stethoscope} title="Resume Medis" body={result.resumeMedis} />
              )}
              {result.suratRujukan && (
                <DetailBlock icon={FileText} title="Surat Rujukan" body={result.suratRujukan} />
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}

function DetailBlock({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-accent/20 p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">{body}</p>
    </div>
  );
}

// =========================================================
// 2. TtvSubView
// =========================================================
export function TtvSubView({ jamaahId, bundle, onChanged }: SubViewProps) {
  const [open, setOpen] = React.useState(false);
  const sorted = [...bundle.vitals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Input TTV
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Riwayat TTV</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <EmptyState icon={Activity} title="Belum ada data TTV" desc="Input tanda vital untuk melihat tren." />
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>TD</TableHead>
                    <TableHead>Nadi</TableHead>
                    <TableHead>RR</TableHead>
                    <TableHead>Suhu</TableHead>
                    <TableHead>SpO₂</TableHead>
                    <TableHead>BB</TableHead>
                    <TableHead>LP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs">{formatTanggal(v.createdAt)}</TableCell>
                      <TableCell className="text-xs">{v.tdSistolik != null && v.tdDiastolik != null ? `${v.tdSistolik}/${v.tdDiastolik}` : "—"}</TableCell>
                      <TableCell className="text-xs">{v.nadi ?? "—"}</TableCell>
                      <TableCell className="text-xs">{v.rr ?? "—"}</TableCell>
                      <TableCell className="text-xs">{v.suhu ?? "—"}</TableCell>
                      <TableCell className="text-xs">{v.spo2 ?? "—"}</TableCell>
                      <TableCell className="text-xs">{v.beratBadan ?? "—"}</TableCell>
                      <TableCell className="text-xs">{v.lingkarPerut ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <PreHajjVitalsChart vitals={bundle.vitals} />
      <PreHajjVitalDialog jamaahId={jamaahId} open={open} onOpenChange={setOpen} onSaved={onChanged} />
    </div>
  );
}

// =========================================================
// 3. LabSubView
// =========================================================
export function LabSubView({ jamaahId, bundle, onChanged }: SubViewProps) {
  const [open, setOpen] = React.useState(false);
  const sorted = [...bundle.labs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Input Lab
        </Button>
      </div>
      <PreHajjLabChart labs={bundle.labs} />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Riwayat Lab</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <EmptyState icon={TestTube} title="Belum ada data lab" desc="Input hasil pemeriksaan lab." />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Hb</TableHead>
                    <TableHead>GDP</TableHead>
                    <TableHead>HbA1c</TableHead>
                    <TableHead>Kol</TableHead>
                    <TableHead>HDL</TableHead>
                    <TableHead>LDL</TableHead>
                    <TableHead>TG</TableHead>
                    <TableHead>UA</TableHead>
                    <TableHead>SGOT</TableHead>
                    <TableHead>SGPT</TableHead>
                    <TableHead>Kreat</TableHead>
                    <TableHead>eGFR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{formatTanggal(l.createdAt)}</TableCell>
                      <TableCell className="text-xs">{l.hb ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.gdp ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.hba1c ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.kolesterol ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.hdl ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.ldl ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.trigliserida ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.asamUrat ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.sgot ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.sgpt ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.kreatinin ?? "—"}</TableCell>
                      <TableCell className="text-xs">{l.egfr ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <PreHajjLabDialog jamaahId={jamaahId} open={open} onOpenChange={setOpen} onSaved={onChanged} />
    </div>
  );
}

// =========================================================
// 4. KronisSubView
// =========================================================
export function KronisSubView({ jamaahId, bundle, onChanged }: SubViewProps) {
  return (
    <PreHajjChronicForm jamaahId={jamaahId} chronic={bundle.chronic} onSaved={onChanged} />
  );
}

// =========================================================
// 5. SkriningSubView
// =========================================================
export function SkriningSubView({ jamaahId, bundle, onChanged }: SubViewProps) {
  const [activeJenis, setActiveJenis] = React.useState<PreHajjScreeningJenis | null>(null);
  const [open, setOpen] = React.useState(false);

  const latestByJenis: Record<string, { skor: string | null; createdAt: string }> = {};
  for (const s of bundle.screenings) {
    const ex = latestByJenis[s.jenis];
    if (!ex || new Date(s.createdAt) > new Date(ex.createdAt)) {
      latestByJenis[s.jenis] = { skor: s.skor, createdAt: s.createdAt };
    }
  }

  function openDialog(j: PreHajjScreeningJenis) {
    setActiveJenis(j);
    setOpen(true);
  }

  const sortedHistory = [...bundle.screenings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRE_HAJJ_SCREENING_ORDER.map((jns) => {
          const meta = PRE_HAJJ_SCREENING_META[jns];
          const Icon = getIcon(meta.icon);
          const sc = latestByJenis[jns];
          return (
            <Card key={jns} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="text-sm">{meta.judul}</CardTitle>
                    <CardDescription className="text-xs">{meta.instrumen}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-2">
                <div>
                  {sc ? (
                    <div className="rounded-lg border border-border/70 bg-accent/30 px-2.5 py-1.5">
                      <p className="text-xs text-muted-foreground">Skor terakhir</p>
                      <p className="text-sm font-bold text-primary">{sc.skor ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{formatTanggal(sc.createdAt)}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Belum ada skrining.</p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => openDialog(jns)}>
                  <ClipboardList className="mr-2 h-3.5 w-3.5" /> Skrining
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Riwayat Skrining</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedHistory.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Belum ada skrining" desc="Pilih instrumen di atas untuk mulai skrining." />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Instrumen</TableHead>
                    <TableHead>Skor</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHistory.map((s) => {
                    const meta = PRE_HAJJ_SCREENING_META[s.jenis];
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs">{formatTanggalWaktu(s.createdAt)}</TableCell>
                        <TableCell className="text-xs font-medium">{meta.judul}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{s.skor ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.catatan ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PreHajjScreeningDialog
        jamaahId={jamaahId}
        jenis={activeJenis}
        open={open}
        onOpenChange={setOpen}
        onSaved={onChanged}
      />
    </div>
  );
}

// =========================================================
// 6. ObatSubView
// =========================================================
export function ObatSubView({ jamaahId, bundle, onChanged }: SubViewProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Tambah Obat
        </Button>
      </div>
      <PreHajjMedicationList jamaahId={jamaahId} medications={bundle.medications} onChanged={onChanged} />
      <PreHajjMedicationDialog jamaahId={jamaahId} open={open} onOpenChange={setOpen} onSaved={onChanged} />
    </div>
  );
}

// =========================================================
// 7. ImunisasiSubView
// =========================================================
export function ImunisasiSubView({ jamaahId, bundle, onChanged }: SubViewProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Tambah Imunisasi
        </Button>
      </div>
      <PreHajjImmunizationList jamaahId={jamaahId} immunizations={bundle.immunizations} onChanged={onChanged} />
      <PreHajjImmunizationDialog jamaahId={jamaahId} open={open} onOpenChange={setOpen} onSaved={onChanged} />
    </div>
  );
}

// =========================================================
// 8. KebugaranSubView
// =========================================================
export function KebugaranSubView({ jamaahId, bundle, onChanged }: SubViewProps) {
  const [open, setOpen] = React.useState(false);
  const sorted = [...bundle.fitness].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const chartData = sorted.map((f) => ({
    label: formatTanggal(f.createdAt),
    Jalan: f.jalanKaki ?? 0,
    Aerobik: f.aerobik ?? 0,
    Kekuatan: f.kekuatan ?? 0,
    Pernafasan: f.pernafasan ?? 0,
    Total: (f.jalanKaki ?? 0) + (f.aerobik ?? 0) + (f.kekuatan ?? 0) + (f.pernafasan ?? 0),
  }));

  const reversed = [...sorted].reverse();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Catat Latihan
        </Button>
      </div>

      {chartData.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Footprints className="h-4 w-4 text-primary" /> Tren Durasi Latihan (menit/minggu)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Jalan" stackId="a" name="Jalan Kaki" fill="#10b981" />
                  <Bar dataKey="Aerobik" stackId="a" name="Aerobik" fill="#0d9488" />
                  <Bar dataKey="Kekuatan" stackId="a" name="Kekuatan" fill="#f59e0b" />
                  <Bar dataKey="Pernafasan" stackId="a" name="Pernafasan" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Riwayat Latihan</CardTitle>
        </CardHeader>
        <CardContent>
          {reversed.length === 0 ? (
            <EmptyState icon={Footprints} title="Belum ada catatan latihan" desc="Catat aktivitas fisik jamaah." />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Jalan</TableHead>
                    <TableHead>Aerobik</TableHead>
                    <TableHead>Kekuatan</TableHead>
                    <TableHead>Pernafasan</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reversed.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-xs">{formatTanggal(f.createdAt)}</TableCell>
                      <TableCell className="text-xs">{f.targetLangkah ?? "—"}</TableCell>
                      <TableCell className="text-xs">{f.jalanKaki ?? "—"}</TableCell>
                      <TableCell className="text-xs">{f.aerobik ?? "—"}</TableCell>
                      <TableCell className="text-xs">{f.kekuatan ?? "—"}</TableCell>
                      <TableCell className="text-xs">{f.pernafasan ?? "—"}</TableCell>
                      <TableCell className="text-xs font-semibold">
                        {(f.jalanKaki ?? 0) + (f.aerobik ?? 0) + (f.kekuatan ?? 0) + (f.pernafasan ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PreHajjFitnessDialog jamaahId={jamaahId} open={open} onOpenChange={setOpen} onSaved={onChanged} />
    </div>
  );
}

// =========================================================
// 9. EdukasiSubView
// =========================================================
export function EdukasiSubView({ jamaahId, bundle, onChanged }: SubViewProps) {
  return (
    <PreHajjEducationForm jamaahId={jamaahId} education={bundle.education} onSaved={onChanged} />
  );
}

// Re-export for convenience
export {
  PreHajjVitalDialog, PreHajjLabDialog, PreHajjChronicForm, PreHajjScreeningDialog,
  PreHajjMedicationDialog, PreHajjMedicationList, PreHajjImmunizationDialog,
  PreHajjImmunizationList, PreHajjFitnessDialog, PreHajjEducationForm,
  PreHajjVitalsChart, PreHajjLabChart,
};

// Unused-symbol guards (will be tree-shaken; keeps imports honest)
void AlertCircle;
