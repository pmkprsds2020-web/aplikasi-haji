import type { RiskLevel } from "./types";

export function formatTanggal(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatTanggalWaktu(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function hariSejak(iso: string): number {
  const d = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - d) / (1000 * 60 * 60 * 24)));
}

export const RISK_STYLE: Record<
  RiskLevel,
  { label: string; badge: string; dot: string; ring: string; text: string; bg: string }
> = {
  HIJAU: {
    label: "Hijau",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  KUNING: {
    label: "Kuning",
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900",
    dot: "bg-amber-500",
    ring: "ring-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
  MERAH: {
    label: "Merah",
    badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900",
    dot: "bg-rose-500",
    ring: "ring-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
  },
};

export function kelaminLabel(k: string): string {
  return k === "L" ? "Laki-laki" : "Perempuan";
}

export function initials(nama: string): string {
  return nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}
