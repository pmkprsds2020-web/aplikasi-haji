"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { JamaahData } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (jamaah: JamaahData) => void;
  initial?: JamaahData | null;
}

const FIELD_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function JamaahFormDialog({ open, onOpenChange, onSaved, initial }: Props) {
  const isEdit = !!initial;
  const [f, setF] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setF(
        initial
          ? {
              nama: initial.nama, nik: initial.nik, kloter: initial.kloter, porsi: initial.porsi,
              usia: String(initial.usia), kelamin: initial.kelamin, alamat: initial.alamat,
              hp: initial.hp, kontakKeluarga: initial.kontakKeluarga, email: (initial as Record<string, unknown>).email as string ?? "",
              tanggalTiba: initial.tanggalTiba.slice(0, 10),
              bandara: initial.bandara, kabupatenKota: initial.kabupatenKota,
              puskesmas: initial.puskesmas, dokterKeluarga: initial.dokterKeluarga,
              paspor: initial.paspor ?? "", embarkasi: initial.embarkasi ?? "",
              golDarah: initial.golDarah ?? "", riwayatPenyakit: initial.riwayatPenyakit ?? "",
              riwayatOperasi: initial.riwayatOperasi ?? "", alergi: initial.alergi ?? "",
              obatRutin: initial.obatRutin ?? "", statusIstithaah: initial.statusIstithaah ?? "Belum Dinilai",
              tanggalBerangkat: initial.tanggalBerangkat ? initial.tanggalBerangkat.slice(0, 10) : "",
            }
          : { kelamin: "L", tanggalTiba: new Date().toISOString().slice(0, 10), statusIstithaah: "Belum Dinilai", email: "" }
      );
    }
  }, [open, initial]);

  const set = (k: string, v: string) => setF((d) => ({ ...d, [k]: v }));

  async function handleSave() {
    if (!f.nama || !f.nik || !f.kloter || !f.porsi || !f.usia) {
      toast.error("Nama, NIK, Kloter, Porsi, dan Usia wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const payload = {
        nama: f.nama, nik: f.nik, kloter: f.kloter, porsi: f.porsi,
        usia: Number(f.usia), kelamin: f.kelamin,
        alamat: f.alamat ?? "", hp: f.hp ?? "",
        email: f.email ?? null,
        kontak_keluarga: f.kontakKeluarga ?? "",
        tanggal_tiba: f.tanggalTiba ? new Date(f.tanggalTiba).toISOString() : new Date().toISOString(),
        bandara: f.bandara ?? "", kabupaten_kota: f.kabupatenKota ?? "",
        puskesmas: f.puskesmas ?? "", dokter_keluarga: f.dokterKeluarga ?? "",
        paspor: f.paspor || null, embarkasi: f.embarkasi || null,
        gol_darah: f.golDarah || null,
        riwayat_penyakit: f.riwayatPenyakit || null,
        riwayat_operasi: f.riwayatOperasi || null,
        alergi: f.alergi || null, obat_rutin: f.obatRutin || null,
        status_istithaah: f.statusIstithaah || "Belum Dinilai",
        tanggal_berangkat: f.tanggalBerangkat ? new Date(f.tanggalBerangkat).toISOString() : null,
        tanggal_pulang: f.tanggalPulang ? new Date(f.tanggalPulang).toISOString() : null,
      };
      console.log("Saving Jamaah to Supabase...");
      console.log("Payload:", payload);
      let resData: Record<string, unknown> | null = null;
      let error: unknown = null;
      if (isEdit && initial) {
        const r = await supabase.from("jamaah").update(payload).eq("id", initial.id).select("*").single();
        resData = r.data; error = r.error;
      } else {
        const r = await supabase.from("jamaah").insert(payload).select("*").single();
        resData = r.data; error = r.error;
      }
      console.log("Supabase Response:", resData);
      console.log("Supabase Error:", error);

      // If the error is about 'email' column not existing (PGRST204),
      // retry without the email field — the column hasn't been added to Supabase yet.
      if (error && (error as { code?: string }).code === "PGRST204") {
        const errCode = (error as { code?: string }).code;
        const errMsg = (error as { message?: string }).message ?? "";
        if (errMsg.includes("email")) {
          console.warn("[JamaahForm] 'email' column not found — retrying without email field. Run supabase/ADD-EMAIL-COLUMN.sql to add it.");
          const payloadWithoutEmail = { ...payload };
          delete (payloadWithoutEmail as Record<string, unknown>).email;
          if (isEdit && initial) {
            const r2 = await supabase.from("jamaah").update(payloadWithoutEmail).eq("id", initial.id).select("*").single();
            resData = r2.data; error = r2.error;
          } else {
            const r2 = await supabase.from("jamaah").insert(payloadWithoutEmail).select("*").single();
            resData = r2.data; error = r2.error;
          }
          console.log("[JamaahForm] Retry response:", resData, "error:", error);
        }
      }

      if (error) {
        console.error("[JamaahForm] save failed:", error);
        const errMsg = (error as { message?: string }).message ?? String(error);
        toast.error(`Gagal menyimpan: ${errMsg}`);
        return;
      }
      toast.success(isEdit ? "Data jamaah diperbarui di Supabase" : "Jamaah baru ditambahkan ke Supabase");
      onSaved(resData as unknown as { id: string; nama: string; riskLevel: string; riskSummary: string });
      onOpenChange(false);
    } catch (err) {
      console.error("[JamaahForm] Exception:", err);
      toast.error(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">{isEdit ? "Edit Data Jamaah" : "Tambah Jamaah Baru"}</DialogTitle>
              <DialogDescription>Data dasar & kepulangan jamaah haji</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identitas</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs text-muted-foreground">Nama Lengkap *</Label>
                <input className={FIELD_CLASS} value={f.nama ?? ""} onChange={(e) => set("nama", e.target.value)} placeholder="H. Ahmad Suryana" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">NIK *</Label>
                <input className={FIELD_CLASS} value={f.nik ?? ""} onChange={(e) => set("nik", e.target.value)} placeholder="3201..." />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Nomor Kloter *</Label>
                <input className={FIELD_CLASS} value={f.kloter ?? ""} onChange={(e) => set("kloter", e.target.value)} placeholder="JKT-08" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Nomor Porsi *</Label>
                <input className={FIELD_CLASS} value={f.porsi ?? ""} onChange={(e) => set("porsi", e.target.value)} placeholder="H-2024-001234" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Usia *</Label>
                <input type="number" className={FIELD_CLASS} value={f.usia ?? ""} onChange={(e) => set("usia", e.target.value)} placeholder="65" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Jenis Kelamin</Label>
                <RadioGroup value={f.kelamin ?? "L"} onValueChange={(v) => set("kelamin", v)} className="flex gap-4 pt-1.5">
                  <div className="flex items-center gap-2"><RadioGroupItem value="L" id="jk-l" /><Label htmlFor="jk-l" className="text-sm font-normal">Laki-laki</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="P" id="jk-p" /><Label htmlFor="jk-p" className="text-sm font-normal">Perempuan</Label></div>
                </RadioGroup>
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs text-muted-foreground">Alamat</Label>
                <input className={FIELD_CLASS} value={f.alamat ?? ""} onChange={(e) => set("alamat", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Nomor HP</Label>
                <input className={FIELD_CLASS} value={f.hp ?? ""} onChange={(e) => set("hp", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Email</Label>
                <input type="email" className={FIELD_CLASS} value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="jamaah@email.com" />
                <p className="mt-1 text-[10px] text-muted-foreground">Email digunakan jamaah untuk registrasi akun. Jika kosong, jamaah tidak dapat login.</p>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Kontak Keluarga</Label>
                <input className={FIELD_CLASS} value={f.kontakKeluarga ?? ""} onChange={(e) => set("kontakKeluarga", e.target.value)} placeholder="Andi (anak) 0812..." />
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data Kepulangan</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Tanggal Tiba di Indonesia</Label>
                <input type="date" className={FIELD_CLASS} value={f.tanggalTiba ?? ""} onChange={(e) => set("tanggalTiba", e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Bandara Kedatangan</Label>
                <input className={FIELD_CLASS} value={f.bandara ?? ""} onChange={(e) => set("bandara", e.target.value)} placeholder="Soekarno-Hatta" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Kabupaten/Kota Tujuan</Label>
                <input className={FIELD_CLASS} value={f.kabupatenKota ?? ""} onChange={(e) => set("kabupatenKota", e.target.value)} placeholder="Kota Bekasi" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Puskesmas Pembina</Label>
                <input className={FIELD_CLASS} value={f.puskesmas ?? ""} onChange={(e) => set("puskesmas", e.target.value)} placeholder="Puskesmas Bekasi Selatan" />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs text-muted-foreground">Dokter Keluarga</Label>
                <input className={FIELD_CLASS} value={f.dokterKeluarga ?? ""} onChange={(e) => set("dokterKeluarga", e.target.value)} placeholder="dr. Rina Kartika" />
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profil Medis & Perjalanan (EHHR)</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Nomor Paspor</Label>
                <input className={FIELD_CLASS} value={f.paspor ?? ""} onChange={(e) => set("paspor", e.target.value)} placeholder="P2024..." />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Embarkasi</Label>
                <input className={FIELD_CLASS} value={f.embarkasi ?? ""} onChange={(e) => set("embarkasi", e.target.value)} placeholder="Jakarta (Soekarno-Hatta)" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Golongan Darah</Label>
                <input className={FIELD_CLASS} value={f.golDarah ?? ""} onChange={(e) => set("golDarah", e.target.value)} placeholder="O+ / A+ / B- / AB+" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Status Istithaah</Label>
                <select className={FIELD_CLASS} value={f.statusIstithaah ?? "Belum Dinilai"} onChange={(e) => set("statusIstithaah", e.target.value)}>
                  <option value="Belum Dinilai">Belum Dinilai</option>
                  <option value="Laik">Laik</option>
                  <option value="Bersyarat">Bersyarat</option>
                  <option value="Tidak Laik">Tidak Laik</option>
                </select>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Tanggal Berangkat</Label>
                <input type="date" className={FIELD_CLASS} value={f.tanggalBerangkat ?? ""} onChange={(e) => set("tanggalBerangkat", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs text-muted-foreground">Riwayat Penyakit</Label>
                <input className={FIELD_CLASS} value={f.riwayatPenyakit ?? ""} onChange={(e) => set("riwayatPenyakit", e.target.value)} placeholder="Hipertensi, DM tipe 2" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Riwayat Operasi</Label>
                <input className={FIELD_CLASS} value={f.riwayatOperasi ?? ""} onChange={(e) => set("riwayatOperasi", e.target.value)} placeholder="Appendectomy 2010" />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Alergi</Label>
                <input className={FIELD_CLASS} value={f.alergi ?? ""} onChange={(e) => set("alergi", e.target.value)} placeholder="Penisilin / makanan laut" />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1 block text-xs text-muted-foreground">Obat Rutin</Label>
                <input className={FIELD_CLASS} value={f.obatRutin ?? ""} onChange={(e) => set("obatRutin", e.target.value)} placeholder="Amlodipine 10mg, Metformin 1000mg" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEdit ? "Simpan Perubahan" : "Tambah Jamaah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
