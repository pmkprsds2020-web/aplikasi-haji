"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Syringe } from "lucide-react";
import { toast } from "sonner";

interface Props {
  jamaahId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

const JENIS_OPTS = [
  { value: "MENINGITIS", label: "Meningitis (Wajib)" },
  { value: "INFLUENZA", label: "Influenza" },
  { value: "COVID", label: "COVID-19" },
  { value: "PNEUMOKOKUS", label: "Pneumokokus" },
  { value: "HEPATITIS", label: "Hepatitis" },
];

export function PreHajjImmunizationDialog({ jamaahId, open, onOpenChange, onSaved }: Props) {
  const [jenis, setJenis] = React.useState("MENINGITIS");
  const [tanggalVaksin, setTanggalVaksin] = React.useState("");
  const [nomorBatch, setNomorBatch] = React.useState("");
  const [catatan, setCatatan] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setJenis("MENINGITIS");
      setTanggalVaksin(new Date().toISOString().slice(0, 10));
      setNomorBatch("");
      setCatatan("");
    }
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        jenis,
        tanggalVaksin: tanggalVaksin || null,
        nomorBatch: nomorBatch.trim() || null,
        catatan: catatan.trim() || null,
      };
      const res = await fetch(`/api/jamaah/${jamaahId}/pre-haji/immunization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal menyimpan imunisasi");
      }
      toast.success(`Imunisasi ${jenis} tersimpan`);
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
      <DialogContent className="max-h-[92vh] overflow-y-auto scrollbar-thin sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Syringe className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Tambah Imunisasi</DialogTitle>
              <DialogDescription>Catat vaksin pra-keberangkatan</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Jenis Vaksin</Label>
            <Select value={jenis} onValueChange={setJenis}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {JENIS_OPTS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Tanggal Vaksin</Label>
            <Input type="date" value={tanggalVaksin} onChange={(e) => setTanggalVaksin(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Nomor Batch</Label>
            <Input value={nomorBatch} onChange={(e) => setNomorBatch(e.target.value)} placeholder="mis. V123456" />
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
            Simpan Imunisasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
