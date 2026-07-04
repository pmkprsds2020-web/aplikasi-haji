"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Activity } from "lucide-react";
import { toast } from "sonner";
import { NumberField } from "./shared";

interface Props {
  jamaahId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

const HARI_OPTS = [
  { value: "1", label: "Hari 1" },
  { value: "7", label: "Hari 7" },
  { value: "14", label: "Hari 14" },
  { value: "30", label: "Hari 30" },
];

export function VitalSignDialog({ jamaahId, open, onOpenChange, onSaved }: Props) {
  const [vals, setVals] = React.useState<Record<string, string>>({});
  const [hariKe, setHariKe] = React.useState("1");
  const [catatan, setCatatan] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setVals({});
      setHariKe("1");
      setCatatan("");
    }
  }, [open]);

  const set = (k: string, v: string) => setVals((d) => ({ ...d, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      const { validateJamaahId } = await import("@/lib/validate-jamaah-id");
      const idCheck = validateJamaahId(jamaahId);
      if (!idCheck.valid) {
        console.error("[VitalSign] Invalid jamaah_id:", idCheck.error);
        toast.error(idCheck.error || "jamaah_id tidak valid");
        setSaving(false);
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const num = (v: string | undefined): number | null => {
        if (!v || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const payload = {
        jamaah_id: jamaahId,
        td_sistolik: num(vals.tdSistolik),
        td_diastolik: num(vals.tdDiastolik),
        nadi: num(vals.nadi),
        rr: num(vals.rr),
        suhu: num(vals.suhu),
        spo2: num(vals.spo2),
        berat_badan: num(vals.beratBadan),
        gula_darah: num(vals.gulaDarah),
        hari_ke: Number(hariKe),
        catatan: catatan || null,
      };
      console.log("Saving TTV to Supabase...");
      console.log("Payload:", payload);
      const { data, error } = await supabase.from("vital_sign").insert(payload);
      console.log("Supabase Response:", data);
      console.log("Supabase Error:", error);
      if (error) {
        console.error("[VitalSign] INSERT failed:", error);
        toast.error(`Gagal menyimpan TTV: ${error.message}`);
        return;
      }
      toast.success("Tanda vital tersimpan di Supabase");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("[VitalSign] Exception:", err);
      toast.error(`Exception: ${err instanceof Error ? err.message : String(err)}`);
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
              <DialogTitle className="text-lg">Input Tanda Vital (TTV)</DialogTitle>
              <DialogDescription>Pencatatan berkala — grafik tren otomatis</DialogDescription>
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
            <NumberField label="Gula darah" value={vals.gulaDarah ?? ""} onChange={(v) => set("gulaDarah", v)} unit="mg/dL" />
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Jadwal Monitoring</Label>
            <Select value={hariKe} onValueChange={setHariKe}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HARI_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Catatan</Label>
            <input
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
