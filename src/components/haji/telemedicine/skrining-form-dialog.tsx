"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, ClipboardList, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  SKRINING_FORMS_PASCA, SKRINING_FORMS_PRA, type SkriningFormDef,
} from "@/lib/telemedicine-types";
import { cn } from "@/lib/utils";

interface Props {
  jamaahId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
  /** Default phase — auto-detected by parent (PRA vs PASCA). Can be overridden. */
  initialPhase?: "PRA" | "PASCA";
}

const HARI_OPTS = [
  { value: "1", label: "Hari 1" },
  { value: "7", label: "Hari 7" },
  { value: "14", label: "Hari 14" },
  { value: "30", label: "Hari 30" },
];

export function SkriningFormDialog({ jamaahId, open, onOpenChange, onSent, initialPhase = "PASCA" }: Props) {
  const [phase, setPhase] = React.useState<"PRA" | "PASCA">(initialPhase);
  const [subType, setSubType] = React.useState<string>("");
  const [hariKe, setHariKe] = React.useState("1");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setPhase(initialPhase);
      setSubType("");
      setHariKe("1");
    }
  }, [open, initialPhase]);

  const list: SkriningFormDef[] = phase === "PRA" ? SKRINING_FORMS_PRA : SKRINING_FORMS_PASCA;
  const selected = list.find((s) => s.jenis === subType);

  async function handleSend() {
    if (!selected) {
      toast.error("Pilih jenis skrining");
      return;
    }
    setSending(true);
    try {
      // Build form fields based on screening type
      // These are the fields the jamaah will fill in the InteractiveFormCard
      const formFields: Array<{ key: string; label: string; type: string; required?: boolean; placeholder?: string }> = [];

      // Generic screening fields — the jamaah fills these basic questions
      // The actual screening form (Barthel, PHQ-9, etc.) is opened via the subType
      formFields.push(
        { key: "keluhan", label: "Keluhan utama saat ini", type: "textarea", required: false, placeholder: "Jelaskan keluhan Anda..." },
        { key: "durasi", label: "Berapa lama keluhan dirasakan?", type: "text", required: false, placeholder: "Contoh: 3 hari" },
        { key: "skor", label: "Skor (jika sudah dihitung)", type: "number", required: false, placeholder: "0-100" },
        { key: "catatan", label: "Catatan tambahan untuk dokter", type: "textarea", required: false, placeholder: "Catatan..." },
      );

      const res = await fetch(`/api/telemedicine/rooms/${jamaahId}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "SKRINING",
          subType: selected.jenis,
          title: selected.label,
          fields: formFields,
          hariKe: Number(hariKe),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal mengirim permintaan skrining");
      }
      toast.success(`Form skrining "${selected.label}" terkirim`);
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
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Kirim Form Skrining</DialogTitle>
              <DialogDescription>Pilih instrumen skrining untuk pasien</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={phase} onValueChange={(v) => { setPhase(v as "PRA" | "PASCA"); setSubType(""); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="PRA">Pra Haji</TabsTrigger>
              <TabsTrigger value="PASCA">Pasca Haji</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Pilih skrining ({list.length})
            </Label>
            <div className="grid gap-2">
              {list.map((s) => {
                const active = subType === s.jenis;
                return (
                  <button
                    key={s.jenis}
                    type="button"
                    onClick={() => setSubType(s.jenis)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border/70 bg-card hover:border-primary/40 hover:bg-accent/40"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {s.jenis.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.jenis}</p>
                    </div>
                  </button>
                );
              })}
            </div>
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
          <Button onClick={handleSend} disabled={sending || !selected}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Kirim Form Skrining
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Re-export icon type for parents
export type { LucideIcon };
