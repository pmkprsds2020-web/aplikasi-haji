"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Activity } from "lucide-react";
import { toast } from "sonner";
import { TTV_PARAMS, type FormField } from "@/lib/telemedicine-types";
import { cn } from "@/lib/utils";

interface Props {
  jamaahId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
}

const HARI_OPTS = [
  { value: "1", label: "Hari 1" },
  { value: "7", label: "Hari 7" },
  { value: "14", label: "Hari 14" },
  { value: "30", label: "Hari 30" },
];

export function TtvFormDialog({ jamaahId, open, onOpenChange, onSent }: Props) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set(["tdSistolik", "tdDiastolik", "nadi", "rr", "suhu", "spo2"]));
  const [hariKe, setHariKe] = React.useState("1");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setSelected(new Set(["tdSistolik", "tdDiastolik", "nadi", "rr", "suhu", "spo2"]));
      setHariKe("1");
    }
  }, [open]);

  const toggle = (key: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(TTV_PARAMS.map((p) => p.key)));
  const selectNone = () => setSelected(new Set());

  async function handleSend() {
    if (selected.size === 0) {
      toast.error("Pilih minimal 1 parameter TTV");
      return;
    }
    setSending(true);
    try {
      const fields: FormField[] = TTV_PARAMS.filter((p) => selected.has(p.key)).map((p) => ({
        key: p.key,
        label: p.label,
        type: "number",
        unit: p.unit,
        required: true,
        placeholder: `0 ${p.unit}`,
      }));
      const subType = Array.from(selected).join(",");
      const res = await fetch(`/api/telemedicine/rooms/${jamaahId}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "TTV",
          subType,
          title: "Pengisian TTV",
          fields,
          hariKe: Number(hariKe),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal mengirim permintaan TTV");
      }
      toast.success(`Form TTV terkirim — ${selected.size} parameter`);
      onSent();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim");
    } finally {
      setSending(false);
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
              <DialogTitle className="text-lg">Kirim Form TTV</DialogTitle>
              <DialogDescription>Pilih parameter yang akan diisi pasien</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">
              Parameter ({selected.size} dipilih)
            </Label>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs font-medium text-primary hover:underline">
                Pilih semua
              </button>
              <span className="text-muted-foreground">·</span>
              <button onClick={selectNone} className="text-xs font-medium text-muted-foreground hover:underline">
                Kosongkan
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {TTV_PARAMS.map((p) => {
              const checked = selected.has(p.key);
              return (
                <label
                  key={p.key}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition",
                    checked
                      ? "border-primary bg-primary/5"
                      : "border-border/70 bg-card hover:border-primary/40 hover:bg-accent/40"
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(p.key)} />
                  <span className="flex-1 font-medium text-foreground">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.unit}</span>
                </label>
              );
            })}
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Jadwal Monitoring</Label>
            <Select value={hariKe} onValueChange={setHariKe}>
              <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HARI_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSend} disabled={sending || selected.size === 0}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Kirim Form TTV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
