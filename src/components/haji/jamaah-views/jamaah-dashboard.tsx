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
import {
  ShieldCheck, ShieldAlert, ShieldX, Stethoscope, MessageCircle,
  Plane, CalendarClock, Activity, HeartPulse, Droplet, Thermometer,
  Wind, ArrowRight, Bell, ClipboardList, type LucideIcon,
} from "lucide-react";
import {
  RISK_STYLE, hariSejak, formatTanggal, formatTanggalWaktu,
  initials, kelaminLabel,
} from "@/lib/format";
import type { RiskLevel } from "@/lib/types";
import { EmptyState } from "../shared";

// ---- Supabase row shapes (only fields we read) ----
interface JamaahRow {
  id: string;
  user_id: string | null;
  doctor_id: string | null;
  nama: string;
  kloter: string;
  porsi: string;
  usia: number;
  kelamin: string;
  tanggal_tiba: string;
  tanggal_berangkat: string | null;
  risk_level: string;
  risk_summary: string;
  dokter_keluarga: string | null;
  puskesmas: string | null;
}
interface ProfileRow { full_name: string | null; email: string | null; }
interface VitalRow {
  id: string; jamaah_id: string; hari_ke: number;
  td_sistolik: number | null; td_diastolik: number | null;
  nadi: number | null; rr: number | null; suhu: number | null;
  spo2: number | null; berat_badan: number | null; gula_darah: number | null;
  catatan: string | null; created_at: string;
}
interface ScreeningRow {
  id: string; jamaah_id: string; jenis: string;
  skor: string | null; catatan: string | null;
  hari_ke: number; created_at: string;
}
interface ChatMessageRow {
  id: string; room_id: string; sender_type: string;
  sender_name: string | null; content: string;
  created_at: string;
}

type NotifItem = {
  id: string;
  ts: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: string;
};

const RISK_ICON: Record<RiskLevel, LucideIcon> = {
  HIJAU: ShieldCheck,
  KUNING: ShieldAlert,
  MERAH: ShieldX,
};

const MONITORING_HARI = [1, 7, 14, 30];

function nextMonitoring(tibaIso: string): { hari: number; label: string } | null {
  const hari = hariSejak(tibaIso);
  for (const h of MONITORING_HARI) {
    if (hari < h) {
      const sisa = h - hari;
      return { hari: h, label: `Kontrol Hari ${h} · ${sisa} hari lagi` };
    }
  }
  // sudah lewat hari 30 → tetap menampilkan hari 30 sebagai kontrol terakhir
  return { hari: 30, label: `Kontrol Hari 30 · selesai ${hari - 30} hari lalu` };
}

export function JamaahDashboard() {
  const { user } = useSupabaseAuth();
  const { goJamaahRiwayat, goJamaahChat, goJamaahProfil } = useApp();
  const supabase = React.useMemo(() => createClient(), []);

  const [jamaah, setJamaah] = React.useState<JamaahRow | null>(null);
  const [doctor, setDoctor] = React.useState<ProfileRow | null>(null);
  const [latestVital, setLatestVital] = React.useState<VitalRow | null>(null);
  const [latestScreenings, setLatestScreenings] = React.useState<ScreeningRow[]>([]);
  const [notifs, setNotifs] = React.useState<NotifItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user?.id) {
        console.log("[JamaahDashboard] No user.id — not logged in");
        return;
      }
      setLoading(true);
      console.log("[JamaahDashboard] Loading data for user_id:", user.id);
      console.log("[JamaahDashboard] user.email:", user.email);

      // 1. Fetch jamaah by user_id (= auth.uid())
      const { data: jRow, error: jErr } = await supabase
        .from("jamaah")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("[JamaahDashboard] jamaah query result:", jRow, "error:", jErr);

      if (jErr) { console.error("[JamaahDashboard] query error:", jErr); toast.error(jErr.message); setLoading(false); return; }
      if (!jRow) {
        console.warn("[JamaahDashboard] No jamaah record found for user_id =", user.id);
        console.log("[JamaahDashboard] This means the jamaah record's user_id is not set.");
        console.log("[JamaahDashboard] The auto-link in auth context should have set it.");
        console.log("[JamaahDashboard] Trying fallback: search by email =", user.email);

        // Fallback: try to find jamaah by email and auto-link
        if (user.email) {
          const { data: jByEmail, error: eErr } = await supabase
            .from("jamaah")
            .select("*")
            .eq("email", user.email)
            .maybeSingle();
          console.log("[JamaahDashboard] fallback by email result:", jByEmail, "error:", eErr);

          if (jByEmail && !eErr) {
            // Found by email — link user_id now
            console.log("[JamaahDashboard] Found jamaah by email! Linking user_id...");
            const jId = (jByEmail as Record<string, unknown>).id as string;
            const { error: linkErr } = await supabase
              .from("jamaah")
              .update({ user_id: user.id })
              .eq("id", jId);
            if (linkErr) {
              console.error("[JamaahDashboard] Failed to link user_id:", linkErr.message);
            } else {
              console.log("[JamaahDashboard] user_id linked successfully!");
            }
            // Use the found record
            if (mounted) setJamaah(jByEmail as JamaahRow);
            setLoading(false);
            return;
          }
        }

        if (mounted) setJamaah(null);
        setLoading(false);
        return;
      }
      const j = jRow as JamaahRow;
      console.log("[JamaahDashboard] jamaah found:", j.nama, "| email:", (j as Record<string, unknown>).email);
      if (!mounted) return;
      setJamaah(j);

      // 2. Parallel fetches for doctor, vitals, screenings, chat messages
      const tasks: PromiseLike<void>[] = [];

      if (j.doctor_id) {
        tasks.push(
          supabase.from("profiles").select("full_name,email").eq("id", j.doctor_id).maybeSingle()
            .then(({ data, error }) => {
              if (error) { console.error(error); toast.error(error.message); return; }
              if (mounted && data) setDoctor(data as ProfileRow);
            })
        );
      }

      tasks.push(
        supabase.from("vital_sign").select("*").eq("jamaah_id", j.id)
          .order("created_at", { ascending: false }).limit(1)
          .then(({ data, error }) => {
            if (error) { console.error(error); toast.error(error.message); return; }
            if (mounted) setLatestVital((data?.[0] as VitalRow) ?? null);
          })
      );

      tasks.push(
        supabase.from("screening").select("*").eq("jamaah_id", j.id)
          .order("created_at", { ascending: false }).limit(3)
          .then(({ data, error }) => {
            if (error) { console.error(error); toast.error(error.message); return; }
            if (mounted) setLatestScreenings((data as ScreeningRow[]) ?? []);
          })
      );

      tasks.push(
        supabase.from("chat_message").select("id,room_id,sender_type,sender_name,content,created_at")
          .order("created_at", { ascending: false }).limit(5)
          .then(({ data, error }) => {
            if (error) { console.error(error); toast.error(error.message); return; }
            if (!mounted || !data) return;
            // We don't filter by room here — Supabase RLS ensures jamaah can only see their own rooms.
            const items: NotifItem[] = (data as ChatMessageRow[]).map((m) => ({
              id: m.id,
              ts: m.created_at,
              title: `Pesan dari ${m.sender_type === "doctor" ? "Dokter" : (m.sender_name ?? "Pengirim")}`,
              desc: m.content?.slice(0, 80) ?? "",
              icon: MessageCircle,
              tone: "bg-primary/10 text-primary",
            }));
            if (mounted) setNotifs((prev) => mergeNotifs(prev, items));
          })
      );

      await Promise.all(tasks);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [supabase, user?.id]);

  // merge notifications from vitals, screenings, and chat
  React.useEffect(() => {
    if (!jamaah) return;
    const items: NotifItem[] = [];

    if (latestVital) {
      items.push({
        id: `vital-${latestVital.id}`,
        ts: latestVital.created_at,
        title: `Pemeriksaan TTV Hari ${latestVital.hari_ke}`,
        desc: `TD ${latestVital.td_sistolik ?? "-"}/${latestVital.td_diastolik ?? "-"} · SpO₂ ${latestVital.spo2 ?? "-"}%`,
        icon: Activity,
        tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      });
    }
    for (const s of latestScreenings) {
      items.push({
        id: `screen-${s.id}`,
        ts: s.created_at,
        title: `Skrining Pasca Haji · Hari ${s.hari_ke}`,
        desc: s.skor ? `Hasil: ${s.skor}` : "Skrining selesai",
        icon: ClipboardList,
        tone: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
      });
    }

    setNotifs((prev) => mergeNotifs(prev.filter((n) => !n.id.startsWith("vital-") && !n.id.startsWith("screen-")), items));
  }, [jamaah, latestVital, latestScreenings]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!jamaah) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={HeartPulse}
              title="Data jamaah belum terhubung"
              desc="Akun Anda belum dikaitkan dengan data jamaah. Hubungi klinik untuk mendapatkan akses."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const riskLevel = (jamaah.risk_level as RiskLevel) ?? "HIJAU";
  const rstyle = RISK_STYLE[riskLevel];
  const RiskIcon = RISK_ICON[riskLevel];
  const kontrol = nextMonitoring(jamaah.tanggal_tiba);
  const hariPasca = hariSejak(jamaah.tanggal_tiba);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Welcome banner */}
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:gap-5 sm:p-7">
          <span
            className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-sm ring-4 ring-primary/15"
            aria-hidden
          >
            {initials(jamaah.nama)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Assalamu&apos;alaikum,</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {jamaah.nama}
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              {jamaah.usia} tahun · {kelaminLabel(jamaah.kelamin)} · Kloter {jamaah.kloter}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {hariPasca} hari pasca pulang · Tiba {formatTanggal(jamaah.tanggal_tiba)}
            </p>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="h-12 min-w-[140px] text-base"
            onClick={goJamaahProfil}
          >
            Profil Saya
          </Button>
        </CardContent>
      </Card>

      {/* Risk + Doctor */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={rstyle.bg}>
          <CardContent className="flex items-center gap-4 p-5">
            <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${rstyle.text} bg-card/70`}>
              <RiskIcon className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground">Status Risiko</p>
              <p className={`text-2xl font-bold ${rstyle.text}`}>
                {riskLevel === "HIJAU" ? "Hijau" : riskLevel === "KUNING" ? "Kuning" : "Merah"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {jamaah.risk_summary || "Status risiko belum ditentukan."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Stethoscope className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground">Dokter Pendamping</p>
              <p className="text-xl font-bold leading-tight">
                {doctor?.full_name || jamaah.dokter_keluarga || "Belum ditentukan"}
              </p>
              <p className="text-sm text-muted-foreground">
                {jamaah.puskesmas ? `Puskesmas ${jamaah.puskesmas}` : ""}
              </p>
            </div>
            <Button
              size="lg"
              className="h-12 px-5 text-base"
              onClick={goJamaahChat}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Chat
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Kloter/Porsi + Jadwal Kontrol */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plane className="h-4 w-4 text-primary" /> Kloter & Porsi
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-accent/40 p-4">
              <p className="text-xs text-muted-foreground">Kloter</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{jamaah.kloter || "—"}</p>
            </div>
            <div className="rounded-xl bg-accent/40 p-4">
              <p className="text-xs text-muted-foreground">Porsi</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{jamaah.porsi || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" /> Jadwal Kontrol
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kontrol ? (
              <div className="rounded-xl bg-accent/40 p-4">
                <p className="text-xs text-muted-foreground">{kontrol.label}</p>
                <p className="mt-1 text-2xl font-bold">
                  Hari {kontrol.hari}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Jadwal monitoring berkala pasca haji (Hari 1 · 7 · 14 · 30).
                </p>
              </div>
            ) : (
              <EmptyState icon={CalendarClock} title="Belum ada jadwal" desc="Tanggal tiba belum ditentukan." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest vitals */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Ringkasan Kesehatan
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-sm" onClick={() => goJamaahRiwayat("ttv")}>
              Riwayat <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {latestVital ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <VitalStat icon={HeartPulse} label="Tekanan Darah" value={latestVital.td_sistolik != null && latestVital.td_diastolik != null ? `${latestVital.td_sistolik}/${latestVital.td_diastolik}` : "—"} unit="mmHg" />
                <VitalStat icon={Wind} label="SpO₂" value={latestVital.spo2 != null ? String(latestVital.spo2) : "—"} unit="%" />
                <VitalStat icon={Thermometer} label="Suhu" value={latestVital.suhu != null ? String(latestVital.suhu) : "—"} unit="°C" />
                <VitalStat icon={Droplet} label="Gula Darah" value={latestVital.gula_darah != null ? String(latestVital.gula_darah) : "—"} unit="mg/dL" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Diperiksa pada {formatTanggalWaktu(latestVital.created_at)} · Hari ke-{latestVital.hari_ke}
              </p>
            </>
          ) : (
            <EmptyState icon={Activity} title="Belum ada data TTV" desc="Pemeriksaan tanda vital akan muncul di sini setelah dokter memeriksa Anda." />
          )}

          {latestScreenings.length > 0 && (
            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Skrining Terbaru
              </p>
              <div className="space-y-2">
                {latestScreenings.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-accent/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{labelScreening(s.jenis)}</p>
                      <p className="text-xs text-muted-foreground">Hari {s.hari_ke} · {formatTanggal(s.created_at)}</p>
                    </div>
                    {s.skor && (
                      <span className="ml-2 shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {s.skor}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" /> Notifikasi Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notifs.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState icon={Bell} title="Belum ada notifikasi" desc="Aktivitas pemeriksaan dan pesan akan muncul di sini." />
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {notifs.map((n) => {
                const Icon = n.icon;
                return (
                  <div key={n.id} className="flex items-start gap-3 px-6 py-3">
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${n.tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">{formatTanggalWaktu(n.ts)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Big navigation buttons */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          size="lg"
          variant="outline"
          className="h-16 text-lg"
          onClick={() => goJamaahRiwayat("ringkasan")}
        >
          <Activity className="mr-3 h-6 w-6 text-primary" />
          Riwayat Kesehatan
        </Button>
        <Button
          size="lg"
          className="h-16 text-lg"
          onClick={goJamaahChat}
        >
          <MessageCircle className="mr-3 h-6 w-6" />
          Chat Dokter
        </Button>
      </div>
    </div>
  );
}

function VitalStat({
  icon: Icon, label, value, unit,
}: {
  icon: LucideIcon; label: string; value: string; unit: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-bold tabular-nums">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

function labelScreening(jenis: string): string {
  const map: Record<string, string> = {
    INFECTIOUS: "Skrining Penyakit Menular",
    CHRONIC: "Monitoring Penyakit Kronis",
    FRAILTY: "Skrining Frailty",
    FALL_RISK: "Risiko Jatuh",
    NUTRITION: "Skrining Nutrisi",
    MENTAL: "Kesehatan Mental",
    SLEEP: "Kualitas Tidur",
    ACTIVITY: "Aktivitas Fisik",
    SPIRITUAL: "Skrining Spiritual",
    FAMILY_APGAR: "Family APGAR",
    FOLLOWUP: "Tindak Lanjut",
  };
  return map[jenis] ?? jenis;
}

// Merge helper: dedupe by id, sort newest first, cap 5
function mergeNotifs(existing: NotifItem[], incoming: NotifItem[]): NotifItem[] {
  const map = new Map<string, NotifItem>();
  for (const n of [...existing, ...incoming]) map.set(n.id, n);
  return Array.from(map.values())
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 5);
}
