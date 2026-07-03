"use client";

import * as React from "react";
import { Loader2, Sparkles, ChevronDown, ChevronRight, AlertTriangle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { TelemedicineAiSummaryData, AlertLevel } from "@/lib/telemedicine-types";
import { cn } from "@/lib/utils";

interface Props {
  jamaahId: string;
  /** When this number changes, refetch is NOT triggered — only manual click triggers fetch. */
  trigger?: number;
  className?: string;
  variant?: "panel" | "compact";
}

const ALERT_STYLE: Record<AlertLevel, { bg: string; text: string; label: string }> = {
  RED: { bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900", text: "text-rose-700 dark:text-rose-300", label: "Kritis" },
  ORANGE: { bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900", text: "text-orange-700 dark:text-orange-300", label: "Perhatian" },
  YELLOW: { bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900", text: "text-amber-700 dark:text-amber-300", label: "Info" },
};

export function AiSummaryPanel({ jamaahId, trigger, className, variant = "panel" }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [summary, setSummary] = React.useState<TelemedicineAiSummaryData | null>(null);
  const [soapOpen, setSoapOpen] = React.useState(false);
  const [planOpen, setPlanOpen] = React.useState(false);

  // Reset state when jamaahId changes
  React.useEffect(() => {
    setSummary(null);
    setLoading(false);
  }, [jamaahId]);

  async function fetchSummary() {
    setLoading(true);
    try {
      const res = await fetch(`/api/telemedicine/rooms/${jamaahId}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Gagal memanggil AI");
      }
      const data = (await res.json()) as { summary: TelemedicineAiSummaryData };
      setSummary(data.summary);
      toast.success("Analisis AI siap");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memanggil AI");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "compact") {
    return (
      <Button
        onClick={fetchSummary}
        disabled={loading}
        size="sm"
        variant="outline"
        className={cn("border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900", className)}
      >
        {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
        AI Summary
      </Button>
    );
  }

  return (
    <div className={cn("rounded-xl border border-teal-200 bg-teal-50/50 dark:bg-teal-950/20 dark:border-teal-900", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-teal-100 dark:border-teal-900 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-300" />
          <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-100">AI Summary Telemedicine</h4>
        </div>
        <Button onClick={fetchSummary} disabled={loading} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
          {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
          Analisis AI
        </Button>
      </div>

      <div className="p-4">
        {!summary && !loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/50">
              <Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-300" />
            </span>
            <p className="text-sm font-medium text-foreground">Belum ada analisis AI</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Klik "Analisis AI" untuk membuat ringkasan kondisi pasien berbasis riwayat chat & rekam medis.
            </p>
          </div>
        )}

        {loading && (
          <div className="space-y-2 py-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-teal-100 dark:bg-teal-900/50" />
            <div className="h-3 w-full animate-pulse rounded bg-teal-100 dark:bg-teal-900/50" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-teal-100 dark:bg-teal-900/50" />
            <p className="pt-2 text-xs text-teal-700 dark:text-teal-300">AI sedang membaca riwayat pasien…</p>
          </div>
        )}

        {summary && !loading && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {summary.prioritas && (
                <Badge className={cn(
                  "border",
                  summary.prioritas.toLowerCase().includes("tinggi") || summary.prioritas.toLowerCase().includes("urgent")
                    ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900"
                    : summary.prioritas.toLowerCase().includes("sedang")
                    ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900"
                    : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900"
                )}>
                  Prioritas: {summary.prioritas}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">
                {new Date(summary.createdAt).toLocaleString("id-ID")}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{summary.ringkasan}</p>

            {summary.alerts && summary.alerts.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alerts</p>
                {summary.alerts.map((a, i) => {
                  const s = ALERT_STYLE[a.level];
                  return (
                    <div key={i} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs", s.bg, s.text)}>
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="flex-1">{a.detail}</span>
                      <span className="rounded bg-white/60 dark:bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {summary.assessment && (
              <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assessment</p>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{summary.assessment}</p>
              </div>
            )}

            {summary.soap && (
              <Collapsible open={soapOpen} onOpenChange={setSoapOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-sm font-medium hover:bg-accent/40">
                  <span>SOAP Note</span>
                  {soapOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1.5">
                  <pre className="whitespace-pre-wrap rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-foreground font-mono">{summary.soap}</pre>
                </CollapsibleContent>
              </Collapsible>
            )}

            {summary.plan && (
              <Collapsible open={planOpen} onOpenChange={setPlanOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-sm font-medium hover:bg-accent/40">
                  <span>Plan</span>
                  {planOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1.5">
                  <pre className="whitespace-pre-wrap rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-foreground">{summary.plan}</pre>
                </CollapsibleContent>
              </Collapsible>
            )}

            {summary.rekomendasi && summary.rekomendasi.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rekomendasi</p>
                <div className="space-y-1.5">
                  {summary.rekomendasi
                    .slice()
                    .sort((a, b) => a.urutan - b.urutan)
                    .map((r, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs">
                        <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{r.kategori}</span>
                            <span className="text-[10px] text-muted-foreground">#{r.urutan}</span>
                          </div>
                          <p className="mt-0.5 text-foreground">{r.tindakan}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
