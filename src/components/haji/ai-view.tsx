"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Loader2, ArrowLeft, AlertTriangle, ShieldCheck, Activity,
  Home, Stethoscope, Brain, HeartPulse, Users, ClipboardCheck, Bug,
  Lightbulb, Siren, ChevronRight, RefreshCw,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { RiskBadge, EmptyState } from "./shared";
import { RISK_STYLE, initials } from "@/lib/format";
import type { RiskLevel } from "@/lib/types";

// ===== Cohort AI =====
interface CohortResp {
  statistik: { total: number; merah: number; kuning: number; hijau: number };
  cohort: Array<{
    nama: string; usia: number; kelamin: string; kloter: string; puskesmas: string;
    tibaHariKe: number; levelRisiko: RiskLevel; ringkasanRisiko: string;
    flagUtama: string[]; skorSkrining: Record<string, string | null>;
  }>;
  analisis: {
    ringkasanWilayah?: string;
    temuanUtama?: string[];
    daftarPrioritasHomeVisit?: Array<{ nama: string; alasan: string; urgensi: string }>;
    suspekInfeksiSaluranNapas?: string[];
    rekomendasiProgram?: Array<{ program: string; target: string; aksi: string }>;
    peringatanDini?: string[];
  };
  error?: string;
}

// ===== Per-jamaah AI =====
interface SummaryResp {
  levelRisiko: RiskLevel;
  analisis: {
    ringkasan?: string;
    prioritas?: string;
    diagnosisSementara?: string[];
    rekomendasi?: Array<{ kategori: string; tindakan: string; urutan: number }>;
    jadwalKontrol?: string;
    perluHomeVisit?: boolean;
    alasanHomeVisit?: string;
  };
  error?: string;
}

export function AiView() {
  const { selectedJamaahId, goDashboard, goJamaahList, refreshKey } = useApp();

  if (selectedJamaahId) {
    return <PerJamaahAI jamaahId={selectedJamaahId} onBack={() => goJamaahList()} />;
  }
  return <CohortAI onBack={goDashboard} refreshKey={refreshKey} />;
}

function CohortAI({ onBack, refreshKey }: { onBack: () => void; refreshKey: number }) {
  const [data, setData] = React.useState<CohortResp | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/ai/cohort");
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json as CohortResp);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuat analisis AI";
      setErrorMsg(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Dashboard
        </Button>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Analisis Ulang
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Analisis AI — Wilayah Kerja Puskesmas</h1>
            <p className="text-sm text-muted-foreground">
              Ringkasan kondisi kloter, prioritas home visit, dan peringatan dini oleh AI dokter keluarga
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      ) : !data ? (
        <Card className="p-6"><EmptyState icon={AlertTriangle} title="Gagal memuat analisis" desc={errorMsg ?? "Coba muat ulang."} /></Card>
      ) : !data.analisis ? (
        <Card className="p-6"><EmptyState icon={AlertTriangle} title="Data analisis belum tersedia" /></Card>
      ) : (
        <>
          {/* Statistik ringkas */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Total" value={data.statistik.total} icon={Users} tone="primary" />
            <MiniStat label="Risiko Tinggi" value={data.statistik.merah} icon={AlertTriangle} tone="merah" />
            <MiniStat label="Pemantauan" value={data.statistik.kuning} icon={Activity} tone="kuning" />
            <MiniStat label="Stabil" value={data.statistik.hijau} icon={ShieldCheck} tone="hijau" />
          </div>

          {/* Ringkasan wilayah */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Ringkasan Kondisi Wilayah
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.analisis.ringkasanWilayah ? (
                <p className="text-sm leading-relaxed">{data.analisis.ringkasanWilayah}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada ringkasan.</p>
              )}
              {data.error && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  Mode fallback (AI penuh tidak tersedia): {data.error}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Temuan utama */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Temuan Utama
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.analisis.temuanUtama?.length ? (
                  <ul className="space-y-2">
                    {data.analisis.temuanUtama.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-muted-foreground">Tidak ada temuan khusus.</p>}
              </CardContent>
            </Card>

            {/* Suspek infeksi saluran napas */}
            <Card className="border-rose-200 dark:border-rose-900">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bug className="h-4 w-4 text-rose-600" /> Suspek Infeksi Saluran Napas
                </CardTitle>
                <CardDescription className="text-xs">Perlu investigasi & isolasi jika perlu</CardDescription>
              </CardHeader>
              <CardContent>
                {data.analisis.suspekInfeksiSaluranNapas?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {data.analisis.suspekInfeksiSaluranNapas.map((n, i) => (
                      <Badge key={i} variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">{n}</Badge>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">Tidak ada suspek infeksi saluran napas.</p>}
              </CardContent>
            </Card>
          </div>

          {/* Prioritas home visit */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4 text-primary" /> Daftar Prioritas Home Visit
              </CardTitle>
              <CardDescription className="text-xs">Urut dari yang paling mendesak</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.analisis.daftarPrioritasHomeVisit?.length ? (
                <div className="divide-y divide-border/50">
                  {data.analisis.daftarPrioritasHomeVisit.map((p, i) => {
                    const cohortItem = data.cohort.find((c) => c.nama === p.nama);
                    const level = cohortItem?.levelRisiko ?? "KUNING";
                    const urg = p.urgensi?.toUpperCase();
                    return (
                      <div key={i} className="flex items-start gap-3 px-4 py-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">{p.nama}</p>
                            <RiskBadge level={level as RiskLevel} withDot={false} />
                            {urg && (
                              <Badge variant="outline" className={`text-xs ${urg === "URGENT" ? "border-rose-300 text-rose-600" : urg === "TINGGI" ? "border-amber-300 text-amber-600" : ""}`}>
                                {urg}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{p.alasan}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="p-4"><p className="text-sm text-muted-foreground">Tidak ada prioritas home visit.</p></div>}
            </CardContent>
          </Card>

          {/* Rekomendasi program */}
          {data.analisis.rekomendasiProgram?.length ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-4 w-4 text-primary" /> Rekomendasi Program Kesehatan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.analisis.rekomendasiProgram.map((r, i) => (
                    <div key={i} className="rounded-xl border border-border/60 bg-accent/20 p-3">
                      <p className="text-sm font-semibold">{r.program}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Target: {r.target}</p>
                      <p className="mt-1 text-xs">{r.aksi}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Peringatan dini */}
          {data.analisis.peringatanDini?.length ? (
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-300">
                  <Siren className="h-4 w-4" /> Peringatan Dini
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {data.analisis.peringatanDini.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function PerJamaahAI({ jamaahId, onBack }: { jamaahId: string; onBack: () => void }) {
  const { goDetail, refreshKey } = useApp();
  const [data, setData] = React.useState<SummaryResp | null>(null);
  const [jamaah, setJamaah] = React.useState<{ nama: string; usia: number; kelamin: string; riskLevel: RiskLevel } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    console.log("[PerJamaahAI] Loading data for jamaahId:", jamaahId);
    try {
      // 1. Fetch jamaah profile directly from Supabase (avoids API 404).
      // 2. Fetch AI summary from the Supabase-backed /api/ai/summary/[id] route.
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const [sRes, jRes] = await Promise.allSettled([
        fetch(`/api/ai/summary/${jamaahId}`),
        supabase.from("jamaah").select("nama, usia, kelamin, risk_level").eq("id", jamaahId).maybeSingle(),
      ]);
      // AI summary
      if (sRes.status === "fulfilled") {
        const s = await sRes.value.json().catch(() => null);
        // Defensive: ensure we always have an analisis object
        if (s && typeof s === "object" && !s.analisis) {
          s.analisis = { ringkasan: s.error ? "Analisis AI tidak tersedia saat ini." : "Tidak ada ringkasan.", prioritas: "RUTIN", diagnosisSementara: [], rekomendasi: [], perluHomeVisit: false };
        }
        setData(s as SummaryResp);
      } else {
        console.error("[PerJamaahAI] AI summary failed:", sRes.reason);
        setErrorMsg("Gagal memuat analisis AI");
        setData(null);
      }
      // Jamaah profile
      if (jRes.status === "fulfilled") {
        if (jRes.value.error) console.error("[PerJamaahAI] jamaah fetch error:", jRes.value.error);
        if (jRes.value.data) {
          const jd = jRes.value.data as { nama: string; usia: number; kelamin: string; risk_level: string };
          setJamaah({ nama: jd.nama, usia: jd.usia, kelamin: jd.kelamin, riskLevel: (jd.risk_level as RiskLevel) ?? "HIJAU" });
        }
      } else {
        console.error("[PerJamaahAI] jamaah fetch rejected:", jRes.reason);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuat analisis";
      setErrorMsg(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [jamaahId]);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  const KATEGORI_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
    Medis: Stethoscope, Kronis: HeartPulse, Mental: Brain, Nutrisi: Activity,
    Aktivitas: Activity, Spiritual: Sparkles, Keluarga: Users, Rujukan: ClipboardCheck,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Analisis Ulang
          </Button>
          <Button variant="outline" size="sm" onClick={() => goDetail(jamaahId)}>
            Detail Jamaah <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          {jamaah && (
            <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold ${RISK_STYLE[jamaah.riskLevel].bg} ${RISK_STYLE[jamaah.riskLevel].text}`}>
              {initials(jamaah.nama)}
            </span>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">Analisis AI — {jamaah?.nama ?? "Jamaah"}</h1>
            <p className="text-sm text-muted-foreground">
              {jamaah ? `${jamaah.usia} th · ${jamaah.kelamin === "L" ? "Laki-laki" : "Perempuan"}` : ""} · Ringkasan kondisi & rekomendasi tindak lanjut
            </p>
          </div>
          {data && <div className="ml-auto"><RiskBadge level={data.levelRisiko} /></div>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      ) : !data ? (
        <Card className="p-6"><EmptyState icon={AlertTriangle} title="Gagal memuat analisis" desc={errorMsg ?? "Coba muat ulang."} /></Card>
      ) : !data.analisis ? (
        <Card className="p-6"><EmptyState icon={AlertTriangle} title="Data analisis belum tersedia" /></Card>
      ) : (
        <>
          {/* Ringkasan */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Ringkasan Kondisi
              </CardTitle>
              <CardDescription className="text-xs">Pendekatan biopsikososial spiritual</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{data.analisis.ringkasan ?? "Tidak ada ringkasan."}</p>
              {data.error && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  Mode fallback: {data.error}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Prioritas */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Prioritas Tindakan</CardTitle></CardHeader>
              <CardContent>
                {data.analisis.prioritas ? (
                  <Badge className={`text-xs ${data.analisis.prioritas === "URGENT" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" : data.analisis.prioritas === "TINGGI" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"}`}>
                    {data.analisis.prioritas}
                  </Badge>
                ) : <p className="text-sm text-muted-foreground">-</p>}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Jadwal Kontrol</p>
                  <p className="text-sm font-medium">{data.analisis.jadwalKontrol ?? "-"}</p>
                </div>
                {data.analisis.perluHomeVisit && (
                  <div className="mt-3 rounded-lg bg-primary/10 p-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Home className="h-3.5 w-3.5" /> Perlu Home Visit
                    </p>
                    {data.analisis.alasanHomeVisit && (
                      <p className="mt-1 text-xs text-muted-foreground">{data.analisis.alasanHomeVisit}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Diagnosis sementara */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Stethoscope className="h-4 w-4 text-primary" /> Diagnosis Sementara
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.analisis.diagnosisSementara?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {data.analisis.diagnosisSementara.map((d, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">Tidak ada diagnosis sementara.</p>}
              </CardContent>
            </Card>
          </div>

          {/* Rekomendasi */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-primary" /> Rekomendasi Tindak Lanjut
              </CardTitle>
              <CardDescription className="text-xs">Sesuai pedoman Kementerian Kesehatan</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.analisis.rekomendasi?.length ? (
                <div className="divide-y divide-border/50">
                  {[...data.analisis.rekomendasi]
                    .sort((a, b) => a.urutan - b.urutan)
                    .map((r, i) => {
                      const I = KATEGORI_ICON[r.kategori] ?? ClipboardCheck;
                      return (
                        <div key={i} className="flex items-start gap-3 px-4 py-3">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <I className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{r.kategori}</Badge>
                            </div>
                            <p className="mt-1 text-sm">{r.tindakan}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : <div className="p-4"><p className="text-sm text-muted-foreground">Tidak ada rekomendasi spesifik.</p></div>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number;
  tone: "primary" | "merah" | "kuning" | "hijau";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    merah: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300",
    kuning: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
    hijau: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
