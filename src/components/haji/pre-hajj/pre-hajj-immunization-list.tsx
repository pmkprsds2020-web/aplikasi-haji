"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Syringe, Trash2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatTanggal } from "@/lib/format";
import type { PreHajjImmunizationData } from "@/lib/pre-hajj-types";
import { EmptyState } from "../shared";

interface Props {
  jamaahId: string;
  immunizations: PreHajjImmunizationData[];
  onChanged: () => void;
}

const JENIS_TONE: Record<string, string> = {
  MENINGITIS: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  INFLUENZA: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  COVID: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  PNEUMOKOKUS: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  HEPATITIS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
};

export function PreHajjImmunizationList({ jamaahId, immunizations, onChanged }: Props) {
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const hasMeningitis = immunizations.some((i) => i.jenis === "MENINGITIS");

  async function handleDelete(id: string, jenis: string) {
    setDeleting(id);
    try {
      const supabase = createClient();
      console.log("Deleting immunization from Supabase, id:", id);
      const { data, error } = await supabase.from("pre_hajj_immunization").delete().eq("id", id);
      console.log("Supabase Response:", data);
      console.log("Supabase Error:", error);
      if (error) {
        console.error("[PreHajjImmunization] DELETE failed:", error);
        toast.error(`Gagal menghapus: ${error.message}`);
        return;
      }
      toast.success(`Imunisasi ${jenis} dihapus`);
      onChanged();
    } catch (err) {
      console.error("[PreHajjImmunization] Exception:", err);
      toast.error(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-3">
      {!hasMeningitis && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">Vaksin Meningitis wajib untuk Jamaah Haji</p>
            <p className="opacity-90">Sertifikat vaksin meningokokus quadrivalent dibutuhkan untuk visa haji.</p>
          </div>
        </div>
      )}
      {hasMeningitis && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="text-xs font-medium">Vaksin Meningitis sudah tercatat</p>
        </div>
      )}

      {!immunizations.length ? (
        <EmptyState
          icon={Syringe}
          title="Belum ada imunisasi tercatat"
          desc="Catat vaksin pra-keberangkatan terutama Meningitis (wajib)."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {immunizations.map((im) => (
            <div key={im.id} className="group relative rounded-xl border border-border/70 bg-card p-3 transition hover:border-primary/40">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Syringe className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${JENIS_TONE[im.jenis] ?? "bg-muted text-muted-foreground"}`}>
                      {im.jenis}
                    </Badge>
                    {im.tanggalVaksin && (
                      <span className="text-xs text-muted-foreground">{formatTanggal(im.tanggalVaksin)}</span>
                    )}
                  </div>
                  {im.nomorBatch && <p className="mt-1 text-xs text-muted-foreground">Batch: {im.nomorBatch}</p>}
                  {im.catatan && <p className="mt-1 text-xs text-muted-foreground italic">{im.catatan}</p>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(im.id, im.jenis)}
                  disabled={deleting === im.id}
                >
                  {deleting === im.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
