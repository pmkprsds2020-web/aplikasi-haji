"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Phone, MapPin, Calendar, Plane, Users, Stethoscope, Droplet, Pill,
  FileText, AlertTriangle, ShieldCheck, Pencil, User, IdCard, HeartPulse,
} from "lucide-react";
import type { JamaahData } from "@/lib/types";
import { formatTanggal, hariSejak, kelaminLabel, initials } from "@/lib/format";
import { istithaahStyle, completenessBadge } from "@/lib/completeness";
import { QrIdentitas } from "./qr-identitas";
import { JamaahFormDialog } from "./jamaah-form-dialog";

interface Props {
  jamaah: JamaahData;
  profilPct: number;
  onEdit: () => void;
}

export function ProfilTab({ jamaah, profilPct, onEdit }: Props) {
  const istithaah = istithaahStyle(jamaah.statusIstithaah);
  const badge = completenessBadge(profilPct);

  return (
    <div className="space-y-4">
      {/* Header profil */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary ring-2 ring-primary/20">
                {initials(jamaah.nama)}
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight">{jamaah.nama}</h2>
                <p className="text-sm text-muted-foreground">
                  {jamaah.usia} tahun · {kelaminLabel(jamaah.kelamin)} · Kloter {jamaah.kloter}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${istithaah.className}`}>
                    <ShieldCheck className="h-3 w-3" /> Istithaah: {istithaah.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                    Kelengkapan {profilPct}%
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Profil
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Identitas */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" /> Identitas Lengkap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <InfoRow icon={IdCard} label="NIK" value={jamaah.nik} mono />
              <InfoRow icon={IdCard} label="Nomor Porsi" value={jamaah.porsi} mono />
              <InfoRow icon={FileText} label="Nomor Paspor" value={jamaah.paspor} mono />
              <InfoRow icon={Plane} label="Embarkasi" value={jamaah.embarkasi} />
              <InfoRow icon={Droplet} label="Golongan Darah" value={jamaah.golDarah} />
              <InfoRow icon={Phone} label="No. HP" value={jamaah.hp} />
              <InfoRow icon={Users} label="Kontak Keluarga" value={jamaah.kontakKeluarga} />
              <InfoRow icon={MapPin} label="Alamat" value={jamaah.alamat} />
            </dl>

            <div className="mt-4 border-t border-border/60 pt-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Riwayat Medis</h4>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <InfoRow icon={HeartPulse} label="Riwayat Penyakit" value={jamaah.riwayatPenyakit} />
                <InfoRow icon={FileText} label="Riwayat Operasi" value={jamaah.riwayatOperasi} />
                <InfoRow icon={AlertTriangle} label="Alergi" value={jamaah.alergi} highlight={!!jamaah.alergi && jamaah.alergi !== "-"} />
                <InfoRow icon={Pill} label="Obat Rutin" value={jamaah.obatRutin} />
              </dl>
            </div>
          </CardContent>
        </Card>

        {/* QR + timeline keberangkatan */}
        <div className="space-y-4">
          <QrIdentitas jamaah={jamaah} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Plane className="h-4 w-4 text-primary" /> Perjalanan Haji
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-accent/40 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Tanggal Berangkat
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  {jamaah.tanggalBerangkat ? formatTanggal(jamaah.tanggalBerangkat) : "Belum ditentukan"}
                </p>
              </div>
              <div className="rounded-lg bg-accent/40 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Plane className="h-3.5 w-3.5" /> Tanggal Pulang (Tiba)
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  {formatTanggal(jamaah.tanggalTiba)}
                </p>
                <p className="text-xs text-muted-foreground">{hariSejak(jamaah.tanggalTiba)} hari pasca pulang</p>
              </div>
              <div className="rounded-lg bg-accent/40 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Stethoscope className="h-3.5 w-3.5" /> Pembina Kesehatan
                </p>
                <p className="mt-0.5 text-sm font-semibold">{jamaah.dokterKeluarga}</p>
                <p className="text-xs text-muted-foreground">{jamaah.puskesmas}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon, label, value, mono, highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
  mono?: boolean;
  highlight?: boolean;
}) {
  const empty = !value || value === "-" || value === "";
  return (
    <div className="flex items-start gap-2.5">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${highlight ? "text-rose-500" : "text-muted-foreground"}`} />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={`text-sm ${mono ? "font-mono" : ""} ${highlight ? "font-semibold text-rose-600 dark:text-rose-400" : empty ? "italic text-muted-foreground/60" : "font-medium"}`}>
          {empty ? "—" : value}
        </dd>
      </div>
    </div>
  );
}

// local HeartPulse import moved to top
