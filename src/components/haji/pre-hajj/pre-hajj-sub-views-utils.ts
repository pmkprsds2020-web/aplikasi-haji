"use client";

import {
  LayoutDashboard, Activity, TestTube, HeartPulse, ClipboardList, Pill,
  Syringe, Footprints, GraduationCap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Activity, TestTube, HeartPulse, ClipboardList, Pill,
  Syringe, Footprints, GraduationCap,
};

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Activity;
}
