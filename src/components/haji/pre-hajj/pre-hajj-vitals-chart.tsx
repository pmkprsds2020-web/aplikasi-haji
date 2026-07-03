"use client";

import * as React from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreHajjVitalData } from "@/lib/pre-hajj-types";
import { formatTanggal } from "@/lib/format";

interface Props {
  vitals: PreHajjVitalData[];
}

export function PreHajjVitalsChart({ vitals }: Props) {
  const sorted = [...vitals].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const data = sorted.map((v) => {
    const bb = v.beratBadan;
    const tb = v.tinggiBadan;
    const bmi =
      bb != null && tb != null && tb > 0 ? Number((bb / Math.pow(tb / 100, 2)).toFixed(1)) : null;
    return {
      label: formatTanggal(v.createdAt),
      TD: v.tdSistolik,
      TDd: v.tdDiastolik,
      Nadi: v.nadi,
      Suhu: v.suhu,
      SpO2: v.spo2,
      BB: v.beratBadan,
      LP: v.lingkarPerut,
      BMI: bmi,
    };
  });

  if (!data.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Grafik Tren TTV Pra Haji</CardTitle></CardHeader>
        <CardContent><p className="py-6 text-center text-sm text-muted-foreground">Belum ada data tanda vital.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TrendCard title="Tekanan Darah" data={data} unit="mmHg">
        <Line type="monotone" dataKey="TD" name="Sistolik" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="TDd" name="Diastolik" stroke="#5eead4" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <ReferenceLine y={140} stroke="#fca5a5" strokeDasharray="4 4" />
        <ReferenceLine y={90} stroke="#fde68a" strokeDasharray="4 4" />
      </TrendCard>

      <TrendCard title="Nadi & RR" data={data} unit="×/mnt">
        <Line type="monotone" dataKey="Nadi" name="Nadi" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </TrendCard>

      <TrendCard title="Suhu & SpO₂" data={data} unit="°C / %">
        <Line type="monotone" dataKey="Suhu" name="Suhu (°C)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="SpO2" name="SpO₂ (%)" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <ReferenceLine y={38} stroke="#fca5a5" strokeDasharray="4 4" />
        <ReferenceLine y={94} stroke="#fde68a" strokeDasharray="4 4" />
      </TrendCard>

      <TrendCard title="Berat Badan & Lingkar Perut" data={data} unit="kg / cm">
        <Line type="monotone" dataKey="BB" name="Berat Badan (kg)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="LP" name="Lingkar Perut (cm)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </TrendCard>

      <TrendCard title="Indeks Massa Tubuh (IMT)" data={data} unit="kg/m²">
        <Line type="monotone" dataKey="BMI" name="BMI" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <ReferenceLine y={18.5} stroke="#fde68a" strokeDasharray="4 4" />
        <ReferenceLine y={25} stroke="#fde68a" strokeDasharray="4 4" />
        <ReferenceLine y={30} stroke="#fca5a5" strokeDasharray="4 4" />
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
