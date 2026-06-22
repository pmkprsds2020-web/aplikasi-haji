"use client";

import * as React from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VitalSignData } from "@/lib/types";
import { formatTanggal } from "@/lib/format";

interface Props {
  vitals: VitalSignData[];
}

export function VitalSignsChart({ vitals }: Props) {
  // urutkan cronologis
  const sorted = [...vitals].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const data = sorted.map((v) => ({
    label: `H${v.hariKe}`,
    tgl: formatTanggal(v.createdAt),
    TD: v.tdSistolik != null ? v.tdSistolik : null,
    TDd: v.tdDiastolik != null ? v.tdDiastolik : null,
    Nadi: v.nadi,
    RR: v.rr,
    Suhu: v.suhu,
    SpO2: v.spo2,
    GD: v.gulaDarah,
    BB: v.beratBadan,
  }));

  if (!data.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Grafik Tren Tanda Vital</CardTitle></CardHeader>
        <CardContent><p className="py-6 text-center text-sm text-muted-foreground">Belum ada data tanda vital.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TrendCard title="Tekanan Darah & Nadi" data={data} unit="mmHg / ×/mnt">
        <Line type="monotone" dataKey="TD" name="Sistolik" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="TDd" name="Diastolik" stroke="#5eead4" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="Nadi" name="Nadi" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <ReferenceLine y={140} stroke="#fca5a5" strokeDasharray="4 4" />
      </TrendCard>

      <TrendCard title="Suhu & SpO₂" data={data} unit="°C / %">
        <Line type="monotone" dataKey="Suhu" name="Suhu (°C)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="SpO2" name="SpO₂ (%)" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <ReferenceLine y={38} stroke="#fca5a5" strokeDasharray="4 4" />
        <ReferenceLine y={94} stroke="#fde68a" strokeDasharray="4 4" />
      </TrendCard>

      <TrendCard title="Gula Darah" data={data} unit="mg/dL">
        <Line type="monotone" dataKey="GD" name="Gula Darah" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <ReferenceLine y={180} stroke="#fde68a" strokeDasharray="4 4" />
        <ReferenceLine y={250} stroke="#fca5a5" strokeDasharray="4 4" />
      </TrendCard>

      <TrendCard title="Berat Badan & RR" data={data} unit="kg / ×/mnt">
        <Line type="monotone" dataKey="BB" name="Berat Badan (kg)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="RR" name="RR (×/mnt)" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </TrendCard>
    </div>
  );
}

function TrendCard({
  title, data, unit, children,
}: {
  title: string;
  data: Record<string, unknown>[];
  unit: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{title}</span>
          <span className="text-xs font-normal text-muted-foreground">{unit}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  borderRadius: 8, border: "1px solid var(--border)",
                  background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12,
                }}
                labelFormatter={(_, p) => (p && p[0] ? String(p[0].payload.tgl) : "")}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {children}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
