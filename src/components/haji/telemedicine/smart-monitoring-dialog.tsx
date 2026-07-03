"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarClock, Send } from "lucide-react";
import { toast } from "sonner";
import { SMART_MONITORING_PHASES, type SmartMonitoringPhase } from "@/lib/telemedicine-types";
import { hariSejak } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  jamaahId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
  /** ISO date the jamaah arrived; if missing → PRA. */
  tanggalTiba?: string | null;
}

function detectPhase(tanggalTiba?: string | null): string {
  if (!tanggalTiba) return "PRA";
  const d = hariSejak(tanggalTiba);
  if (d < 1) return "PASCA_1";
  if (d < 7) return "PASCA_1"; // default to first milestone within range
  if (d < 14) return "PASCA_7";
  if (d < 30) return "PASCA_14";
  return "PASCA_30";
}

export function SmartMonitoringDialog({ jamaahId, open, onOpenChange, onSent, tanggalTiba }: Props) {
  const defaultKey = detectPhase(tanggalTiba);
  const [selected, setSelected] = React.useState<string>(defaultKey);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open) setSelected(detectPhase(tanggalTiba));
  }, [open, tanggalTiba]);

  const currentPhase: SmartMonitoringPhase | undefined = SMART_MONITORING_PHASES.find((p) => p.key === selected);

  async function handleStart() {
    if (!selected) return;
    setSending(true);
    try {
      const res = await fetch(`/api/telemedicine/rooms/${jamaahId}/smart-monitoring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: selected }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal memulai monitoring");
      }
      const data = (await res.json()) as { sentCount?: number };
      toast.success(`Smart Monitoring aktif — ${data.sentCount ?? currentPhase?.forms.length ?? 0} form terkirim`);
      onSent();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memulai");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Smart Telemonitoring</DialogTitle>
              <DialogDescription>
                Pilih fase monitoring — sistem akan mengirim form otomatis sesuai jadwal
                {tanggalTiba ? ` (hari ke-${hariSejak(tanggalTiba)} pasca tiba)` : " (status: Pra Haji)"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SMART_MONITORING_PHASES.map((p) => {
              const active = selected === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelected(p.key)}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-3 text-left transition",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border/70 bg-card hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{p.label}</span>
                    {defaultKey === p.key && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Sekarang</Badge>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{p.condition}</span>
                  <span className="mt-1 text-[10px] font-medium text-primary">{p.forms.length} form</span>
                </button>
              );
            })}
          </div>

          {currentPhase && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Form yang akan dikirim — {currentPhase.label}
              </p>
              <div className="space-y-1.5">
                {currentPhase.forms.map((f, i) => (
                  <div
                    key={`${f.category}-${f.subType}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-1.5 text-xs"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 font-medium text-foreground">{f.title}</span>
                    <Badge variant="outline" className="text-[10px]">{f.category}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleStart} disabled={sending || !selected}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Mulai Monitoring
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
