"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, ClipboardList, Pill, Syringe, Footprints, GraduationCap,
  FlaskConical, HeartPulse, TestTube, Plane, CalendarDays, Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { JamaahDetail } from "@/lib/types";
import type { PreHajjBundle } from "@/lib/pre-hajj-types";
import { PRE_HAJJ_SCREENING_META } from "@/lib/pre-hajj-types";
import { SCREENING_META } from "@/lib/screening-meta";
import { formatTanggal } from "@/lib/format";

interface Props {
  jamaah: JamaahDetail;
  preHajj: PreHajjBundle | null;
}

type TimelineItem = {
  id: string;
  date: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: "primary" | "amber" | "rose" | "emerald" | "sky" | "violet";
  badge?: string;
};

const TONE_CLASS: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300",
};

export function RiwayatTab({ jamaah, preHajj }: Props) {
  const items = React.useMemo<TimelineItem[]>(() => {
    const out: TimelineItem[] = [];

    // Profil dibuat
    out.push({
      id: "created",
      date: jamaah.createdAt,
      title: "Rekam Medis Dibuat",
      desc: "Jamaah terdaftar dalam Electronic Hajj Health Record",
      icon: CalendarDays,
      tone: "primary",
    });

    // Pra Haji
    if (preHajj) {
      preHajj.vitals.forEach((v) =>
        out.push({
          id: v.id,
          date: v.createdAt,
          title: "Pemeriksaan TTV Pra Haji",
          desc: `TD ${v.tdSistolik ?? "-"}/${v.tdDiastolik ?? "-"} · BB ${v.beratBadan ?? "-"}kg · SpO₂ ${v.spo2 ?? "-"}%`,
          icon: Activity,
          tone: "emerald",
        })
      );
      preHajj.labs.forEach((l) =>
        out.push({
          id: l.id,
          date: l.createdAt,
          title: "Pemeriksaan Laboratorium",
          desc: `GDP ${l.gdp ?? "-"} · HbA1c ${l.hba1c ?? "-"} · Kreatinin ${l.kreatinin ?? "-"}`,
          icon: FlaskConical,
          tone: "violet",
        })
      );
      preHajj.screenings.forEach((s) => {
        const meta = PRE_HAJJ_SCREENING_META[s.jenis];
        out.push({
          id: s.id,
          date: s.createdAt,
          title: `Skrining Pra Haji: ${meta?.judul ?? s.jenis}`,
          desc: s.skor ? `Hasil: ${s.skor}` : "Selesai",
          icon: ClipboardList,
          tone: "amber",
          badge: s.skor ?? undefined,
        });
      });
      preHajj.medications.forEach((m) =>
        out.push({
          id: m.id,
          date: m.createdAt,
          title: `Obat Ditambahkan: ${m.namaObat}`,
          desc: `${m.dosis ?? ""} ${m.frekuensi ?? ""} · ${m.indikasi ?? ""}`.trim(),
          icon: Pill,
          tone: "sky",
        })
      );
      preHajj.immunizations.forEach((im) =>
        out.push({
          id: im.id,
          date: im.tanggalVaksin ?? im.createdAt,
          title: `Imunisasi: ${im.jenis}`,
          desc: im.nomorBatch ? `Batch ${im.nomorBatch}` : "Vaksin tercatat",
          icon: Syringe,
          tone: "emerald",
          badge: "Vaksin",
        })
      );
      preHajj.fitness.forEach((f) =>
        out.push({
          id: f.id,
          date: f.createdAt,
          title: "Catatan Kebugaran",
          desc: `Target ${f.targetLangkah ?? "-"} langkah · Jalan ${f.jalanKaki ?? "-"}mnt`,
          icon: Footprints,
          tone: "primary",
        })
      );
      if (preHajj.education) {
        const edu = preHajj.education;
        const done = [edu.diet, edu.aktivitas, edu.obat, edu.hidrasi, edu.istirahat, edu.manajemenKronis, edu.persiapanPerjalanan].filter(Boolean).length;
        out.push({
          id: edu.id,
          date: jamaah.tanggalBerangkat ?? jamaah.createdAt,
          title: "Edukasi Pra Haji",
          desc: `${done}/7 topik edukasi selesai`,
          icon: GraduationCap,
          tone: "sky",
          badge: `${done}/7`,
        });
      }
      preHajj.aiAssessments.forEach((a) =>
        out.push({
          id: a.id,
          date: a.createdAt,
          title: "AI Assessment Pra Haji",
          desc: `Kesiapan: ${a.kesiapanBerangkat}`,
          icon: Sparkles,
          tone: "violet",
          badge: a.kesiapanBerangkat,
        })
      );
    }

    // Keberangkatan & kepulangan
    if (jamaah.tanggalBerangkat) {
      out.push({
        id: "berangkat",
        date: jamaah.tanggalBerangkat,
        title: "Berangkat Haji",
        desc: `Embarkasi ${jamaah.embarkasi ?? "-"}`,
        icon: Plane,
        tone: "primary",
        badge: "Keberangkatan",
      });
    }
    out.push({
      id: "pulang",
      date: jamaah.tanggalTiba,
      title: "Pulang Haji",
      desc: `Tiba di ${jamaah.bandara}`,
      icon: Plane,
      tone: "emerald",
      badge: "Kepulangan",
    });

    // Pasca Haji
    jamaah.vitalSigns.forEach((v) =>
      out.push({
        id: v.id,
        date: v.createdAt,
        title: `Monitoring TTV Hari ${v.hariKe}`,
        desc: `TD ${v.tdSistolik ?? "-"}/${v.tdDiastolik ?? "-"} · SpO₂ ${v.spo2 ?? "-"}% · GD ${v.gulaDarah ?? "-"}`,
        icon: Activity,
        tone: v.hariKe === 1 ? "emerald" : "primary",
        badge: `Hari ${v.hariKe}`,
      })
    );
    jamaah.screenings.forEach((s) => {
      const meta = SCREENING_META[s.jenis as keyof typeof SCREENING_META];
      out.push({
        id: s.id,
        date: s.createdAt,
        title: `Skrining Pasca Haji: ${meta?.judul ?? s.jenis}`,
        desc: s.skor ? `Hasil: ${s.skor}` : "Selesai",
        icon: ClipboardList,
        tone: "amber",
        badge: `Hari ${s.hariKe}`,
      });
    });

    // sort chronological (oldest first for timeline)
    return out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [jamaah, preHajj]);

  // group by date (day)
  const grouped = React.useMemo(() => {
    const map: Record<string, TimelineItem[]> = {};
    for (const it of items) {
      const key = formatTanggal(it.date);
      (map[key] ??= []).push(it);
    }
    return Object.entries(map);
  }, [items]);

  if (!items.length) {
    return (
      <Card className="p-6">
        <p className="py-6 text-center text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-primary" /> Riwayat Aktivitas Jamaah
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Kronologi lengkap Electronic Hajj Health Record — Pra Haji hingga Pasca Haji
        </p>
      </CardHeader>
      <CardContent>
        <div className="max-h-[640px] overflow-y-auto scrollbar-thin pr-2">
          <div className="relative">
            {/* vertical line */}
            <div className="absolute bottom-0 left-[15px] top-2 w-px bg-border" />
            <div className="space-y-5">
              {grouped.map(([date, dayItems]) => (
                <div key={date} className="relative">
                  <div className="sticky top-0 z-10 mb-2 -ml-1 inline-block rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground shadow-sm ring-1 ring-border/50">
                    {date}
                  </div>
                  <div className="space-y-2.5">
                    {dayItems.map((it) => {
                      const Icon = it.icon;
                      return (
                        <div key={it.id} className="relative flex gap-3 pl-0.5">
                          <span className={`relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card ${TONE_CLASS[it.tone]}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-card p-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{it.title}</p>
                              {it.badge && <Badge variant="secondary" className="text-[10px]">{it.badge}</Badge>}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">{it.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
