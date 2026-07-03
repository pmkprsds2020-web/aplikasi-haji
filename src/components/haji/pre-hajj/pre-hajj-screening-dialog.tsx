"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Info } from "lucide-react";
import { toast } from "sonner";
import { PRE_HAJJ_SCREENING_META } from "@/lib/pre-hajj-types";
import type { PreHajjScreeningJenis } from "@/lib/pre-hajj-types";
import {
  YesNoField, ScoreRadioGroup, NumberField, SectionLabel, getIcon,
} from "../shared";

interface Props {
  jamaahId: string;
  jenis: PreHajjScreeningJenis | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function PreHajjScreeningDialog({ jamaahId, jenis, open, onOpenChange, onSaved }: Props) {
  const [data, setData] = React.useState<Record<string, unknown>>({});
  const [catatan, setCatatan] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setData({});
      setCatatan("");
    }
  }, [open, jenis]);

  if (!jenis) return null;
  const meta = PRE_HAJJ_SCREENING_META[jenis];
  const Icon = getIcon(meta.icon);

  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));
  const b = (k: string) => Boolean(data[k]);
  const n = (k: string) => (data[k] === undefined || data[k] === "" ? "" : String(data[k]));
  const num = (k: string) => (typeof data[k] === "number" ? (data[k] as number) : 0);

  function computeSkor(j: PreHajjScreeningJenis, d: Record<string, unknown>): string {
    const bool = (v: unknown) => v === true;
    switch (j) {
      case "FRAIL": {
        const t = ["fatigue", "resistance", "ambulation", "illness", "lossWeight"].reduce(
          (a, k) => a + (bool(d[k]) ? 1 : 0), 0
        );
        if (t === 0) return "Robust";
        if (t <= 2) return "Pre-frail";
        return "Frail";
      }
      case "MNA": {
        const keys = ["nafsuMakan", "penurunanBB", "mobilitas", "stresAkut", "neuropsikologis", "imt"];
        const t = keys.reduce((a, k) => a + (typeof d[k] === "number" ? (d[k] as number) : 0), 0);
        if (t >= 12) return "Normal";
        if (t >= 8) return "Risiko Malnutrisi";
        return "Malnutrisi";
      }
      case "MINICOG": {
        const recall = typeof d.recall === "number" ? (d.recall as number) : 0;
        const clock = bool(d.clockDrawNormal);
        const total = recall + (clock ? 2 : 0);
        return total >= 3 ? "Normal" : "Gangguan Kognitif";
      }
      case "MORSE": {
        const t = ["riwayatJatuh", "diagnosisSekunder", "alatBantu", "iv", "gayaBerjalan", "statusMental"].reduce(
          (a, k) => a + (typeof d[k] === "number" ? (d[k] as number) : 0), 0
        );
        if (t < 25) return "Rendah";
        if (t <= 50) return "Sedang";
        return "Tinggi";
      }
      case "BARTHEL": {
        const keys = ["makan", "mandi", "toileting", "berpindah", "mobilitas", "berpakaian", "bab", "bak", "naikTangga", "mandi2"];
        const t = keys.reduce((a, k) => a + (typeof d[k] === "number" ? (d[k] as number) : 0), 0);
        if (t >= 100) return "Mandiri";
        if (t >= 60) return "Bantuan Ringan";
        if (t >= 40) return "Ketergantungan Sedang";
        if (t >= 20) return "Ketergantungan Berat";
        return "Ketergantungan Total";
      }
      case "PHQ9": {
        const keys = ["phq1", "phq2", "phq3", "phq4", "phq5", "phq6", "phq7", "phq8", "phq9"];
        const t = keys.reduce((a, k) => a + (typeof d[k] === "number" ? (d[k] as number) : 0), 0);
        if (t <= 4) return "Minimal";
        if (t <= 9) return "Ringan";
        if (t <= 14) return "Sedang";
        if (t <= 19) return "Sedang-Berat";
        return "Berat";
      }
      case "GAD7": {
        const keys = ["gad1", "gad2", "gad3", "gad4", "gad5", "gad6", "gad7"];
        const t = keys.reduce((a, k) => a + (typeof d[k] === "number" ? (d[k] as number) : 0), 0);
        if (t <= 4) return "Minimal";
        if (t <= 9) return "Ringan";
        if (t <= 14) return "Sedang";
        return "Berat";
      }
      case "APGAR": {
        const keys = ["adaptation", "partnership", "growth", "affection", "resolve"];
        const t = keys.reduce((a, k) => a + (typeof d[k] === "number" ? (d[k] as number) : 0), 0);
        if (t >= 7) return "Fungsional";
        if (t >= 4) return "Disfungsi Sedang";
        return "Disfungsi Berat";
      }
      case "IPAQ": {
        const hariVigor = typeof d.hariVigor === "number" ? (d.hariVigor as number) : 0;
        const menitVigor = typeof d.menitVigor === "number" ? (d.menitVigor as number) : 0;
        const hariModerat = typeof d.hariModerat === "number" ? (d.hariModerat as number) : 0;
        const menitModerat = typeof d.menitModerat === "number" ? (d.menitModerat as number) : 0;
        const hariJalan = typeof d.hariJalan === "number" ? (d.hariJalan as number) : 0;
        const menitJalan = typeof d.menitJalan === "number" ? (d.menitJalan as number) : 0;
        const met =
          8.0 * hariVigor * menitVigor +
          4.0 * hariModerat * menitModerat +
          3.3 * hariJalan * menitJalan;
        if (met >= 3000) return "Tinggi";
        if (met >= 600) return "Sedang";
        return "Rendah";
      }
      case "WHOQOL": {
        const keys = ["fisik", "psikologis", "sosial", "lingkungan"];
        const vals = keys.map((k) => (typeof d[k] === "number" ? (d[k] as number) : 0));
        const avg = vals.reduce((a, v) => a + v, 0) / keys.length;
        if (avg >= 70) return "Tinggi";
        if (avg >= 40) return "Sedang";
        return "Rendah";
      }
      default:
        return "";
    }
  }

  const skor = computeSkor(jenis, data);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { jenis, data, skor, catatan };
      const res = await fetch(`/api/jamaah/${jamaahId}/pre-haji/screening`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal menyimpan skrining pra haji");
      }
      toast.success(`Skrining ${meta.judul} tersimpan — skor: ${skor}`);
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
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
          <FormBody jenis={jenis} data={data} set={set} b={b} n={n} num={num} />

          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Skor otomatis: </span>
              <span className="font-bold text-primary">{skor || "—"}</span>
              <span className="ml-2">· {meta.instrumen}</span>
            </p>
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
  jenis: PreHajjScreeningJenis;
  data: Record<string, unknown>;
  set: SetFn;
  b: (k: string) => boolean;
  n: (k: string) => string;
  num: (k: string) => number;
}

function FormBody({ jenis, data, set, b, n, num }: FormBodyProps) {
  switch (jenis) {
    case "FRAIL": {
      const items = [
        { k: "fatigue", label: "Fatigue — Sering merasa lelah sebagian besar waktu?" },
        { k: "resistance", label: "Resistance — Kesulitan menaiki 10 anak tangga tanpa bantuan?" },
        { k: "ambulation", label: "Ambulation — Kesulitan berjalan beberapa ratus meter sendirian?" },
        { k: "illness", label: "Illness — Memiliki ≥5 penyakit kronis?" },
        { k: "lossWeight", label: "Loss of Weight — Penurunan berat badan ≥5% dalam 12 bulan?" },
      ];
      return (
        <div className="space-y-3">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            FRAIL Scale — jawab setiap pertanyaan dengan Ya (1) / Tidak (0). Skor 0–5.
          </p>
          {items.map((it) => (
            <YesNoField key={it.k} label={it.label} checked={b(it.k)} onChange={(v) => set(it.k, v)} />
          ))}
        </div>
      );
    }

    case "MNA": {
      const opts2 = [{ value: 0, label: "Anoreksia berat" }, { value: 1, label: "Nafsu makan turun" }, { value: 2, label: "Normal" }];
      const opts3 = [{ value: 0, label: ">3kg" }, { value: 1, label: "Tidak tahu" }, { value: 2, label: "1–3kg" }, { value: 3, label: "Tidak turun" }];
      const mob = [{ value: 0, label: "Bed/chair" }, { value: 1, label: "Mampu keluar" }, { value: 2, label: "Berjalan mandiri" }];
      const stress = [{ value: 0, label: "Ya" }, { value: 2, label: "Tidak" }];
      const neuro = [{ value: 0, label: "Demensia berat" }, { value: 1, label: "Demensia ringan" }, { value: 2, label: "Tidak ada" }];
      const imt = [{ value: 0, label: "<19" }, { value: 1, label: "19–21" }, { value: 2, label: "21–23" }, { value: 3, label: "≥23" }];
      return (
        <div className="space-y-2">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            MNA-SF (Mini Nutritional Assessment Short Form) — skor 0–14.
          </p>
          <ScoreRadioGroup label="Nafsu makan" value={data.nafsuMakan as number | null} options={opts2} onChange={(v) => set("nafsuMakan", v)} />
          <ScoreRadioGroup label="Penurunan berat badan (3 bln)" value={data.penurunanBB as number | null} options={opts3} onChange={(v) => set("penurunanBB", v)} />
          <ScoreRadioGroup label="Mobilitas" value={data.mobilitas as number | null} options={mob} onChange={(v) => set("mobilitas", v)} />
          <ScoreRadioGroup label="Stres akut / psikologis (3 bln)" value={data.stresAkut as number | null} options={stress} onChange={(v) => set("stresAkut", v)} />
          <ScoreRadioGroup label="Masalah neuropsikologis" value={data.neuropsikologis as number | null} options={neuro} onChange={(v) => set("neuropsikologis", v)} />
          <ScoreRadioGroup label="IMT (kg/m²)" value={data.imt as number | null} options={imt} onChange={(v) => set("imt", v)} />
        </div>
      );
    }

    case "MINICOG": {
      const opts3 = [0, 1, 2, 3].map((v) => ({ value: v, label: String(v) }));
      return (
        <div className="space-y-3">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            Mini-Cog — 3-item recall (0–3) + clock draw test. Skor 0–5.
          </p>
          <ScoreRadioGroup label="Recall kata (0–3)" value={data.recall as number | null} options={opts3} onChange={(v) => set("recall", v)} />
          <YesNoField label="Clock Draw Test — Gambar jam normal?" checked={b("clockDrawNormal")} onChange={(v) => set("clockDrawNormal", v)} hint="Normal = +2, Abnormal = +0" />
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-bold text-primary">{num("recall") + (b("clockDrawNormal") ? 2 : 0)}</span>
          </div>
        </div>
      );
    }

    case "MORSE": {
      return (
        <div className="space-y-3">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            Morse Fall Scale — 6 item, total skor 0–125.
          </p>
          <ScoreRadioGroup label="Riwayat jatuh" value={data.riwayatJatuh as number | null} options={[{ value: 0, label: "Tidak" }, { value: 25, label: "Ya" }]} onChange={(v) => set("riwayatJatuh", v)} />
          <ScoreRadioGroup label="Diagnosis sekunder" value={data.diagnosisSekunder as number | null} options={[{ value: 0, label: "Tidak" }, { value: 15, label: "Ya" }]} onChange={(v) => set("diagnosisSekunder", v)} />
          <ScoreRadioGroup label="Alat bantu jalan" value={data.alatBantu as number | null} options={[{ value: 0, label: "Tirah baring" }, { value: 15, label: "Dengan perawat" }, { value: 30, label: "Tongkat/walker" }]} onChange={(v) => set("alatBantu", v)} />
          <ScoreRadioGroup label="Terapi IV / heparin lock" value={data.iv as number | null} options={[{ value: 0, label: "Tidak" }, { value: 20, label: "Ya" }]} onChange={(v) => set("iv", v)} />
          <ScoreRadioGroup label="Gaya berjalan" value={data.gayaBerjalan as number | null} options={[{ value: 0, label: "Normal" }, { value: 10, label: "Lemah" }, { value: 20, label: "Gangguan" }]} onChange={(v) => set("gayaBerjalan", v)} />
          <ScoreRadioGroup label="Status mental" value={data.statusMental as number | null} options={[{ value: 0, label: "Orientasi baik" }, { value: 15, label: "Lupa batasan" }]} onChange={(v) => set("statusMental", v)} />
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Total Morse: </span>
            <span className="font-bold text-primary">
              {num("riwayatJatuh") + num("diagnosisSekunder") + num("alatBantu") + num("iv") + num("gayaBerjalan") + num("statusMental")}
            </span>
          </div>
        </div>
      );
    }

    case "BARTHEL": {
      const opt15 = [{ value: 0, label: "Tidak mampu" }, { value: 5, label: "Bantuan" }, { value: 10, label: "Sebagian" }, { value: 15, label: "Mandiri" }];
      const opt10 = [{ value: 0, label: "Tidak mampu" }, { value: 5, label: "Bantuan" }, { value: 10, label: "Mandiri" }];
      const opt5 = [{ value: 0, label: "Tidak" }, { value: 5, label: "Ya" }];
      const items: Array<[string, string, { value: number; label: string }[]]> = [
        ["makan", "Makan", opt15],
        ["mandi", "Mandi", opt5],
        ["toileting", "Toileting", opt10],
        ["berpindah", "Berpindah dari kursi/tempat tidur", opt15],
        ["mobilitas", "Mobilitas (berjalan di dalam ruangan)", opt15],
        ["berpakaian", "Berpakaian", opt10],
        ["bab", "Berkemih/BAB (kontinensia)", opt10],
        ["bak", "BAK (kontinensia)", opt10],
        ["naikTangga", "Naik tangga", opt10],
        ["mandi2", "Mandi sendiri", opt5],
      ];
      const total = items.reduce((a, [k]) => a + num(k), 0);
      return (
        <div className="space-y-2">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            Barthel ADL Index — 10 item, skor 0–100.
          </p>
          {items.map(([k, label, opts]) => (
            <ScoreRadioGroup key={k} label={label} value={data[k] as number | null} options={opts} onChange={(v) => set(k, v)} />
          ))}
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Total Barthel: </span>
            <span className="font-bold text-primary">{total}/100</span>
          </div>
        </div>
      );
    }

    case "PHQ9": {
      const items = [
        ["phq1", "Minat/kesenangan berkurang"],
        ["phq2", "Merasa murung/sedih/depresi"],
        ["phq3", "Sulit tidur/ngantuk"],
        ["phq4", "Lelah/tidak bertenaga"],
        ["phq5", "Nafsu makan berubah"],
        ["phq6", "Merasa gagal/menyesal"],
        ["phq7", "Sulit konsentrasi"],
        ["phq8", "Gerakan lambat/gelisah"],
        ["phq9", "Pikiran menyakiti diri/bunuh diri"],
      ];
      const freq = [
        { value: 0, label: "0 Tdk" }, { value: 1, label: "1 Hr" },
        { value: 2, label: "2 Hr" }, { value: 3, label: "3+ Hr" },
      ];
      const total = items.reduce((a, [k]) => a + num(k), 0);
      return (
        <div className="space-y-2">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            PHQ-9 — dalam 2 minggu terakhir. Skor 0–27.
          </p>
          {items.map(([k, label]) => (
            <ScoreRadioGroup key={k} label={label} value={data[k] as number | null} options={freq} onChange={(v) => set(k, v)} />
          ))}
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Total PHQ-9: </span>
            <span className="font-bold text-primary">{total}/27</span>
          </div>
        </div>
      );
    }

    case "GAD7": {
      const items = [
        ["gad1", "Gugup/cemas"],
        ["gad2", "Khawatir berlebihan"],
        ["gad3", "Sulit mengendalikan kekhawatiran"],
        ["gad4", "Sulit relaksasi"],
        ["gad5", "Gelisah/mudah jengkel"],
        ["gad6", "Takut sesuatu buruk terjadi"],
        ["gad7", "Gangguan tidur akibat cemas"],
      ];
      const freq = [
        { value: 0, label: "0 Tdk" }, { value: 1, label: "1 Hr" },
        { value: 2, label: "2 Hr" }, { value: 3, label: "3+ Hr" },
      ];
      const total = items.reduce((a, [k]) => a + num(k), 0);
      return (
        <div className="space-y-2">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            GAD-7 — dalam 2 minggu terakhir. Skor 0–21.
          </p>
          {items.map(([k, label]) => (
            <ScoreRadioGroup key={k} label={label} value={data[k] as number | null} options={freq} onChange={(v) => set(k, v)} />
          ))}
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Total GAD-7: </span>
            <span className="font-bold text-primary">{total}/21</span>
          </div>
        </div>
      );
    }

    case "APGAR": {
      const opts = [
        { value: 0, label: "Hampir tdk pernah" },
        { value: 1, label: "Kadang" },
        { value: 2, label: "Hampir selalu" },
      ];
      const items = [
        ["adaptation", "Adaptation — Puas atas bantuan keluarga saat menghadapi masalah?"],
        ["partnership", "Partnership — Berbagi masalah & diskusi dengan keluarga?"],
        ["growth", "Growth — Keputusan keluarga dibagi bersama?"],
        ["affection", "Affection — Ekspresi kasih sayang & waktu bersama?"],
        ["resolve", "Resolve — Waktu & ruang tinggal yang diinginkan tersedia?"],
      ];
      const total = items.reduce((a, [k]) => a + num(k), 0);
      return (
        <div className="space-y-2">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            Family APGAR — skor 0–10.
          </p>
          {items.map(([k, label]) => (
            <ScoreRadioGroup key={k} label={label} value={data[k] as number | null} options={opts} onChange={(v) => set(k, v)} />
          ))}
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Total APGAR: </span>
            <span className="font-bold text-primary">{total}/10</span>
          </div>
        </div>
      );
    }

    case "IPAQ": {
      const met =
        8.0 * num("hariVigor") * num("menitVigor") +
        4.0 * num("hariModerat") * num("menitModerat") +
        3.3 * num("hariJalan") * num("menitJalan");
      return (
        <div className="space-y-3">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            IPAQ Short — aktivitas fisik 7 hari terakhir.
          </p>
          <div>
            <SectionLabel>Aktivitas Vigor (mis. lari, olahraga berat)</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Hari/minggu" value={n("hariVigor")} onChange={(v) => set("hariVigor", v ? Number(v) : "")} unit="hari" />
              <NumberField label="Durasi/hari" value={n("menitVigor")} onChange={(v) => set("menitVigor", v ? Number(v) : "")} unit="menit" />
            </div>
          </div>
          <div>
            <SectionLabel>Aktivitas Moderat (mis. bersepeda santai)</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Hari/minggu" value={n("hariModerat")} onChange={(v) => set("hariModerat", v ? Number(v) : "")} unit="hari" />
              <NumberField label="Durasi/hari" value={n("menitModerat")} onChange={(v) => set("menitModerat", v ? Number(v) : "")} unit="menit" />
            </div>
          </div>
          <div>
            <SectionLabel>Jalan Kaki</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Hari/minggu" value={n("hariJalan")} onChange={(v) => set("hariJalan", v ? Number(v) : "")} unit="hari" />
              <NumberField label="Durasi/hari" value={n("menitJalan")} onChange={(v) => set("menitJalan", v ? Number(v) : "")} unit="menit" />
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">MET-menit/minggu: </span>
            <span className="font-bold text-primary">{Math.round(met)}</span>
          </div>
        </div>
      );
    }

    case "WHOQOL": {
      const opts = Array.from({ length: 6 }, (_, i) => ({ value: 5 + i * 4, label: String(5 + i * 4) }));
      const domains: Array<[string, string]> = [
        ["fisik", "Domain Fisik"],
        ["psikologis", "Domain Psikologis"],
        ["sosial", "Domain Sosial"],
        ["lingkungan", "Domain Lingkungan"],
      ];
      const total = domains.reduce((a, [k]) => a + num(k), 0);
      const avg = total / domains.length;
      return (
        <div className="space-y-2">
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-muted-foreground">
            WHOQOL-BREF — 4 domain (skala 5–25, dikonversi ke 0–100).
          </p>
          {domains.map(([k, label]) => (
            <ScoreRadioGroup key={k} label={label} value={data[k] as number | null} options={opts} onChange={(v) => set(k, v)} />
          ))}
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Rata-rata: </span>
            <span className="font-bold text-primary">{avg.toFixed(1)}</span>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
