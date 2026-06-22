"use client";

import * as React from "react";
import {
  Bug, HeartPulse, Accessibility, PersonStanding, Apple, Brain, Moon,
  Footprints, Sparkles, Users, ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RISK_STYLE } from "@/lib/format";
import type { RiskLevel, Dimensi } from "@/lib/types";

const ICON_MAP: Record<string, LucideIcon> = {
  Bug, HeartPulse, Accessibility, PersonStanding, Apple, Brain, Moon,
  Footprints, Sparkles, Users, ClipboardCheck,
};

const DIMENSI_ICON: Record<Dimensi, LucideIcon> = {
  BIOLOGIS: HeartPulse,
  PSIKOLOGIS: Brain,
  SOSIAL: Users,
  SPIRITUAL: Sparkles,
};

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? HeartPulse;
}

export function getDimensiIcon(d: Dimensi): LucideIcon {
  return DIMENSI_ICON[d];
}

export function RiskBadge({
  level,
  className,
  withDot = true,
}: {
  level: RiskLevel;
  className?: string;
  withDot?: boolean;
}) {
  const s = RISK_STYLE[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        s.badge,
        className
      )}
    >
      {withDot && <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />}
      {s.label}
    </span>
  );
}

export function RiskDot({ level }: { level: RiskLevel }) {
  const s = RISK_STYLE[level];
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", s.dot)} />;
}

export function IconChip({
  icon,
  className,
  size = "md",
}: {
  icon: LucideIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const I = icon;
  const sz =
    size === "sm" ? "h-7 w-7" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const ic = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
        sz,
        className
      )}
    >
      <I className={ic} />
    </span>
  );
}

export function YesNoField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5 transition hover:border-primary/40 hover:bg-accent/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
      <span className="text-sm">
        <span className="font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export function ScoreRadioGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card px-3 py-2.5">
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition",
              value === o.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/40 hover:bg-accent/40"
            )}
          >
            <span className="tabular-nums">{String(o.value)}</span>
            <span className="ml-1 opacity-80">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  placeholder,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {unit && <span className="shrink-0 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-1 flex items-center gap-2">
      <span className="h-1 w-1 rounded-full bg-primary" />
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </h4>
    </div>
  );
}

export function EmptyState({
  icon: Icon = HeartPulse,
  title,
  desc,
}: {
  icon?: LucideIcon;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {desc && <p className="max-w-sm text-xs text-muted-foreground">{desc}</p>}
    </div>
  );
}
