"use client";

import * as React from "react";
import {
  LayoutDashboard, Users, CalendarClock, Sparkles, Moon, Sun,
  HeartPulse, Stethoscope, type LucideIcon,
} from "lucide-react";
import { useApp, type ViewName } from "@/lib/store";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardView } from "./dashboard-view";
import { JamaahListView } from "./jamaah-list-view";
import { JamaahDetailView } from "./jamaah-detail-view";
import { MonitoringView } from "./monitoring-view";
import { AiView } from "./ai-view";
import { TelemedicineView } from "./telemedicine/telemedicine-view";

const NAV: { view: ViewName; label: string; icon: LucideIcon; desc: string }[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Ringkasan & risiko" },
  { view: "jamaah", label: "Data Jamaah", icon: Users, desc: "Kelola jamaah" },
  { view: "telemedicine", label: "Telemedicine", icon: Stethoscope, desc: "Chat & monitoring" },
  { view: "monitoring", label: "Monitoring", icon: CalendarClock, desc: "Jadwal 1·7·14·30" },
  { view: "ai", label: "Analisis AI", icon: Sparkles, desc: "Rekomendasi AI" },
];

export function AppShell() {
  const { view, telemedicineJamaahId } = useApp();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <SidebarContent />
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur lg:hidden">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <HeartPulse className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold">SiHaji Care</span>
            </div>
            <ThemeToggle />
          </header>

          {/* Desktop top bar */}
          <header className="sticky top-0 z-20 hidden items-center justify-between border-b border-border bg-card/80 px-6 py-3 backdrop-blur lg:flex">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground">
                {NAV.find((n) => n.view === (view === "detail" ? "jamaah" : view))?.label ?? "Dashboard"}
              </h2>
            </div>
            <ThemeToggle />
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {view === "telemedicine" ? (
              <div className="mx-auto max-w-7xl">
                <TelemedicineView initialJamaahId={telemedicineJamaahId ?? undefined} />
              </div>
            ) : (
              <div className="mx-auto max-w-6xl">
                {view === "dashboard" && <DashboardView />}
                {view === "jamaah" && <JamaahListView />}
                {view === "detail" && <JamaahDetailView />}
                {view === "monitoring" && <MonitoringView />}
                {view === "ai" && <AiView />}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Footer sticky */}
      <footer className="mt-auto border-t border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">SiHaji Care</span> — Electronic Hajj Health Record ·
          Pendekatan Biopsikososial Spiritual Kedokteran Keluarga ·
          <span className="ml-1">Panduan Kemenkes RI</span>
        </p>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <MobileNavBtn view="dashboard" />
        <MobileNavBtn view="jamaah" />
        <MobileNavBtn view="telemedicine" />
        <MobileNavBtn view="monitoring" />
        <MobileNavBtn view="ai" />
      </nav>
    </div>
  );
}

function MobileNavBtn({ view: target }: { view: ViewName }) {
  const { view, goDashboard, goJamaahList, goMonitoring, goAI, goTelemedicine } = useApp();
  const active = view === target || (target === "jamaah" && view === "detail");
  const meta = NAV.find((n) => n.view === target)!;
  const Icon = meta.icon;
  const go = target === "dashboard" ? goDashboard : target === "jamaah" ? goJamaahList : target === "monitoring" ? goMonitoring : target === "ai" ? goAI : goTelemedicine;
  return (
    <button
      onClick={go}
      className={cn(
        "flex flex-col items-center gap-0.5 py-2 text-xs transition",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      {meta.label}
    </button>
  );
}

function SidebarContent() {
  const { view, goDashboard, goJamaahList, goMonitoring, goAI, goTelemedicine } = useApp();
  const goFns: Record<ViewName, () => void> = {
    dashboard: goDashboard, jamaah: goJamaahList, detail: goJamaahList, monitoring: goMonitoring, ai: goAI, telemedicine: () => goTelemedicine(),
  };
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <HeartPulse className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold leading-tight">SiHaji Care</p>
          <p className="text-xs text-sidebar-foreground/60">EHHR · Pra → Pasca Haji</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">Menu Utama</p>
        {NAV.map((n) => {
          const active = view === n.view || (n.view === "jamaah" && view === "detail");
          const Icon = n.icon;
          return (
            <button
              key={n.view}
              onClick={goFns[n.view]}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{n.label}</p>
                <p className={cn("text-xs", active ? "text-sidebar-primary-foreground/70" : "text-sidebar-foreground/50")}>{n.desc}</p>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg bg-sidebar-accent/50 p-3">
          <p className="text-xs font-semibold text-sidebar-accent-foreground">Pendekatan Holistik</p>
          <p className="mt-1 text-xs text-sidebar-foreground/60">
            Biologis · Psikologis · Sosial · Spiritual — sesuai Kedokteran Keluarga
          </p>
        </div>
        <div className="mt-2 px-1">
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;
  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-9 w-9"
      title={isDark ? "Mode terang" : "Mode gelap"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
