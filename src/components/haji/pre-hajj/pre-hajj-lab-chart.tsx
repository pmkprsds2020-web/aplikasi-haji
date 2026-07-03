"use client";

import * as React from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreHajjLabData } from "@/lib/pre-hajj-types";
import { formatTanggal } from "@/lib/format";

interface Props {
  labs: PreHajjLabData[];
}

export function PreHajjLabChart({ labs }: Props) {
  const sorted = [...labs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const data = sorted.map((l) => ({
    label: formatTanggal(l.createdAt),
    Hb: l.hb,
    GDP: l.gdp,
    GD2pp: l.gd2pp,
    HbA1c: l.hba1c,
    Kolesterol: l.kolesterol,
    HDL: l.hdl,
    LDL: l.ldl,
    Trigliserida: l.trigliserida,
    AsamUrat: l.asamUrat,
    SGOT: l.sgot,
    SGPT: l.sgpt,
    Kreatinin: l.kreatinin,
    eGFR: l.egfr,
  }));

  if (!data.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Grafik Tren Lab Pra Haji</CardTitle></CardHeader>
        <CardContent><p className="py-6 text-center text-sm text-muted-foreground">Belum ada data lab.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TrendCard title="Hemoglobin & Glukosa" data={data} unit="g/dL / mg/dL / %">
        <Line type="monotone" dataKey="Hb" name="Hb (g/dL)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="GDP" name="GDP (mg/dL)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="HbA1c" name="HbA1c (%)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <ReferenceLine y={126} stroke="#fde68a" strokeDasharray="4 4" />
        <ReferenceLine y={200} stroke="#fca5a5" strokeDasharray="4 4" />
      </TrendCard>

      <TrendCard title="Profil Lipid" data={data} unit="mg/dL">
        <Line type="monotone" dataKey="Kolesterol" name="Kolesterol" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="HDL" name="HDL" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="LDL" name="LDL" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="Trigliserida" name="Trigliserida" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <ReferenceLine y={200} stroke="#fca5a5" strokeDasharray="4 4" />
      </TrendCard>

      <TrendCard title="Asam Urat & Fungsi Hati" data={data} unit="mg/dL / U/L">
        <Line type="monotone" dataKey="AsamUrat" name="Asam Urat" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="SGOT" name="SGOT" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="SGPT" name="SGPT" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} connectNulls />
      </TrendCard>

      <TrendCard title="Fungsi Ginjal" data={data} unit="mg/dL / mL/min">
        <Line type="monotone" dataKey="Kreatinin" name="Kreatinin" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <Line type="monotone" dataKey="eGFR" name="eGFR" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        <ReferenceLine y={60} stroke="#fde68a" strokeDasharray="4 4" />
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
