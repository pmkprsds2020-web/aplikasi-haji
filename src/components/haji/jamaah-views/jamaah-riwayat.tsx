"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine,
} from "recharts";
import {
  ArrowLeft, Activity, ClipboardList, FlaskConical, HeartPulse,
  CalendarClock, Stethoscope, FileText, type LucideIcon,
} from "lucide-react";
import {
  RISK_STYLE, formatTanggal, formatTanggalWaktu, hariSejak,
} from "@/lib/format";
import type { RiskLevel } from "@/lib/types";
import { EmptyState } from "../shared";

// ---- Row types (subset we read) ----
interface JamaahRow {
  id: string; user_id: string | null; doctor_id: string | null;
  nama: string; kloter: string; porsi: string;
  tanggal_tiba: string; tanggal_berangkat: string | null;
  risk_level: string; risk_summary: string;
  dokter_keluarga: string | null; puskesmas: string | null;
  riwayat_penyakit: string | null; riwayat_operasi: string | null;
  alergi: string | null; obat_rutin: string | null;
}
interface ProfileRow { full_name: string | null; }
interface VitalRow {
  id: string; hari_ke: number;
  td_sistolik: number | null; td_diastolik: number | null;
  nadi: number | null; rr: number | null; suhu: number | null;
  spo2: number | null; berat_badan: number | null; gula_darah: number | null;
  catatan: string | null; created_at: string;
}
interface LabRow {
  id: string;
  hb: number | null; gdp: number | null; gd2pp: number | null;
  hba1c: number | null; kolesterol: number | null; hdl: number | null;
  ldl: number | null; trigliserida: number | null; asam_urat: number | null;
  sgot: number | null; sgpt: number | null; kreatinin: number | null;
  egfr: number | null; urinalisis: string | null;
  catatan: string | null; created_at: string;
}
interface ScreeningRow {
  id: string; jenis: string;
  skor: string | null; catatan: string | null;
  hari_ke: number | null; created_at: string;
}
interface PreHajjScreeningRow {
  id: string; jenis: string;
  skor: string | null; catatan: string | null;
  created_at: string;
}
interface ChronicRow {
  id: string;
  hipertensi: string; diabetes: string; ppok: string;
  ckd: string; jantung: string; stroke: string; kanker: string;
  obat_rutin: string | null; target_terapi: string | null;
}

const SUB_TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "ringkasan", label: "Ringkasan", icon: ClipboardList },
  { key: "ttv", label: "TTV", icon: Activity },
  { key: "lab", label: "Laboratorium", icon: FlaskConical },
  { key: "skrining", label: "Skrining", icon: HeartPulse },
];

export function JamaahRiwayat() {
  const { user } = useSupabaseAuth();
  const { pascaTab, setPascaTab, goJamaahDashboard, goJamaahChat } = useApp();
  const supabase = React.useMemo(() => createClient(), []);

  const [jamaah, setJamaah] = React.useState<JamaahRow | null>(null);
  const [doctor, setDoctor] = React.useState<ProfileRow | null>(null);
  const [vitals, setVitals] = React.useState<VitalRow[]>([]);
  const [labs, setLabs] = React.useState<LabRow[]>([]);
  const [screenings, setScreenings] = React.useState<ScreeningRow[]>([]);
  const [preScreenings, setPreScreenings] = React.useState<PreHajjScreeningRow[]>([]);
  const [chronic, setChronic] = React.useState<ChronicRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user?.id) return;
      setLoading(true);
      const { data: jRow, error: jErr } = await supabase
        .from("jamaah").select("*").eq("user_id", user.id).maybeSingle();
      if (jErr) { console.error(jErr); toast.error(jErr.message); setLoading(false); return; }
      if (!jRow) { if (mounted) setJamaah(null); setLoading(false); return; }
      const j = jRow as JamaahRow;
      if (!mounted) return;
      setJamaah(j);

      const tasks: PromiseLike<void>[] = [];

      if (j.doctor_id) {
        tasks.push(
          supabase.from("profiles").select("full_name").eq("id", j.doctor_id).maybeSingle()
            .then(({ data, error }) => {
              if (error) { console.error(error); toast.error(error.message); return; }
              if (mounted && data) setDoctor(data as ProfileRow);
            })
        );
      }

      tasks.push(
        supabase.from("vital_sign").select("*").eq("jamaah_id", j.id)
          .order("created_at", { ascending: true })
          .then(({ data, error }) => {
            if (error) { console.error(error); toast.error(error.message); return; }
            if (mounted) setVitals((data as VitalRow[]) ?? []);
          })
      );

      tasks.push(
        supabase.from("pre_hajj_lab").select("*").eq("jamaah_id", j.id)
          .order("created_at", { ascending: true })
          .then(({ data, error }) => {
            if (error) { console.error(error); toast.error(error.message); return; }
            if (mounted) setLabs((data as LabRow[]) ?? []);
          })
      );

      tasks.push(
        supabase.from("screening").select("*").eq("jamaah_id", j.id)
          .order("created_at", { ascending: false })
          .then(({ data, error }) => {
            if (error) { console.error(error); toast.error(error.message); return; }
            if (mounted) setScreenings((data as ScreeningRow[]) ?? []);
          })
      );

      tasks.push(
        supabase.from("pre_hajj_screening").select("*").eq("jamaah_id", j.id)
          .order("created_at", { ascending: false })
          .then(({ data, error }) => {
            if (error) { console.error(error); toast.error(error.message); return; }
            if (mounted) setPreScreenings((data as PreHajjScreeningRow[]) ?? []);
          })
      );

      tasks.push(
        supabase.from("pre_hajj_chronic").select("*").eq("jamaah_id", j.id)
          .order("updated_at", { ascending: false }).limit(1).maybeSingle()
          .then(({ data, error }) => {
            if (error) { console.error(error); toast.error(error.message); return; }
            if (mounted) setChronic((data as ChronicRow) ?? null);
          })
      );

      await Promise.all(tasks);
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [supabase, user?.id]);

  const activeTab = SUB_TABS.some((t) => t.key === pascaTab) ? pascaTab : "ringkasan";

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!jamaah) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={HeartPulse}
              title="Data jamaah belum terhubung"
              desc="Akun Anda belum dikaitkan dengan data jamaah."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const riskLevel = (jamaah.risk_level as RiskLevel) ?? "HIJAU";
  const rstyle = RISK_STYLE[riskLevel];
  const lastVital = vitals.length ? vitals[vitals.length - 1] : null;
  const lastLab = labs.length ? labs[labs.length - 1] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-12 text-base"
          onClick={goJamaahDashboard}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Kembali
        </Button>
        <h1 className="text-xl font-bold sm:text-2xl">Riwayat Kesehatan</h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setPascaTab(v)}>
        <TabsList className="h-12 w-full justify-start gap-1 overflow-x-auto bg-muted/60 p-1">
          {SUB_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="h-10 px-4 text-base data-[state=active]:bg-card"
              >
                <Icon className="mr-2 h-4 w-4" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Ringkasan */}
        <TabsContent value="ringkasan" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HeartPulse className="h-4 w-4 text-primary" /> Diagnosis & Riwayat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Riwayat Penyakit" value={jamaah.riwayat_penyakit} />
                <InfoRow label="Riwayat Operasi" value={jamaah.riwayat_operasi} />
                <InfoRow label="Alergi" value={jamaah.alergi} highlight={!!jamaah.alergi && jamaah.alergi !== "-"} />
                <InfoRow label="Obat Rutin" value={jamaah.obat_rutin} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4 text-primary" /> Penyakit Kronis (Pra Haji)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chronic ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <ChronicChip label="Hipertensi" value={chronic.hipertensi} />
                    <ChronicChip label="Diabetes" value={chronic.diabetes} />
                    <ChronicChip label="PPOK" value={chronic.ppok} />
                    <ChronicChip label="Ginjal Kronis" value={chronic.ckd} />
                    <ChronicChip label="Jantung" value={chronic.jantung} />
                    <ChronicChip label="Stroke" value={chronic.stroke} />
                    <ChronicChip label="Kanker" value={chronic.kanker} />
                  </div>
                ) : (
                  <EmptyState icon={ClipboardList} title="Belum ada data kronis" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" /> Status Risiko
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`rounded-xl border p-4 ${rstyle.bg} ${rstyle.text}`}>
                  <p className="text-2xl font-bold">
                    {riskLevel === "HIJAU" ? "Hijau — Stabil" : riskLevel === "KUNING" ? "Kuning — Pemantauan" : "Merah — Risiko Tinggi"}
                  </p>
                  <p className="mt-1 text-sm">
                    {jamaah.risk_summary || "Status risiko belum ditentukan."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Stethoscope className="h-4 w-4 text-primary" /> Dokter Pendamping & Kontrol
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Dokter" value={doctor?.full_name || jamaah.dokter_keluarga} />
                <InfoRow label="Puskesmas" value={jamaah.puskesmas} />
                <InfoRow
                  label="Pemeriksaan TTV Terakhir"
                  value={lastVital ? `${formatTanggalWaktu(lastVital.created_at)} (Hari ${lastVital.hari_ke})` : null}
                />
                <InfoRow
                  label="Lab Terakhir"
                  value={lastLab ? formatTanggalWaktu(lastLab.created_at) : null}
                />
                <InfoRow
                  label="Hari Pasca Pulang"
                  value={`${hariSejak(jamaah.tanggal_tiba)} hari (Tiba ${formatTanggal(jamaah.tanggal_tiba)})`}
                />
                <div className="pt-1">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-full text-base"
                    onClick={goJamaahChat}
                  >
                    <Stethoscope className="mr-2 h-5 w-5" />
                    Hubungi Dokter
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TTV */}
        <TabsContent value="ttv" className="mt-4 space-y-4">
          <VitalsTrendCard vitals={vitals} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" /> Tabel Tanda Vital
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {vitals.length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState icon={Activity} title="Belum ada data TTV" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm">Tanggal</TableHead>
                      <TableHead className="text-sm">TD</TableHead>
                      <TableHead className="text-sm">Nadi</TableHead>
                      <TableHead className="text-sm">RR</TableHead>
                      <TableHead className="text-sm">Suhu</TableHead>
                      <TableHead className="text-sm">SpO₂</TableHead>
                      <TableHead className="text-sm">BB</TableHead>
                      <TableHead className="text-sm">GD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...vitals].reverse().map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-sm">
                          <div className="font-medium">{formatTanggal(v.created_at)}</div>
                          <div className="text-xs text-muted-foreground">Hari {v.hari_ke}</div>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(v.td_sistolik)}/{fmtNum(v.td_diastolik)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(v.nadi)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(v.rr)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(v.suhu)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(v.spo2)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(v.berat_badan)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(v.gula_darah)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab */}
        <TabsContent value="lab" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="h-4 w-4 text-primary" /> Hasil Laboratorium (Pra Haji)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {labs.length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState icon={FlaskConical} title="Belum ada data lab" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm">Tanggal</TableHead>
                      <TableHead className="text-sm">Hb</TableHead>
                      <TableHead className="text-sm">GDP</TableHead>
                      <TableHead className="text-sm">HbA1c</TableHead>
                      <TableHead className="text-sm">Kol.</TableHead>
                      <TableHead className="text-sm">HDL</TableHead>
                      <TableHead className="text-sm">LDL</TableHead>
                      <TableHead className="text-sm">Trigl.</TableHead>
                      <TableHead className="text-sm">As. Urat</TableHead>
                      <TableHead className="text-sm">SGOT</TableHead>
                      <TableHead className="text-sm">SGPT</TableHead>
                      <TableHead className="text-sm">Kreat.</TableHead>
                      <TableHead className="text-sm">eGFR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...labs].reverse().map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm font-medium">{formatTanggal(l.created_at)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.hb)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.gdp)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.hba1c)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.kolesterol)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.hdl)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.ldl)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.trigliserida)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.asam_urat)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.sgot)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.sgpt)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.kreatinin)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmtNum(l.egfr)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skrining */}
        <TabsContent value="skrining" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-primary" /> Skrining Pasca Haji
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {screenings.length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState icon={ClipboardList} title="Belum ada skrining pasca haji" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm">Tanggal</TableHead>
                      <TableHead className="text-sm">Instrumen</TableHead>
                      <TableHead className="text-sm">Hari</TableHead>
                      <TableHead className="text-sm">Skor</TableHead>
                      <TableHead className="text-sm">Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {screenings.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm font-medium">{formatTanggal(s.created_at)}</TableCell>
                        <TableCell className="text-sm">{labelScreening(s.jenis)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{s.hari_ke ?? "—"}</TableCell>
                        <TableCell className="text-sm">{s.skor || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.catatan || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" /> Skrining Pra Haji
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {preScreenings.length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState icon={FileText} title="Belum ada skrining pra haji" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm">Tanggal</TableHead>
                      <TableHead className="text-sm">Instrumen</TableHead>
                      <TableHead className="text-sm">Skor</TableHead>
                      <TableHead className="text-sm">Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preScreenings.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm font-medium">{formatTanggal(s.created_at)}</TableCell>
                        <TableCell className="text-sm">{labelPreScreening(s.jenis)}</TableCell>
                        <TableCell className="text-sm">{s.skor || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.catatan || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== Tren TTV chart =====
function VitalsTrendCard({ vitals }: { vitals: VitalRow[] }) {
  const sorted = React.useMemo(
    () => [...vitals].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [vitals]
  );
  const data = sorted.map((v) => ({
    label: `H${v.hari_ke}`,
    tgl: formatTanggal(v.created_at),
    TD: v.td_sistolik,
    Suhu: v.suhu,
    SpO2: v.spo2,
    "Gula Darah": v.gula_darah,
  }));
  if (!data.length) {
    return null;
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-primary" /> Tren Tanda Vital
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
                labelFormatter={(_, p) => (p && p[0] ? String(p[0].payload.tgl) : "")}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="TD" name="Tekanan Sistolik (mmHg)" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Suhu" name="Suhu (°C)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="SpO2" name="SpO₂ (%)" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="Gula Darah" name="Gula Darah (mg/dL)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <ReferenceLine y={140} stroke="#fca5a5" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== Helpers =====
function InfoRow({
  label, value, highlight,
}: {
  label: string; value?: string | null; highlight?: boolean;
}) {
  const empty = !value || value === "-" || value === "";
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-sm sm:text-right ${highlight ? "font-semibold text-rose-600 dark:text-rose-400" : empty ? "italic text-muted-foreground/60" : "font-medium"}`}>
        {empty ? "—" : value}
      </dd>
    </div>
  );
}

function ChronicChip({ label, value }: { label: string; value: string }) {
  const isYes = value && value.toLowerCase() !== "tidak" && value !== "-" && value !== "0";
  return (
    <div className={`rounded-lg border px-3 py-2 ${isYes ? "border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800" : "border-border/60 bg-accent/30"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${isYes ? "text-amber-700 dark:text-amber-300" : ""}`}>{value || "—"}</p>
    </div>
  );
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return "—";
  return String(v);
}

function labelScreening(jenis: string): string {
  const map: Record<string, string> = {
    INFECTIOUS: "Penyakit Menular",
    CHRONIC: "Penyakit Kronis",
    FRAILTY: "Frailty",
    FALL_RISK: "Risiko Jatuh",
    NUTRITION: "Nutrisi",
    MENTAL: "Kesehatan Mental",
    SLEEP: "Kualitas Tidur",
    ACTIVITY: "Aktivitas Fisik",
    SPIRITUAL: "Spiritual",
    FAMILY_APGAR: "Family APGAR",
    FOLLOWUP: "Tindak Lanjut",
  };
  return map[jenis] ?? jenis;
}

function labelPreScreening(jenis: string): string {
  const map: Record<string, string> = {
    FRAIL: "FRAIL Scale",
    MNA: "MNA-SF",
    MINICOG: "Mini-Cog",
    MORSE: "Morse Fall Scale",
    BARTHEL: "Barthel Index",
    PHQ9: "PHQ-9",
    GAD7: "GAD-7",
    APGAR: "Family APGAR",
    IPAQ: "IPAQ",
    WHOQOL: "WHOQOL-BREF",
  };
  return map[jenis] ?? jenis;
}
