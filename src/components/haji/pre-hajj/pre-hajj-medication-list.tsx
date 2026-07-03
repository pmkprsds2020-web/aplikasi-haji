"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PreHajjMedicationData } from "@/lib/pre-hajj-types";
import { EmptyState } from "../shared";

interface Props {
  jamaahId: string;
  medications: PreHajjMedicationData[];
  onChanged: () => void;
}

export function PreHajjMedicationList({ jamaahId, medications, onChanged }: Props) {
  const [deleting, setDeleting] = React.useState<string | null>(null);

  async function handleDelete(id: string, nama: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/jamaah/${jamaahId}/pre-haji/medication/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal menghapus obat");
      }
      toast.success(`Obat ${nama} dihapus`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setDeleting(null);
    }
  }

  if (!medications.length) {
    return (
      <EmptyState
        icon={Pill}
        title="Belum ada obat tercatat"
        desc="Tambahkan obat rutin yang dibawa jamaah untuk pra-keberangkatan."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {medications.map((m) => (
        <div
          key={m.id}
          className="group relative rounded-xl border border-border/70 bg-card p-3 transition hover:border-primary/40"
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Pill className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{m.namaObat}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {m.dosis && <Badge variant="secondary" className="text-xs">{m.dosis}</Badge>}
                {m.frekuensi && <Badge variant="outline" className="text-xs">{m.frekuensi}</Badge>}
              </div>
              {m.indikasi && <p className="mt-1 text-xs text-muted-foreground">Indikasi: {m.indikasi}</p>}
              {m.catatan && <p className="mt-1 text-xs text-muted-foreground italic">{m.catatan}</p>}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(m.id, m.namaObat)}
              disabled={deleting === m.id}
            >
              {deleting === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
