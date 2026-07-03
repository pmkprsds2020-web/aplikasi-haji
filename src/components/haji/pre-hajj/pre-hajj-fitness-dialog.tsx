"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Footprints } from "lucide-react";
import { toast } from "sonner";
import { NumberField, SectionLabel } from "../shared";

interface Props {
  jamaahId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function PreHajjFitnessDialog({ jamaahId, open, onOpenChange, onSaved }: Props) {
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

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        targetLangkah: vals.targetLangkah ? Number(vals.targetLangkah) : null,
        jalanKaki: vals.jalanKaki ? Number(vals.jalanKaki) : null,
        aerobik: vals.aerobik ? Number(vals.aerobik) : null,
        kekuatan: vals.kekuatan ? Number(vals.kekuatan) : null,
        pernafasan: vals.pernafasan ? Number(vals.pernafasan) : null,
        catatan: catatan.trim() || null,
      };
      const res = await fetch(`/api/jamaah/${jamaahId}/pre-haji/fitness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal menyimpan kebugaran");
      }
      toast.success("Catatan kebugaran tersimpan");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  const totalMenit = ["jalanKaki", "aerobik", "kekuatan", "pernafasan"].reduce(
    (a, k) => a + (vals[k] ? Number(vals[k]) : 0), 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto scrollbar-thin sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Footprints className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Latihan Kebugaran</DialogTitle>
              <DialogDescription>Pencatatan aktivitas fisik persiapan haji</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <SectionLabel>Target Harian</SectionLabel>
            <NumberField label="Target langkah/hari" value={vals.targetLangkah ?? ""} onChange={(v) => set("targetLangkah", v)} unit="langkah" />
          </div>
          <div>
            <SectionLabel>Durasi Latihan (menit/minggu)</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Jalan Kaki" value={vals.jalanKaki ?? ""} onChange={(v) => set("jalanKaki", v)} unit="menit" />
              <NumberField label="Aerobik" value={vals.aerobik ?? ""} onChange={(v) => set("aerobik", v)} unit="menit" />
              <NumberField label="Latihan Kekuatan" value={vals.kekuatan ?? ""} onChange={(v) => set("kekuatan", v)} unit="menit" />
              <NumberField label="Latihan Pernafasan" value={vals.pernafasan ?? ""} onChange={(v) => set("pernafasan", v)} unit="menit" />
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Total durasi/minggu: </span>
            <span className="font-bold text-primary">{totalMenit} menit</span>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Catatan</label>
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Catatan progres latihan…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Kebugaran
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
