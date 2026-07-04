"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { SCREENING_META } from "@/lib/screening-meta";
import type { JenisSkrining } from "@/lib/types";
import {
  YesNoField, ScoreRadioGroup, NumberField, SectionLabel, getIcon,
} from "./shared";

interface Props {
  jamaahId: string;
  jenis: JenisSkrining | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

const HARI_OPTS = [
  { value: "1", label: "Hari 1 — Skrining awal" },
  { value: "7", label: "Hari 7 — Monitoring infeksi" },
  { value: "14", label: "Hari 14 — Monitoring kronis" },
  { value: "30", label: "Hari 30 — Evaluasi komprehensif" },
];

export function ScreeningDialog({ jamaahId, jenis, open, onOpenChange, onSaved }: Props) {
  const [data, setData] = React.useState<Record<string, unknown>>({});
  const [catatan, setCatatan] = React.useState("");
  const [hariKe, setHariKe] = React.useState("1");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setData({});
      setCatatan("");
      setHariKe("1");
    }
  }, [open, jenis]);

  if (!jenis) return null;
  const meta = SCREENING_META[jenis];
  const Icon = getIcon(meta.icon);

  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));
  const b = (k: string) => Boolean(data[k]);
  const n = (k: string) => (data[k] === undefined || data[k] === "" ? "" : String(data[k]));

  // === Skoring per jenis ===
  function computeSkor(j: JenisSkrining, d: Record<string, unknown>): string {
    const bool = (v: unknown) => v === true;
    switch (j) {
      case "INFECTIOUS": {
        const demam = bool(d.ispa_demam) || bool(d.covid_demam) || bool(d.mers_demam);
        const sesak = bool(d.ispa_sesak) || bool(d.covid_sesak) || bool(d.mers_sesak) || bool(d.pneu_napasCepat);
        const mersKontak = bool(d.mers_kontak);
        if ((demam && sesak) || (mersKontak && (demam || bool(d.mers_batuk))) || bool(d.pneu_napasCepat)) return "Tinggi";
        const gejala = Object.values(d).filter(bool).length;
        return gejala > 0 ? "Sedang" : "Rendah";
      }
      case "CHRONIC": {
        if (bool(d.jantung_nyeriDada) || (bool(d.jantung_sesak) && bool(d.jantung_bengkak)) || bool(d.dm_hipo)) return "Tidak Terkontrol";
        const gd = d.dm_gulaDarah !== undefined && d.dm_gulaDarah !== "" ? Number(d.dm_gulaDarah) : NaN;
        if (!Number.isNaN(gd) && gd >= 250) return "Tidak Terkontrol";
        if (bool(d.ht_tidakPatuh) || bool(d.dm_tidakPatuh) || bool(d.ppok_sesak) || bool(d.ginjal_edema) || (!Number.isNaN(gd) && gd >= 180)) return "Perlu Pemantauan";
        return "Stabil";
      }
      case "FRAILTY": {
        const t = ["fatigue", "resistance", "ambulation", "illness", "lossWeight"].reduce((a, k) => a + (bool(d[k]) ? 1 : 0), 0);
        if (t === 0) return "Robust";
        if (t <= 2) return "Pre-frail";
        return "Frail";
      }
      case "FALL_RISK": {
        const t = ["jatuhSetahun", "gangguanKeseimbangan", "alatBantu"].reduce((a, k) => a + (bool(d[k]) ? 1 : 0), 0);
        if (t === 0) return "Rendah";
        if (t === 1) return "Sedang";
        return "Tinggi";
      }
      case "NUTRITION": {
        const keys = ["nafsuMakan", "penurunanBB", "mobilitas", "stresAkut", "neuropsikologis", "imt"];
        const t = keys.reduce((a, k) => a + (typeof d[k] === "number" ? (d[k] as number) : 0), 0);
        if (t >= 12) return "Normal";
        if (t >= 8) return "Risiko Malnutrisi";
        return "Malnutrisi";
      }
      case "MENTAL": {
        const phqKeys = ["phq9_1", "phq9_2", "phq9_3", "phq9_4", "phq9_5", "phq9_6", "phq9_7", "phq9_8"];
        const phq = phqKeys.reduce((a, k) => a + (typeof d[k] === "number" ? (d[k] as number) : 0), 0);
        if (phq <= 4) return "Minimal";
        if (phq <= 9) return "Ringan";
        if (phq <= 14) return "Sedang";
        if (phq <= 19) return "Sedang-Berat";
        return "Berat";
      }
      case "SLEEP": {
        const t = ["sulitTidur", "seringTerbangun", "tidakNyenyak"].reduce((a, k) => a + (typeof d[k] === "number" ? (d[k] as number) : 0), 0);
        if (t <= 4) return "Tidak Ada Insomnia";
        if (t <= 6) return "Insomnia Subklinis";
        if (t <= 9) return "Insomnia Sedang";
        return "Insomnia Berat";
      }
      case "ACTIVITY": {
        const mandiri = bool(d.jalanMandiri);
        const normal = bool(d.aktivitasNormal);
        const butuh = bool(d.butuhBantuan);
        if (mandiri && normal && !butuh) return "Mandiri";
        if (butuh && (mandiri || normal)) return "Bantuan Sebagian";
        return "Ketergantungan";
      }
      case "SPIRITUAL": {
        if (bool(d.ibadahRutin) && bool(d.ketenangan) && !bool(d.hambatanIbadah)) return "Baik";
        return "Perlu Pendampingan";
      }
      case "FAMILY_APGAR": {
        const keys = ["adaptation", "partnership", "growth", "affection", "resolve"];
        const t = keys.reduce((a, k) => a + (typeof d[k] === "number" ? (d[k] as number) : 0), 0);
        if (t >= 7) return "Fungsional";
        if (t >= 4) return "Disfungsi Sedang";
        return "Disfungsi Berat";
      }
      case "FOLLOWUP": {
        const any = ["kontrolDokter", "homeVisit", "konsultasiGizi", "rehabilitasi", "konselingPsikologis"].some((k) => bool(d[k]));
        return any ? "Perlu Tindak Lanjut" : "Tidak Ada";
      }
      default:
        return "";
    }
  }

  const skor = computeSkor(jenis, data);

  async function handleSave() {
    setSaving(true);
    try {
      const { validateJamaahId } = await import("@/lib/validate-jamaah-id");
      const idCheck = validateJamaahId(jamaahId);
      if (!idCheck.valid) {
        console.error("[Screening] Invalid jamaah_id:", idCheck.error);
        toast.error(idCheck.error || "jamaah_id tidak valid");
        setSaving(false);
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const payload = {
        jamaah_id: jamaahId,
        jenis,
        data: JSON.stringify(data),
        skor,
        catatan: catatan || null,
        hari_ke: Number(hariKe),
      };
      console.log("Saving Screening to Supabase...");
      console.log("Payload:", payload);
      const { data: resData, error } = await supabase.from("screening").insert(payload);
      console.log("Supabase Response:", resData);
      console.log("Supabase Error:", error);
      if (error) {
        console.error("[Screening] INSERT failed:", error);
        toast.error(`Gagal menyimpan skrining: ${error.message}`);
        return;
      }
      toast.success(`Skrining ${meta.judul} tersimpan di Supabase — skor: ${skor}`);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("[Screening] Exception:", err);
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
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">{meta.judul}</DialogTitle>
              <DialogDescription>{meta.singkat}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form per jenis */}
          <FormBody jenis={jenis} data={data} set={set} b={b} n={n} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs font-medium text-muted-foreground">Jadwal Monitoring</Label>
              <Select value={hariKe} onValueChange={setHariKe}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HARI_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <p className="text-xs text-muted-foreground">Skor otomatis</p>
                <p className="text-sm font-bold text-primary">{skor}</p>
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Catatan klinis (opsional)</Label>
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Catatan temuan klinis…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Skrining
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Body per jenis =====
type SetFn = (k: string, v: unknown) => void;
interface FormBodyProps {
  jenis: JenisSkrining;
  data: Record<string, unknown>;
  set: SetFn;
  b: (k: string) => boolean;
  n: (k: string) => string;
}

function FormBody({ jenis, set, b, n }: FormBodyProps) {
  switch (jenis) {
    case "INFECTIOUS":
      return (
        <div className="space-y-4">
          <div>
            <SectionLabel>Gejala ISPA</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <YesNoField label="Demam" checked={b("ispa_demam")} onChange={(v) => set("ispa_demam", v)} />
              <YesNoField label="Batuk" checked={b("ispa_batuk")} onChange={(v) => set("ispa_batuk", v)} />
              <YesNoField label="Pilek" checked={b("ispa_pilek")} onChange={(v) => set("ispa_pilek", v)} />
              <YesNoField label="Sakit tenggorokan" checked={b("ispa_tenggorok")} onChange={(v) => set("ispa_tenggorok", v)} />
              <YesNoField label="Sesak napas" checked={b("ispa_sesak")} onChange={(v) => set("ispa_sesak", v)} />
            </div>
          </div>
          <div>
            <SectionLabel>Gejala Pneumonia</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <YesNoField label="Napas cepat" checked={b("pneu_napasCepat")} onChange={(v) => set("pneu_napasCepat", v)} />
              <YesNoField label="Nyeri dada" checked={b("pneu_nyeriDada")} onChange={(v) => set("pneu_nyeriDada", v)} />
              <YesNoField label="Batuk berdahak" checked={b("pneu_batukDahak")} onChange={(v) => set("pneu_batukDahak", v)} />
            </div>
          </div>
          <div>
            <SectionLabel>Gejala COVID-19</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <YesNoField label="Demam" checked={b("covid_demam")} onChange={(v) => set("covid_demam", v)} />
              <YesNoField label="Batuk" checked={b("covid_batuk")} onChange={(v) => set("covid_batuk", v)} />
              <YesNoField label="Kehilangan penciuman" checked={b("covid_hilangPenciuman")} onChange={(v) => set("covid_hilangPenciuman", v)} />
              <YesNoField label="Sesak" checked={b("covid_sesak")} onChange={(v) => set("covid_sesak", v)} />
            </div>
          </div>
          <div>
            <SectionLabel>Gejala MERS-CoV</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <YesNoField label="Demam" checked={b("mers_demam")} onChange={(v) => set("mers_demam", v)} />
              <YesNoField label="Batuk" checked={b("mers_batuk")} onChange={(v) => set("mers_batuk", v)} />
              <YesNoField label="Sesak" checked={b("mers_sesak")} onChange={(v) => set("mers_sesak", v)} />
              <YesNoField label="Riwayat kontak dengan kasus" checked={b("mers_kontak")} onChange={(v) => set("mers_kontak", v)} hint="Tandai jika ada kontak terkonfirmasi MERS" />
            </div>
          </div>
          <div>
            <SectionLabel>Gejala Gastroenteritis</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <YesNoField label="Diare" checked={b("gastro_diare")} onChange={(v) => set("gastro_diare", v)} />
              <YesNoField label="Mual" checked={b("gastro_mual")} onChange={(v) => set("gastro_mual", v)} />
              <YesNoField label="Muntah" checked={b("gastro_muntah")} onChange={(v) => set("gastro_muntah", v)} />
              <YesNoField label="Nyeri perut" checked={b("gastro_nyeri")} onChange={(v) => set("gastro_nyeri", v)} />
            </div>
          </div>
        </div>
      );

    case "CHRONIC":
      return (
        <div className="space-y-4">
          <div>
            <SectionLabel>Diabetes Mellitus</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <NumberField label="Gula darah sewaktu" value={n("dm_gulaDarah")} onChange={(v) => set("dm_gulaDarah", v)} unit="mg/dL" />
              <div className="flex flex-col gap-2">
                <YesNoField label="Tidak patuh minum obat" checked={b("dm_tidakPatuh")} onChange={(v) => set("dm_tidakPatuh", v)} />
                <YesNoField label="Keluhan hipoglikemia" checked={b("dm_hipo")} onChange={(v) => set("dm_hipo", v)} />
              </div>
            </div>
          </div>
          <div>
            <SectionLabel>Hipertensi</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <NumberField label="Tekanan darah sistolik" value={n("ht_sistolik")} onChange={(v) => set("ht_sistolik", v)} unit="mmHg" />
              <NumberField label="Tekanan darah diastolik" value={n("ht_diastolik")} onChange={(v) => set("ht_diastolik", v)} unit="mmHg" />
              <YesNoField label="Tidak patuh minum obat" checked={b("ht_tidakPatuh")} onChange={(v) => set("ht_tidakPatuh", v)} />
            </div>
          </div>
          <div>
            <SectionLabel>Penyakit Jantung</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-3">
              <YesNoField label="Sesak" checked={b("jantung_sesak")} onChange={(v) => set("jantung_sesak", v)} />
              <YesNoField label="Bengkak tungkai" checked={b("jantung_bengkak")} onChange={(v) => set("jantung_bengkak", v)} />
              <YesNoField label="Nyeri dada" checked={b("jantung_nyeriDada")} onChange={(v) => set("jantung_nyeriDada", v)} />
            </div>
          </div>
          <div>
            <SectionLabel>PPOK / Asthma</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-3">
              <YesNoField label="Sesak" checked={b("ppok_sesak")} onChange={(v) => set("ppok_sesak", v)} />
              <NumberField label="Frekuensi sesak (minggu)" value={n("ppok_frekuensi")} onChange={(v) => set("ppok_frekuensi", v)} unit="×/mgg" />
              <YesNoField label="Penggunaan inhaler" checked={b("ppok_inhaler")} onChange={(v) => set("ppok_inhaler", v)} />
            </div>
          </div>
          <div>
            <SectionLabel>Gagal Ginjal</SectionLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              <YesNoField label="Jadwal kontrol teratur" checked={b("ginjal_kontrol")} onChange={(v) => set("ginjal_kontrol", v)} />
              <YesNoField label="Keluhan edema" checked={b("ginjal_edema")} onChange={(v) => set("ginjal_edema", v)} />
            </div>
          </div>
        </div>
      );

    case "FRAILTY": {
      const items = [
        { k: "fatigue", label: "Fatigue — Seberapa sering Anda merasa lelah sebagian besar waktu?" },
        { k: "resistance", label: "Resistance — Kesulitan menaiki 10 anak tangga tanpa bantuan?" },
        { k: "ambulation", label: "Ambulation — Kesulitan berjalan beberapa ratus meter sendirian?" },
        { k: "illness", label: "Illness — Memiliki ≥5 penyakit kronis?" },
        { k: "lossWeight", label: "Loss of Weight — Penurunan berat badan ≥5% dalam 12 bulan?" },
      ];
      return (
        <div className="space-y-3">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            FRAIL Scale — jawab setiap pertanyaan dengan Ya (1) / Tidak (0).
          </p>
          {items.map((it) => (
            <YesNoField key={it.k} label={it.label} checked={b(it.k)} onChange={(v) => set(it.k, v)} />
          ))}
        </div>
      );
    }

    case "FALL_RISK":
      return (
        <div className="space-y-3">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            Skrining Risiko Jatuh — 3 pertanyaan singkat.
          </p>
          <YesNoField label="Pernah jatuh dalam 1 tahun terakhir?" checked={b("jatuhSetahun")} onChange={(v) => set("jatuhSetahun", v)} />
          <YesNoField label="Gangguan keseimbangan saat berdiri/berjalan?" checked={b("gangguanKeseimbangan")} onChange={(v) => set("gangguanKeseimbangan", v)} />
          <YesNoField label="Menggunakan alat bantu jalan (tongkat/walker)?" checked={b("alatBantu")} onChange={(v) => set("alatBantu", v)} />
        </div>
      );

    case "NUTRITION": {
      const opts2 = [{ value: 0, label: "Anoreksia berat" }, { value: 1, label: "Nafsu makan menurun" }, { value: 2, label: "Normal" }];
      const opts3 = [{ value: 0, label: ">3kg" }, { value: 1, label: "Tidak tahu" }, { value: 2, label: "1-3kg" }, { value: 3, label: "Tidak turun" }];
      const mob = [{ value: 0, label: "Bed/chair bound" }, { value: 1, label: "Mampu keluar" }, { value: 2, label: "Berjalan mandiri" }];
      const stress = [{ value: 0, label: "Ya" }, { value: 2, label: "Tidak" }];
      const neuro = [{ value: 0, label: "Demensia berat" }, { value: 1, label: "Demensia ringan" }, { value: 2, label: "Tidak ada" }];
      const imt = [{ value: 0, label: "<19" }, { value: 1, label: "19-21" }, { value: 2, label: "21-23" }, { value: 3, label: "≥23" }];
      return (
        <div className="space-y-2">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            MNA-SF (Mini Nutritional Assessment Short Form) — skor 0–14.
          </p>
          <ScoreRadioGroup label="Nafsu makan" value={data.nafsuMakan as number | null} options={opts2} onChange={(v) => set("nafsuMakan", v)} />
          <ScoreRadioGroup label="Penurunan berat badan (3 bln)" value={data.penurunanBB as number | null} options={opts3} onChange={(v) => set("penurunanBB", v)} />
          <ScoreRadioGroup label="Mobilitas" value={data.mobilitas as number | null} options={mob} onChange={(v) => set("mobilitas", v)} />
          <ScoreRadioGroup label="Stres akut / stres psikologis (3 bln)" value={data.stresAkut as number | null} options={stress} onChange={(v) => set("stresAkut", v)} />
          <ScoreRadioGroup label="Masalah neuropsikologis" value={data.neuropsikologis as number | null} options={neuro} onChange={(v) => set("neuropsikologis", v)} />
          <ScoreRadioGroup label="IMT (kg/m²)" value={data.imt as number | null} options={imt} onChange={(v) => set("imt", v)} />
        </div>
      );
    }

    case "MENTAL": {
      const phqItems = [
        ["phq9_1", "Minat/kesenangan berkurang"],
        ["phq9_2", "Merasa murung/sedih/depresi"],
        ["phq9_3", "Sulit tidur/ngantuk"],
        ["phq9_4", "Lelah/tidak bertenaga"],
        ["phq9_5", "Nafsu makan berubah"],
        ["phq9_6", "Merasa gagal/menyesal"],
        ["phq9_7", "Sulit konsentrasi"],
        ["phq9_8", "Gerakan lambat/gelisah"],
      ];
      const gadItems = [
        ["gad7_1", "Gugup/cemas"],
        ["gad7_2", "Khawatir berlebihan"],
        ["gad7_3", "Sulit mengendalikan kekhawatiran"],
        ["gad7_4", "Sulit relaksasi"],
        ["gad7_5", "Gelisah/mudah jengkel"],
        ["gad7_6", "Takut sesuatu buruk terjadi"],
      ];
      const freq = [
        { value: 0, label: "0 Tdk" }, { value: 1, label: "1 Hr" },
        { value: 2, label: "2 Hr" }, { value: 3, label: "3+ Hr" },
      ];
      const freq9 = [...freq, { value: 0, label: "0 Tdk" }]; // item 9
      return (
        <div className="space-y-4">
          <div>
            <SectionLabel>PHQ-9 (Depresi) — 2 minggu terakhir</SectionLabel>
            <div className="space-y-2">
              {phqItems.map(([k, label]) => (
                <ScoreRadioGroup key={k} label={label} value={data[k] as number | null} options={freq} onChange={(v) => set(k, v)} />
              ))}
              <ScoreRadioGroup label="Pikiran menyakiti diri / bunuh diri" value={data.phq9_9 as number | null} options={freq9} onChange={(v) => set("phq9_9", v)} />
            </div>
          </div>
          <div>
            <SectionLabel>GAD-7 (Kecemasan) — 2 minggu terakhir</SectionLabel>
            <div className="space-y-2">
              {gadItems.map(([k, label]) => (
                <ScoreRadioGroup key={k} label={label} value={data[k] as number | null} options={freq} onChange={(v) => set(k, v)} />
              ))}
            </div>
          </div>
        </div>
      );
    }

    case "SLEEP": {
      const opts = [
        { value: 0, label: "Tdk" }, { value: 1, label: "Ringan" },
        { value: 2, label: "Sedang" }, { value: 3, label: "Berat" }, { value: 4, label: "Sgt Berat" },
      ];
      return (
        <div className="space-y-2">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            Insomnia Severity Index (ISI) singkat — 2 minggu terakhir, skor 0–12.
          </p>
          <ScoreRadioGroup label="Sulit tertidur" value={data.sulitTidur as number | null} options={opts} onChange={(v) => set("sulitTidur", v)} />
          <ScoreRadioGroup label="Sering terbangun tengah malam" value={data.seringTerbangun as number | null} options={opts} onChange={(v) => set("seringTerbangun", v)} />
          <ScoreRadioGroup label="Tidur tidak nyenyak / tidak segar" value={data.tidakNyenyak as number | null} options={opts} onChange={(v) => set("tidakNyenyak", v)} />
        </div>
      );
    }

    case "ACTIVITY":
      return (
        <div className="space-y-3">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            Skrining Aktivitas Fisik & ADL (Activities of Daily Living).
          </p>
          <YesNoField label="Dapat berjalan mandiri?" checked={b("jalanMandiri")} onChange={(v) => set("jalanMandiri", v)} />
          <YesNoField label="Aktivitas sehari-hari (makan, mandi, berpakaian) normal?" checked={b("aktivitasNormal")} onChange={(v) => set("aktivitasNormal", v)} />
          <YesNoField label="Perlu bantuan keluarga untuk aktivitas?" checked={b("butuhBantuan")} onChange={(v) => set("butuhBantuan", v)} />
        </div>
      );

    case "SPIRITUAL":
      return (
        <div className="space-y-3">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            Skrining Spiritual Pasca Haji.
          </p>
          <YesNoField label="Apakah ibadah rutin (shalat, tilawah) tetap dilakukan?" checked={b("ibadahRutin")} onChange={(v) => set("ibadahRutin", v)} />
          <YesNoField label="Apakah merasakan ketenangan setelah haji?" checked={b("ketenangan")} onChange={(v) => set("ketenangan", v)} />
          <YesNoField label="Apakah memiliki kesulitan menjalankan ibadah akibat kondisi kesehatan?" checked={b("hambatanIbadah")} onChange={(v) => set("hambatanIbadah", v)} />
        </div>
      );

    case "FAMILY_APGAR": {
      const opts = [
        { value: 0, label: " Hampir tdk pernah" },
        { value: 1, label: " Kadang" },
        { value: 2, label: " Hampir selalu" },
      ];
      const items = [
        ["adaptation", "Adaptation — Puas atas bantuan keluarga saat menghadapi masalah?"],
        ["partnership", "Partnership — Berbagi masalah & diskusi dengan keluarga?"],
        ["growth", "Growth — Keputusan keluarga dibagi bersama?"],
        ["affection", "Affection — Ekspresi kasih sayang & waktu bersama keluarga?"],
        ["resolve", "Resolve — Waktu & ruang tinggal yang diinginkan tersedia?"],
      ];
      return (
        <div className="space-y-2">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            APGAR Family — skor 0–10. Nilai kepuasan dukungan keluarga pasca kepulangan.
          </p>
          {items.map(([k, label]) => (
            <ScoreRadioGroup key={k} label={label} value={data[k] as number | null} options={opts} onChange={(v) => set(k, v)} />
          ))}
        </div>
      );
    }

    case "FOLLOWUP":
      return (
        <div className="space-y-3">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            Checklist kebutuhan tindak lanjut pelayanan kesehatan.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <YesNoField label="Perlu kontrol dokter" checked={b("kontrolDokter")} onChange={(v) => set("kontrolDokter", v)} />
            <YesNoField label="Perlu home visit" checked={b("homeVisit")} onChange={(v) => set("homeVisit", v)} />
            <YesNoField label="Perlu konsultasi gizi" checked={b("konsultasiGizi")} onChange={(v) => set("konsultasiGizi", v)} />
            <YesNoField label="Perlu rehabilitasi" checked={b("rehabilitasi")} onChange={(v) => set("rehabilitasi", v)} />
            <YesNoField label="Perlu konseling psikologis" checked={b("konselingPsikologis")} onChange={(v) => set("konselingPsikologis", v)} />
          </div>
        </div>
      );

    default:
      return null;
  }
}
