"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Activity } from "lucide-react";
import { toast } from "sonner";
import { NumberField } from "../shared";

interface Props {
  jamaahId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function PreHajjVitalDialog({ jamaahId, open, onOpenChange, onSaved }: Props) {
  const [vals, setVals] = React.useState<Record<string, string>>({});
  const [catatan, setCatatan] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setVals({});
      setCatatan("");
    }
  }, [open]);

  const set = (k: string, v: string) => setVals((d) => ({ ...d, [k]: v }));

  const bb = parseFloat(vals.beratBadan ?? "");
  const tb = parseFloat(vals.tinggiBadan ?? "");
  const bmi =
    !Number.isNaN(bb) && !Number.isNaN(tb) && tb > 0
      ? bb / Math.pow(tb / 100, 2)
      : null;
  const bmiKategori =
    bmi === null
      ? null
      : bmi < 18.5
      ? "Kurus"
      : bmi < 25
      ? "Normal"
      : bmi < 30
      ? "Gemuk"
      : "Obesitas";

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        tdSistolik: vals.tdSistolik ? Number(vals.tdSistolik) : null,
        tdDiastolik: vals.tdDiastolik ? Number(vals.tdDiastolik) : null,
        nadi: vals.nadi ? Number(vals.nadi) : null,
        rr: vals.rr ? Number(vals.rr) : null,
        suhu: vals.suhu ? Number(vals.suhu) : null,
        spo2: vals.spo2 ? Number(vals.spo2) : null,
        beratBadan: vals.beratBadan ? Number(vals.beratBadan) : null,
        tinggiBadan: vals.tinggiBadan ? Number(vals.tinggiBadan) : null,
        lingkarPerut: vals.lingkarPerut ? Number(vals.lingkarPerut) : null,
        catatan,
      };
      const res = await fetch(`/api/jamaah/${jamaahId}/pre-haji/vital`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal menyimpan tanda vital pra haji");
      }
      toast.success("Tanda vital pra haji tersimpan");
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
      <DialogContent className="max-h-[92vh] overflow-y-auto scrollbar-thin sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Input TTV Pra Haji</DialogTitle>
              <DialogDescription>Pemeriksaan tanda vital pra-keberangkatan</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="TD Sistolik" value={vals.tdSistolik ?? ""} onChange={(v) => set("tdSistolik", v)} unit="mmHg" />
            <NumberField label="TD Diastolik" value={vals.tdDiastolik ?? ""} onChange={(v) => set("tdDiastolik", v)} unit="mmHg" />
            <NumberField label="Nadi" value={vals.nadi ?? ""} onChange={(v) => set("nadi", v)} unit="×/mnt" />
            <NumberField label="RR" value={vals.rr ?? ""} onChange={(v) => set("rr", v)} unit="×/mnt" />
            <NumberField label="Suhu" value={vals.suhu ?? ""} onChange={(v) => set("suhu", v)} unit="°C" step="0.1" />
            <NumberField label="SpO₂" value={vals.spo2 ?? ""} onChange={(v) => set("spo2", v)} unit="%" step="0.1" />
            <NumberField label="Berat badan" value={vals.beratBadan ?? ""} onChange={(v) => set("beratBadan", v)} unit="kg" step="0.1" />
            <NumberField label="Tinggi badan" value={vals.tinggiBadan ?? ""} onChange={(v) => set("tinggiBadan", v)} unit="cm" step="0.1" />
            <NumberField label="Lingkar perut" value={vals.lingkarPerut ?? ""} onChange={(v) => set("lingkarPerut", v)} unit="cm" step="0.1" />
          </div>

          {bmi !== null && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="text-xs text-muted-foreground">IMT (BMI):</span>
              <Badge variant="secondary" className="bg-primary/15 text-primary">
                {bmi.toFixed(1)} kg/m²
              </Badge>
              {bmiKategori && (
                <span className="text-xs font-medium text-foreground">{bmiKategori}</span>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Catatan</label>
            <Textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              placeholder="Catatan klinis…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan TTV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
