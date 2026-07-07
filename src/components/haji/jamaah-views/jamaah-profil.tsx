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
  ArrowLeft, User, Phone, MapPin, HeartPulse, Plane,
  IdCard, FileText, Droplet, Pill, AlertTriangle, ShieldCheck,
  Mail, Calendar, Users, type LucideIcon,
} from "lucide-react";
import {
  formatTanggal, hariSejak, initials, kelaminLabel,
} from "@/lib/format";
import { EmptyState } from "../shared";

interface JamaahRow {
  id: string; user_id: string | null;
  nama: string; nik: string; kloter: string; porsi: string;
  usia: number; kelamin: string;
  alamat: string; hp: string; kontak_keluarga: string;
  tanggal_tiba: string; tanggal_berangkat: string | null;
  tanggal_pulang: string | null;
  bandara: string; kabupaten_kota: string; puskesmas: string;
  dokter_keluarga: string | null;
  paspor: string | null; embarkasi: string | null;
  gol_darah: string | null;
  riwayat_penyakit: string | null; riwayat_operasi: string | null;
  alergi: string | null; obat_rutin: string | null;
  status_istithaah: string | null;
}
interface ProfileRow { full_name: string | null; email: string | null; phone: string | null; }

export function JamaahProfil() {
  const { user } = useSupabaseAuth();
  const { goJamaahDashboard } = useApp();
  const supabase = React.useMemo(() => createClient(), []);

  const [jamaah, setJamaah] = React.useState<JamaahRow | null>(null);
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user?.id) return;
      setLoading(true);

      // 1. Fetch jamaah by user_id
      const { data: jRow, error: jErr } = await supabase
        .from("jamaah").select("*").eq("user_id", user.id).maybeSingle();
      if (jErr) { console.error(jErr); toast.error(jErr.message); setLoading(false); return; }
      if (!jRow) { if (mounted) setJamaah(null); setLoading(false); return; }
      if (!mounted) return;
      setJamaah(jRow as JamaahRow);

      // 2. Fetch linked auth profile
      const { data: pRow, error: pErr } = await supabase
        .from("profiles").select("full_name,email,phone").eq("id", user.id).maybeSingle();
      if (pErr) { console.error(pErr); toast.error(pErr.message); }
      else if (mounted && pRow) setProfile(pRow as ProfileRow);

      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [supabase, user?.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!jamaah) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={User}
              title="Data jamaah belum terhubung"
              desc="Akun Anda belum dikaitkan dengan data jamaah. Hubungi klinik untuk mendapatkan akses."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const istithaah = istithaahLabel(jamaah.status_istithaah);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
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
        <h1 className="text-xl font-bold sm:text-2xl">Profil Saya</h1>
      </div>

      {/* Profile header card */}
      <Card className="overflow-hidden border-primary/15">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:gap-5">
          <span
            className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-sm ring-4 ring-primary/15"
            aria-hidden
          >
            {initials(jamaah.nama)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold tracking-tight">{jamaah.nama}</h2>
            <p className="mt-1 text-base text-muted-foreground">
              {jamaah.usia} tahun · {kelaminLabel(jamaah.kelamin)} · Gol. Darah {jamaah.gol_darah || "—"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Istithaah: {istithaah.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-3 py-1 text-sm font-medium">
                <Plane className="h-3.5 w-3.5 text-primary" />
                Kloter {jamaah.kloter} · Porsi {jamaah.porsi}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identitas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" /> Identitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow icon={IdCard} label="NIK" value={jamaah.nik} mono />
            <InfoRow icon={IdCard} label="Nomor Porsi" value={jamaah.porsi} mono />
            <InfoRow icon={FileText} label="Nomor Paspor" value={jamaah.paspor} mono />
            <InfoRow icon={Plane} label="Embarkasi" value={jamaah.embarkasi} />
            <InfoRow icon={Droplet} label="Golongan Darah" value={jamaah.gol_darah} />
            <InfoRow icon={User} label="Jenis Kelamin" value={kelaminLabel(jamaah.kelamin)} />
            <InfoRow icon={Calendar} label="Usia" value={`${jamaah.usia} tahun`} />
            <InfoRow icon={Users} label="Kabupaten/Kota" value={jamaah.kabupaten_kota} />
          </dl>
        </CardContent>
      </Card>

      {/* Kontak */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-primary" /> Kontak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow icon={Phone} label="No. HP" value={jamaah.hp} />
            <InfoRow icon={Users} label="Kontak Keluarga" value={jamaah.kontak_keluarga} />
            <InfoRow icon={Mail} label="Email" value={profile?.email} mono />
            <InfoRow icon={Phone} label="Telepon (Akun)" value={profile?.phone} />
            <InfoRow icon={MapPin} label="Alamat" value={jamaah.alamat} full />
          </dl>
        </CardContent>
      </Card>

      {/* Medis */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4 text-primary" /> Medis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow icon={HeartPulse} label="Riwayat Penyakit" value={jamaah.riwayat_penyakit} full />
            <InfoRow icon={FileText} label="Riwayat Operasi" value={jamaah.riwayat_operasi} full />
            <InfoRow
              icon={AlertTriangle}
              label="Alergi"
              value={jamaah.alergi}
              highlight={!!jamaah.alergi && jamaah.alergi !== "-"}
              full
            />
            <InfoRow icon={Pill} label="Obat Rutin" value={jamaah.obat_rutin} full />
            <InfoRow icon={ShieldCheck} label="Status Istithaah" value={istithaah.label} />
            <InfoRow icon={HeartPulse} label="Dokter Keluarga" value={jamaah.dokter_keluarga} />
            <InfoRow icon={MapPin} label="Puskesmas" value={jamaah.puskesmas} />
          </dl>
        </CardContent>
      </Card>

      {/* Perjalanan Haji */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="h-4 w-4 text-primary" /> Perjalanan Haji
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-accent/40 p-4">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" /> Tanggal Berangkat
              </p>
              <p className="mt-1 text-lg font-semibold">
                {jamaah.tanggal_berangkat ? formatTanggal(jamaah.tanggal_berangkat) : "Belum ditentukan"}
              </p>
            </div>
            <div className="rounded-xl bg-accent/40 p-4">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Plane className="h-4 w-4" /> Tanggal Pulang (Tiba)
              </p>
              <p className="mt-1 text-lg font-semibold">
                {jamaah.tanggal_tiba ? formatTanggal(jamaah.tanggal_tiba) : "Belum ditentukan"}
              </p>
              <p className="text-xs text-muted-foreground">
                {jamaah.tanggal_tiba ? `${hariSejak(jamaah.tanggal_tiba)} hari pasca pulang` : ""}
              </p>
            </div>
            <div className="rounded-xl bg-accent/40 p-4">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Plane className="h-4 w-4" /> Bandara Kedatangan
              </p>
              <p className="mt-1 text-lg font-semibold">{jamaah.bandara || "—"}</p>
            </div>
            <div className="rounded-xl bg-accent/40 p-4">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" /> Kloter & Porsi
              </p>
              <p className="mt-1 text-lg font-semibold">
                Kloter {jamaah.kloter} · Porsi {jamaah.porsi}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="pb-2 text-center text-sm text-muted-foreground">
        Data profil hanya dapat diubah oleh dokter.
        Jika ada informasi yang tidak sesuai, mohon hubungi dokter pendamping Anda.
      </p>
    </div>
  );
}

function InfoRow({
  icon: Icon, label, value, mono, highlight, full,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
  mono?: boolean;
  highlight?: boolean;
  full?: boolean;
}) {
  const empty = !value || value === "-" || value === "";
  return (
    <div className={`flex items-start gap-2.5 ${full ? "sm:col-span-2" : ""}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${highlight ? "text-rose-500" : "text-muted-foreground"}`} />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className={`text-base ${mono ? "font-mono" : ""} ${highlight ? "font-semibold text-rose-600 dark:text-rose-400" : empty ? "italic text-muted-foreground/60" : "font-medium"}`}>
          {empty ? "—" : value}
        </dd>
      </div>
    </div>
  );
}

function istithaahLabel(s: string | null | undefined): { label: string } {
  if (!s) return { label: "Belum dinilai" };
  const v = s.toLowerCase();
  if (v.includes("sehat") || v === "true" || v === "1") return { label: "Sehat/Istithaah" };
  if (v.includes("tidak")) return { label: "Tidak Istithaah" };
  return { label: s };
}
