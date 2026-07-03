"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Pill } from "lucide-react";
import { toast } from "sonner";

interface Props {
  jamaahId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function PreHajjMedicationDialog({ jamaahId, open, onOpenChange, onSaved }: Props) {
  const [namaObat, setNamaObat] = React.useState("");
  const [dosis, setDosis] = React.useState("");
  const [frekuensi, setFrekuensi] = React.useState("");
  const [indikasi, setIndikasi] = React.useState("");
  const [catatan, setCatatan] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setNamaObat("");
      setDosis("");
      setFrekuensi("");
      setIndikasi("");
      setCatatan("");
    }
  }, [open]);

  async function handleSave() {
    if (!namaObat.trim()) {
      toast.error("Nama obat wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        namaObat: namaObat.trim(),
        dosis: dosis.trim() || null,
        frekuensi: frekuensi.trim() || null,
        indikasi: indikasi.trim() || null,
        catatan: catatan.trim() || null,
      };
      const res = await fetch(`/api/jamaah/${jamaahId}/pre-haji/medication`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal menyimpan obat");
      }
      toast.success("Obat tersimpan");
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
              <Pill className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Tambah Obat Rutin</DialogTitle>
              <DialogDescription>Obat yang dibawa & dikonsumsi jamaah</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Obat *</Label>
            <Input value={namaObat} onChange={(e) => setNamaObat(e.target.value)} placeholder="mis. Amlodipine" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-medium text-muted-foreground">Dosis</Label>
              <Input value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder="mis. 10 mg" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-muted-foreground">Frekuensi</Label>
              <Input value={frekuensi} onChange={(e) => setFrekuensi(e.target.value)} placeholder="mis. 1×1" />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Indikasi</Label>
            <Input value={indikasi} onChange={(e) => setIndikasi(e.target.value)} placeholder="mis. Hipertensi" />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Catatan</Label>
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Catatan…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Obat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
