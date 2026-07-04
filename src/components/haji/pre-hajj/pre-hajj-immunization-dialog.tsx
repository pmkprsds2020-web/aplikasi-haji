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
import { createClient } from "@/lib/supabase/client";

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
      const supabase = createClient();
      const payload = {
        jamaah_id: jamaahId,
        jenis,
        tanggal_vaksin: tanggalVaksin ? new Date(tanggalVaksin).toISOString() : null,
        nomor_batch: nomorBatch.trim() || null,
        catatan: catatan.trim() || null,
      };
      console.log("Saving to Supabase...");
      console.log("Payload:", payload);
      const { data, error } = await supabase.from("pre_hajj_immunization").insert(payload);
      console.log("Supabase Response:", data);
      console.log("Supabase Error:", error);
      if (error) {
        console.error("[PreHajjImmunization] INSERT failed:", error);
        toast.error(`Gagal menyimpan: ${error.message}`);
        return;
      }
      toast.success(`Imunisasi ${jenis} tersimpan`);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error("[PreHajjImmunization] Exception:", err);
      toast.error(`Exception: ${err instanceof Error ? err.message : String(err)}`);
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
