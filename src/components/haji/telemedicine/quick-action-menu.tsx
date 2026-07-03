"use client";

import * as React from "react";
import {
  Activity, ClipboardList, GraduationCap, Pill, CalendarClock, Paperclip, Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QUICK_ACTIONS, type QuickAction } from "@/lib/telemedicine-types";

export const QUICK_ACTION_ICONS: Record<string, LucideIcon> = {
  Activity, ClipboardList, GraduationCap, Pill, CalendarClock, Paperclip, Sparkles,
};

const COLOR_CLASS: Record<string, { text: string; bg: string; border: string }> = {
  emerald: { text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-900" },
  violet: { text: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-900" },
  sky: { text: "text-sky-700 dark:text-sky-300", bg: "bg-sky-50 dark:bg-sky-950/40", border: "border-sky-200 dark:border-sky-900" },
  amber: { text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-900" },
  rose: { text: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-900" },
  slate: { text: "text-slate-700 dark:text-slate-300", bg: "bg-slate-50 dark:bg-slate-950/40", border: "border-slate-200 dark:border-slate-900" },
  teal: { text: "text-teal-700 dark:text-teal-300", bg: "bg-teal-50 dark:bg-teal-950/40", border: "border-teal-200 dark:border-teal-900" },
};

interface Props {
  onAction: (action: QuickAction) => void;
  className?: string;
}

/** Horizontal scrollable row of quick action buttons (WhatsApp Business style). */
export function QuickActionMenu({ onAction, className }: Props) {
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto scrollbar-thin pb-1", className)}>
      {QUICK_ACTIONS.map((a) => {
        const I = QUICK_ACTION_ICONS[a.icon] ?? Activity;
        const col = COLOR_CLASS[a.color] ?? COLOR_CLASS.emerald;
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => onAction(a)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:shadow-sm",
              col.bg, col.text, col.border
            )}
            title={a.label}
          >
            <I className="h-3.5 w-3.5" />
            <span className="whitespace-nowrap">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { QUICK_ACTIONS };
