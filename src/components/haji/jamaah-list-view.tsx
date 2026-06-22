"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, UserPlus, ChevronRight, Filter, Plane, MapPin, Stethoscope,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { RISK_STYLE, formatTanggal, hariSejak, initials, kelaminLabel } from "@/lib/format";
import { RiskBadge, EmptyState } from "./shared";
import { JamaahFormDialog } from "./jamaah-form-dialog";
import type { JamaahData, RiskLevel } from "@/lib/types";

interface ListItem extends JamaahData {
  screeningCount: number;
}

type FilterKey = "ALL" | RiskLevel;

export function JamaahListView() {
  const { goDetail, refreshKey, bumpRefresh } = useApp();
  const [list, setList] = React.useState<ListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<FilterKey>("ALL");
  const [addOpen, setAddOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (filter !== "ALL") params.set("risk", filter);
      const res = await fetch(`/api/jamaah?${params}`);
      const { jamaah } = await res.json();
      setList(jamaah as ListItem[]);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [q, filter]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load, refreshKey]);

  const counts = React.useMemo(() => {
    return {
      ALL: list.length,
      MERAH: list.filter((j) => j.riskLevel === "MERAH").length,
      KUNING: list.filter((j) => j.riskLevel === "KUNING").length,
      HIJAU: list.filter((j) => j.riskLevel === "HIJAU").length,
    };
  }, [list]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Data Jamaah Haji</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data jamaah & jalankan skrining biopsikososial spiritual
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Tambah Jamaah
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, NIK, kloter, atau porsi…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          {(["ALL", "MERAH", "KUNING", "HIJAU"] as FilterKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === k
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {k === "ALL" ? `Semua (${counts.ALL})` : (
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${RISK_STYLE[k].dot}`} />
                  {RISK_STYLE[k].label} ({counts[k]})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={UserPlus}
            title="Belum ada data jamaah"
            desc="Tambahkan jamaah pertama untuk memulai monitoring pasca kepulangan."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((j) => (
            <button
              key={j.id}
              onClick={() => goDetail(j.id)}
              className="group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-left transition hover:border-primary/40 hover:shadow-sm"
            >
              <span className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${RISK_STYLE[j.riskLevel].bg} ${RISK_STYLE[j.riskLevel].text}`}>
                {initials(j.nama)}
                <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${RISK_STYLE[j.riskLevel].dot}`} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{j.nama}</p>
                  <RiskBadge level={j.riskLevel} withDot={false} />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{j.usia} th · {kelaminLabel(j.kelamin)}</span>
                  <span className="flex items-center gap-1"><Plane className="h-3 w-3" /> {j.bandara}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.kabupatenKota}</span>
                  <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" /> {j.puskesmas}</span>
                </div>
              </div>
              <div className="hidden text-right md:block">
                <p className="text-xs text-muted-foreground">Kloter {j.kloter}</p>
                <p className="text-xs text-muted-foreground">Tiba {hariSejak(j.tanggalTiba)}h lalu · {j.screeningCount} skrining</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      )}

      <JamaahFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={() => bumpRefresh()}
      />
    </div>
  );
}
