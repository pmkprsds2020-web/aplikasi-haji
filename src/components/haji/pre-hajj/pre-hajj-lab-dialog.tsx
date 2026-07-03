"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, TestTube } from "lucide-react";
import { toast } from "sonner";
import { NumberField, SectionLabel } from "../shared";

interface Props {
  jamaahId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function PreHajjLabDialog({ jamaahId, open, onOpenChange, onSaved }: Props) {
  const [vals, setVals] = React.useState<Record<string, string>>({});
  const [urinalisis, setUrinalisis] = React.useState("");
  const [catatan, setCatatan] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setVals({});
      setUrinalisis("");
      setCatatan("");
    }
  }, [open]);

  const set = (k: string, v: string) => setVals((d) => ({ ...d, [k]: v }));

  function numField(k: string, label: string, unit: string, step = "1") {
    return (
      <NumberField label={label} value={vals[k] ?? ""} onChange={(v) => set(k, v)} unit={unit} step={step} />
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const num = (k: string) => (vals[k] && vals[k] !== "" ? Number(vals[k]) : null);
      const payload: Record<string, unknown> = {
        hb: num("hb"),
        gdp: num("gdp"),
        gd2pp: num("gd2pp"),
        hba1c: num("hba1c"),
        kolesterol: num("kolesterol"),
        hdl: num("hdl"),
        ldl: num("ldl"),
        trigliserida: num("trigliserida"),
        asamUrat: num("asamUrat"),
        sgot: num("sgot"),
        sgpt: num("sgpt"),
        kreatinin: num("kreatinin"),
        egfr: num("egfr"),
        urinalisis: urinalisis.trim() || null,
        catatan: catatan.trim() || null,
      };
      const res = await fetch(`/api/jamaah/${jamaahId}/pre-haji/lab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal menyimpan hasil lab");
      }
      toast.success("Hasil lab pra haji tersimpan");
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
              <TestTube className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Input Hasil Lab Pra Haji</DialogTitle>
              <DialogDescription>Hasil pemeriksaan laboratorium pra-keberangkatan</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <SectionLabel>Hematologi & Glukosa</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {numField("hb", "Hb", "g/dL", "0.1")}
              {numField("gdp", "Gula Darah Puasa", "mg/dL")}
              {numField("gd2pp", "GD 2 Jam PP", "mg/dL")}
              {numField("hba1c", "HbA1c", "%", "0.1")}
            </div>
          </div>

          <div>
            <SectionLabel>Lipid & Asam Urat</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {numField("kolesterol", "Kolesterol Total", "mg/dL")}
              {numField("hdl", "HDL", "mg/dL")}
              {numField("ldl", "LDL", "mg/dL")}
              {numField("trigliserida", "Trigliserida", "mg/dL")}
              {numField("asamUrat", "Asam Urat", "mg/dL")}
            </div>
          </div>

          <div>
            <SectionLabel>Fungsi Hati & Ginjal</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {numField("sgot", "SGOT", "U/L")}
              {numField("sgpt", "SGPT", "U/L")}
              {numField("kreatinin", "Kreatinin", "mg/dL", "0.01")}
              {numField("egfr", "eGFR", "mL/min")}
            </div>
          </div>

          <div>
            <SectionLabel>Urinalisis & Catatan</SectionLabel>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Urinalisis</label>
                <input
                  value={urinalisis}
                  onChange={(e) => setUrinalisis(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="mis. Protein negatif, Glukosa negatif, Leukosit negatif"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Catatan</label>
                <Textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={2}
                  placeholder="Catatan interpretasi lab…"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Hasil Lab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
