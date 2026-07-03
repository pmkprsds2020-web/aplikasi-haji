"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Smartphone, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  type TelemedicineRequestData, type FormField,
} from "@/lib/telemedicine-types";
import {
  YesNoField, NumberField, ScoreRadioGroup, SectionLabel,
} from "../shared";

interface Props {
  request: TelemedicineRequestData | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitted: () => void;
}

interface SubmitResult {
  request?: TelemedicineRequestData;
  alerts?: Array<{ level: "RED" | "ORANGE" | "YELLOW"; detail: string }>;
  newMessages?: unknown[];
}

export function PatientFormFillDialog({ request, open, onOpenChange, onSubmitted }: Props) {
  const [data, setData] = React.useState<Record<string, unknown>>({});
  const [catatan, setCatatan] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open && request) {
      setData({});
      setCatatan("");
    }
  }, [open, request]);

  if (!request) return null;

  const isSubmitted = request.status === "SUBMITTED";
  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));
  const b = (k: string) => Boolean(data[k]);
  const n = (k: string) => (data[k] === undefined || data[k] === "" ? "" : String(data[k]));

  // Compute skor / response summary for preview
  const skor = computeSkorPreview(request, data);
  const responsePreview = Object.entries(data).filter(([, v]) => v !== "" && v !== false && v !== null && v !== undefined);

  async function handleSubmit() {
    if (!request) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/telemedicine/request/${request.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: data, skor }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal mengirim jawaban");
      }
      const result = (await res.json()) as SubmitResult;
      toast.success("Jawaban pasien terkirim. Dokter akan menerima notifikasi.");

      // Alert notifications
      const alerts = result.alerts ?? [];
      const red = alerts.filter((a) => a.level === "RED");
      const orange = alerts.filter((a) => a.level === "ORANGE");
      const yellow = alerts.filter((a) => a.level === "YELLOW");
      red.forEach((a) => toast.error(`🚨 ${a.detail}`));
      orange.forEach((a) => toast.warning(`⚠️ ${a.detail}`));
      yellow.forEach((a) => toast.info(`ℹ️ ${a.detail}`));

      onSubmitted();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg truncate">{request.title}</DialogTitle>
              <DialogDescription>
                Simulasi pasien mengisi form dari HP — {request.category}
                {request.subType ? ` · ${request.subType}` : ""}
              </DialogDescription>
            </div>
            {isSubmitted ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3" /> Sudah diisi
              </Badge>
            ) : (
              <Badge variant="secondary">Menunggu</Badge>
            )}
          </div>
        </DialogHeader>

        {isSubmitted ? (
          <SubmittedView request={request} />
        ) : (
          <div className="space-y-4">
            <FormBody request={request} data={data} set={set} b={b} n={n} catatan={catatan} setCatatan={setCatatan} />

            {skor && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <p className="text-xs text-muted-foreground">Hasil / Skor (otomatis)</p>
                <p className="text-sm font-bold text-primary">{skor}</p>
              </div>
            )}

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Mode simulasi: form dikirim seolah-olah pasien mengisi dari perangkatnya. Hasil akan tersimpan ke rekam medis jamaah dan memicu auto-alert bila ada nilai kritis.
              </span>
            </div>
          </div>
        )}

        {!isSubmitted && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={submitting || responsePreview.length === 0}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Kirim Jawaban Pasien
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ===== Submitted view (read-only summary) =====
function SubmittedView({ request }: { request: TelemedicineRequestData }) {
  const r = request.response ?? {};
  const entries = Object.entries(r);
  return (
    <div className="space-y-3">
      {request.skor && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">Skor / Hasil</p>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{request.skor}</p>
        </div>
      )}
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada data respons.</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-card px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium text-foreground text-right">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Form body by category/subType =====
interface FormBodyProps {
  request: TelemedicineRequestData;
  data: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
  b: (k: string) => boolean;
  n: (k: string) => string;
  catatan: string;
  setCatatan: (s: string) => void;
}

function FormBody({ request, data, set, b, n, catatan, setCatatan }: FormBodyProps) {
  const { category, subType, fields } = request;

  // TTV: render fields as NumberField
  if (category === "TTV") {
    return (
      <div className="space-y-3">
        <SectionLabel>Parameter TTV</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {(fields.length > 0 ? fields : defaultTtvFields(subType)).map((f: FormField) => (
            <NumberField
              key={f.key}
              label={f.label}
              value={n(f.key)}
              onChange={(v) => set(f.key, v)}
              unit={f.unit}
              placeholder={f.placeholder}
              step={f.key === "suhu" || f.key === "spo2" || f.key === "beratBadan" ? "0.1" : "1"}
            />
          ))}
        </div>
        <Label className="mt-2 block text-xs font-medium text-muted-foreground">Catatan pasien (opsional)</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Catatan keluhan atau keterangan tambahan…" />
      </div>
    );
  }

  // SKRINING — dynamic per subType
  if (category === "SKRINING") return <SkriningFormBody subType={subType ?? ""} data={data} set={set} b={b} catatan={catatan} setCatatan={setCatatan} />;

  // DAILY_COMPLAINT
  if (category === "DAILY_COMPLAINT") {
    const items: Array<[string, string]> = [
      ["demam", "Demam"], ["batuk", "Batuk"], ["sesak", "Sesak napas"], ["pilek", "Pilek"],
      ["nyeri", "Nyeri otot/sendiri"], ["bab", "Gangguan BAB (diare)"], ["bak", "Gangguan BAK"],
      ["makan", "Nafsu makan turun"], ["tidur", "Gangguan tidur"], ["aktivitas", "Aktivitas turun"],
      ["minumObat", "Tidak patuh minum obat"],
    ];
    return (
      <div className="space-y-3">
        <SectionLabel>Keluhan Harian</SectionLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map(([k, label]) => (
            <YesNoField key={k} label={label} checked={b(k)} onChange={(v) => set(k, v)} />
          ))}
        </div>
        <Label className="mt-2 block text-xs font-medium text-muted-foreground">Keluhan utama</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} placeholder="Tuliskan keluhan utama pasien…" />
      </div>
    );
  }

  // CHRONIC
  if (category === "CHRONIC") {
    const st = subType ?? "";
    return (
      <div className="space-y-3">
        <SectionLabel>Monitoring Kronis — {st}</SectionLabel>
        {(st === "HIPERTENSI" || st === "ALL") && (
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="TD Sistolik" value={n("tdSistolik")} onChange={(v) => set("tdSistolik", v)} unit="mmHg" />
            <NumberField label="TD Diastolik" value={n("tdDiastolik")} onChange={(v) => set("tdDiastolik", v)} unit="mmHg" />
          </div>
        )}
        {(st === "DIABETES" || st === "ALL") && (
          <NumberField label="Gula Darah" value={n("gulaDarah")} onChange={(v) => set("gulaDarah", v)} unit="mg/dL" />
        )}
        <YesNoField label="Ada keluhan terkait penyakit kronis" checked={b("adaKeluhan")} onChange={(v) => set("adaKeluhan", v)} />
        <YesNoField label="Patuh minum obat" checked={b("patuhObat")} onChange={(v) => set("patuhObat", v)} />
        <Label className="mt-2 block text-xs font-medium text-muted-foreground">Catatan</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Catatan klinis…" />
      </div>
    );
  }

  // EDUKASI — confirmation
  if (category === "EDUKASI") {
    return (
      <div className="space-y-3">
        <SectionLabel>Konfirmasi Edukasi — {subType}</SectionLabel>
        <YesNoField
          label="Saya telah menerima & memahami edukasi dari dokter"
          checked={b("sudahPaham")}
          onChange={(v) => set("sudahPaham", v)}
        />
        <YesNoField label="Bersedia menjalankan rekomendasi" checked={b("bersedia")} onChange={(v) => set("bersedia", v)} />
        <Label className="mt-2 block text-xs font-medium text-muted-foreground">Pertanyaan / Catatan pasien</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Tuliskan pertanyaan jika ada…" />
      </div>
    );
  }

  // OBAT — confirmation of taking
  if (category === "OBAT") {
    return (
      <div className="space-y-3">
        <SectionLabel>Konfirmasi Obat</SectionLabel>
        <YesNoField label="Saya telah minum obat sesuai resep" checked={b("minumObat")} onChange={(v) => set("minumObat", v)} />
        <YesNoField label="Ada efek samping" checked={b("efekSamping")} onChange={(v) => set("efekSamping", v)} />
        <Label className="mt-2 block text-xs font-medium text-muted-foreground">Catatan efek samping</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Tuliskan efek samping yang dirasakan…" />
      </div>
    );
  }

  // Fallback: generic fields
  if (fields.length > 0) {
    return (
      <div className="space-y-3">
        <SectionLabel>Form</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((f: FormField) => (
            <GenericField key={f.key} f={f} value={n(f.key)} onChange={(v) => set(f.key, v)} />
          ))}
        </div>
        <Label className="mt-2 block text-xs font-medium text-muted-foreground">Catatan</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} />
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-accent/50 px-3 py-3 text-sm text-muted-foreground">
      Form jenis ini belum didukung simulasi pasien. Silakan hubungi developer untuk menambahkan.
    </div>
  );
}

function defaultTtvFields(subType: string | null): FormField[] {
  const all: Record<string, { label: string; unit: string }> = {
    tdSistolik: { label: "TD Sistolik", unit: "mmHg" },
    tdDiastolik: { label: "TD Diastolik", unit: "mmHg" },
    nadi: { label: "Nadi", unit: "×/mnt" },
    rr: { label: "Respirasi", unit: "×/mnt" },
    suhu: { label: "Suhu", unit: "°C" },
    spo2: { label: "SpO₂", unit: "%" },
    beratBadan: { label: "Berat Badan", unit: "kg" },
    tinggiBadan: { label: "Tinggi Badan", unit: "cm" },
    gulaDarah: { label: "Gula Darah", unit: "mg/dL" },
    lingkarPerut: { label: "Lingkar Perut", unit: "cm" },
  };
  const keys = (subType ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const useKeys = keys.length > 0 ? keys : Object.keys(all);
  return useKeys.map((k) => ({ key: k, label: all[k]?.label ?? k, type: "number" as const, unit: all[k]?.unit, required: true }));
}

function GenericField({ f, value, onChange }: { f: FormField; value: string; onChange: (v: string) => void }) {
  if (f.type === "yesno") {
    return <YesNoField label={f.label} checked={value === "true"} onChange={(v) => onChange(v ? "true" : "false")} />;
  }
  if (f.type === "textarea") {
    return (
      <div className="sm:col-span-2">
        <Label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</Label>
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} placeholder={f.placeholder} />
      </div>
    );
  }
  return (
    <NumberField
      label={f.label}
      value={value}
      onChange={onChange}
      unit={f.unit}
      placeholder={f.placeholder}
      step={f.type === "number" ? "1" : undefined}
    />
  );
}

// ===== Skrining form body per subType =====
function SkriningFormBody({
  subType, data, set, b, catatan, setCatatan,
}: {
  subType: string;
  data: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
  b: (k: string) => boolean;
  catatan: string;
  setCatatan: (s: string) => void;
}) {
  const freq = [
    { value: 0, label: "0 Tdk" }, { value: 1, label: "1 Hr" },
    { value: 2, label: "2 Hr" }, { value: 3, label: "3+ Hr" },
  ];
  const apgarOpts = [
    { value: 0, label: "Hampir tdk" },
    { value: 1, label: "Kadang" },
    { value: 2, label: "Hampir slalu" },
  ];

  if (subType === "PHQ9" || subType === "MENTAL") {
    const items = subType === "MENTAL"
      ? [["phq9_1","Minat/kesenangan berkurang"],["phq9_2","Merasa murung"],["phq9_3","Sulit tidur"],["phq9_4","Lelah"],["phq9_5","Nafsu makan berubah"],["phq9_6","Merasa gagal"],["phq9_7","Sulit konsentrasi"],["phq9_8","Gerakan lambat"]]
      : [["phq9_1","Minat/kesenangan berkurang"],["phq9_2","Merasa murung/sedih"],["phq9_3","Sulit tidur"],["phq9_4","Lelah"],["phq9_5","Nafsu makan berubah"],["phq9_6","Merasa gagal"],["phq9_7","Sulit konsentrasi"],["phq9_8","Gerakan lambat"]];
    return (
      <div className="space-y-3">
        <SectionLabel>PHQ-9 (Depresi) — 2 minggu terakhir</SectionLabel>
        <div className="space-y-2">
          {items.map(([k, label]) => (
            <ScoreRadioGroup key={k} label={label} value={data[k] as number | null} options={freq} onChange={(v) => set(k, v)} />
          ))}
        </div>
        <Label className="mt-2 block text-xs font-medium text-muted-foreground">Catatan</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} />
      </div>
    );
  }

  if (subType === "GAD7") {
    const items = [["gad7_1","Gugup/cemas"],["gad7_2","Khawatir berlebihan"],["gad7_3","Sulit mengendalikan kekhawatiran"],["gad7_4","Sulit relaksasi"],["gad7_5","Gelisah"],["gad7_6","Takut hal buruk"]];
    return (
      <div className="space-y-3">
        <SectionLabel>GAD-7 (Cemas)</SectionLabel>
        <div className="space-y-2">
          {items.map(([k, label]) => (
            <ScoreRadioGroup key={k} label={label} value={data[k] as number | null} options={freq} onChange={(v) => set(k, v)} />
          ))}
        </div>
        <Label className="mt-2 block text-xs font-medium text-muted-foreground">Catatan</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} />
      </div>
    );
  }

  if (subType === "INFECTIOUS") {
    const items: Array<[string, string]> = [["demam","Demam"],["batuk","Batuk"],["pilek","Pilek"],["tenggorok","Sakit tenggorokan"],["sesak","Sesak napas"],["napasCepat","Napas cepat"],["diare","Diare"],["mual","Mual/muntah"],["hilangPenciuman","Hilang penciuman"]];
    return (
      <div className="space-y-3">
        <SectionLabel>Gejala Infeksi</SectionLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map(([k, label]) => (
            <YesNoField key={k} label={label} checked={b(k)} onChange={(v) => set(k, v)} />
          ))}
        </div>
        <Label className="mt-2 block text-xs font-medium text-muted-foreground">Catatan</Label>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} />
      </div>
    );
  }

  if (subType === "FRAIL" || subType === "FRAILTY") {
    const items: Array<[string, string]> = [["fatigue","Lelah sebagian besar waktu"],["resistance","Kesulitan menaiki 10 tangga"],["ambulation","Kesulitan berjalan ratusan meter"],["illness","≥5 penyakit kronis"],["lossWeight","Penurunan BB ≥5% (12 bln)"]];
    return (
      <div className="space-y-3">
        <SectionLabel>FRAIL Scale</SectionLabel>
        {items.map(([k, label]) => (
          <YesNoField key={k} label={label} checked={b(k)} onChange={(v) => set(k, v)} />
        ))}
      </div>
    );
  }

  if (subType === "FALL_RISK") {
    const items: Array<[string, string]> = [["jatuhSetahun","Pernah jatuh 1 tahun terakhir"],["gangguanKeseimbangan","Gangguan keseimbangan"],["alatBantu","Menggunakan alat bantu jalan"]];
    return (
      <div className="space-y-3">
        <SectionLabel>Risiko Jatuh</SectionLabel>
        {items.map(([k, label]) => (
          <YesNoField key={k} label={label} checked={b(k)} onChange={(v) => set(k, v)} />
        ))}
      </div>
    );
  }

  if (subType === "APGAR" || subType === "FAMILY_APGAR") {
    const items = [["adaptation","Adaptation"],["partnership","Partnership"],["growth","Growth"],["affection","Affection"],["resolve","Resolve"]];
    return (
      <div className="space-y-3">
        <SectionLabel>Family APGAR</SectionLabel>
        <div className="space-y-2">
          {items.map(([k, label]) => (
            <ScoreRadioGroup key={k} label={label} value={data[k] as number | null} options={apgarOpts} onChange={(v) => set(k, v)} />
          ))}
        </div>
      </div>
    );
  }

  // Fallback: skor + catatan
  const skorVal = data.skor === undefined || data.skor === "" ? "" : String(data.skor);
  return (
    <div className="space-y-3">
      <SectionLabel>Skrining — {subType}</SectionLabel>
      <NumberField label="Skor" value={skorVal} onChange={(v) => set("skor", v)} placeholder="0" />
      <Label className="mt-2 block text-xs font-medium text-muted-foreground">Catatan / Jawaban</Label>
      <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={4} placeholder="Tuliskan jawaban pasien…" />
    </div>
  );
}

// ===== Skor computation (preview before submit) =====
function computeSkorPreview(request: TelemedicineRequestData, data: Record<string, unknown>): string {
  const { category, subType } = request;
  const bool = (v: unknown) => v === true;
  const num = (k: string) => (data[k] !== undefined && data[k] !== "" ? Number(data[k]) : NaN);

  if (category === "TTV") {
    const parts: string[] = [];
    if (!Number.isNaN(num("tdSistolik")) && !Number.isNaN(num("tdDiastolik"))) parts.push(`TD ${num("tdSistolik")}/${num("tdDiastolik")}`);
    if (!Number.isNaN(num("nadi"))) parts.push(`N ${num("nadi")}`);
    if (!Number.isNaN(num("rr"))) parts.push(`RR ${num("rr")}`);
    if (!Number.isNaN(num("suhu"))) parts.push(`S ${num("suhu")}°C`);
    if (!Number.isNaN(num("spo2"))) parts.push(`SpO₂ ${num("spo2")}%`);
    if (!Number.isNaN(num("gulaDarah"))) parts.push(`GD ${num("gulaDarah")}`);
    if (!Number.isNaN(num("beratBadan"))) parts.push(`BB ${num("beratBadan")}kg`);
    return parts.join(" · ");
  }

  if (category === "SKRINING") {
    const st = subType ?? "";
    if (st === "PHQ9" || st === "MENTAL") {
      const keys = ["phq9_1","phq9_2","phq9_3","phq9_4","phq9_5","phq9_6","phq9_7","phq9_8"];
      const t = keys.reduce((a, k) => a + (typeof data[k] === "number" ? (data[k] as number) : 0), 0);
      if (t <= 4) return `PHQ-9 ${t} — Minimal`;
      if (t <= 9) return `PHQ-9 ${t} — Ringan`;
      if (t <= 14) return `PHQ-9 ${t} — Sedang`;
      if (t <= 19) return `PHQ-9 ${t} — Sedang-Berat`;
      return `PHQ-9 ${t} — Berat`;
    }
    if (st === "GAD7") {
      const keys = ["gad7_1","gad7_2","gad7_3","gad7_4","gad7_5","gad7_6"];
      const t = keys.reduce((a, k) => a + (typeof data[k] === "number" ? (data[k] as number) : 0), 0);
      if (t <= 4) return `GAD-7 ${t} — Minimal`;
      if (t <= 9) return `GAD-7 ${t} — Ringan`;
      if (t <= 14) return `GAD-7 ${t} — Sedang`;
      return `GAD-7 ${t} — Berat`;
    }
    if (st === "INFECTIOUS") {
      const cnt = Object.entries(data).filter(([, v]) => v === true).length;
      const demam = bool(data.demam) && bool(data.sesak);
      if (demam) return "Tinggi — demam+sesak";
      return cnt === 0 ? "Rendah" : `Sedang (${cnt} gejala)`;
    }
    if (st === "FRAIL" || st === "FRAILTY") {
      const t = ["fatigue","resistance","ambulation","illness","lossWeight"].reduce((a, k) => a + (bool(data[k]) ? 1 : 0), 0);
      if (t === 0) return "Robust (0)";
      if (t <= 2) return `Pre-frail (${t})`;
      return `Frail (${t})`;
    }
    if (st === "FALL_RISK") {
      const t = ["jatuhSetahun","gangguanKeseimbangan","alatBantu"].reduce((a, k) => a + (bool(data[k]) ? 1 : 0), 0);
      return ["Rendah","Sedang","Tinggi","Tinggi"][t] ?? "Rendah";
    }
    if (st === "APGAR" || st === "FAMILY_APGAR") {
      const t = ["adaptation","partnership","growth","affection","resolve"].reduce((a, k) => a + (typeof data[k] === "number" ? (data[k] as number) : 0), 0);
      if (t >= 7) return `APGAR ${t} — Fungsional`;
      if (t >= 4) return `APGAR ${t} — Disfungsi Sedang`;
      return `APGAR ${t} — Disfungsi Berat`;
    }
  }

  if (category === "DAILY_COMPLAINT") {
    const cnt = Object.entries(data).filter(([, v]) => v === true).length;
    if (cnt === 0) return "Tanpa keluhan";
    return `${cnt} keluhan`;
  }

  if (category === "CHRONIC") {
    const gd = num("gulaDarah");
    if (!Number.isNaN(gd) && gd >= 250) return "Tidak Terkontrol (GD tinggi)";
    if (bool(data.adaKeluhan)) return "Perlu Pemantauan";
    return "Stabil";
  }

  if (category === "EDUKASI") {
    return bool(data.sudahPaham) ? "Paham" : "Belum dikonfirmasi";
  }
  if (category === "OBAT") {
    return bool(data.minumObat) ? (bool(data.efekSamping) ? "Diminum + efek samping" : "Diminum") : "Belum diminum";
  }

  // Fallback: skor field
  if (data.skor !== undefined && data.skor !== "") return String(data.skor);
  return "";
}
