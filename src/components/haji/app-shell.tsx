"use client";

import * as React from "react";
import {
  LayoutDashboard, Users, CalendarClock, Sparkles, Moon, Sun,
  HeartPulse, Stethoscope, Loader2, LogOut, UserCircle, ClipboardList,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useApp, type ViewName } from "@/lib/store";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// Doctor views
import { DashboardView } from "./dashboard-view";
import { JamaahListView } from "./jamaah-list-view";
import { JamaahDetailView } from "./jamaah-detail-view";
import { MonitoringView } from "./monitoring-view";
import { AiView } from "./ai-view";
import { TelemedicineView } from "./telemedicine/telemedicine-view";
// Jamaah views
import { JamaahDashboard } from "./jamaah-views/jamaah-dashboard";
import { JamaahRiwayat } from "./jamaah-views/jamaah-riwayat";
import { JamaahChat } from "./jamaah-views/jamaah-chat";
import { JamaahProfil } from "./jamaah-views/jamaah-profil";
// Auth
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";
import { LoginScreen } from "./login-screen";
import { SupabaseStatusBadge } from "./supabase-status-badge";
import { SupabaseStatusView } from "./supabase-status-view";

// ===== Doctor nav =====
const DOCTOR_NAV: { view: ViewName; label: string; icon: LucideIcon; desc: string }[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Ringkasan & risiko" },
  { view: "jamaah", label: "Data Jamaah", icon: Users, desc: "Kelola jamaah" },
  { view: "telemedicine", label: "Telemedicine", icon: Stethoscope, desc: "Chat & monitoring" },
  { view: "monitoring", label: "Monitoring", icon: CalendarClock, desc: "Jadwal 1·7·14·30" },
  { view: "ai", label: "Analisis AI", icon: Sparkles, desc: "Rekomendasi AI" },
  { view: "status", label: "Status Sistem", icon: Activity, desc: "Monitoring Supabase" },
];

// ===== Jamaah nav (simplified) =====
const JAMAAH_NAV: { view: ViewName; label: string; icon: LucideIcon; desc: string }[] = [
  { view: "jamaah-dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Beranda" },
  { view: "jamaah-riwayat", label: "Riwayat Kesehatan", icon: ClipboardList, desc: "TTV, Lab, Skrining" },
  { view: "jamaah-chat", label: "Telemedicine", icon: Stethoscope, desc: "Chat dokter" },
  { view: "jamaah-profil", label: "Profil Saya", icon: UserCircle, desc: "Data diri" },
  { view: "status", label: "Status Sistem", icon: Activity, desc: "Monitoring Supabase" },
];

export function AppShell() {
  const {
    view, telemedicineJamaahId, goDashboard, goJamaahDashboard, goStatus,
  } = useApp();
  const { user, loading, signOut, role } = useSupabaseAuth();

  // ===== Auto-redirect to correct dashboard on login based on role =====
  React.useEffect(() => {
    if (!user || !role) return;
    // Only redirect on initial load (when view is the default "dashboard")
    if (view === "dashboard" && role === "jamaah") {
      goJamaahDashboard();
    }
  }, [user, role, view, goJamaahDashboard]);

  // ===== Auth gate =====
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Memuat SiHaji Care…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const isJamaah = role === "jamaah";
  const nav = isJamaah ? JAMAAH_NAV : DOCTOR_NAV;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <SidebarContent nav={nav} isJamaah={isJamaah} />
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
            <div className="flex items-center gap-1.5">
              <SupabaseStatusBadge compact />
              <ThemeToggle />
              <UserChip user={user} role={role} onSignOut={signOut} compact />
            </div>
          </header>

          {/* Desktop top bar */}
          <header className="sticky top-0 z-20 hidden items-center justify-between border-b border-border bg-card/80 px-6 py-3 backdrop-blur lg:flex">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground">
                {nav.find((n) => n.view === view)?.label ?? "Dashboard"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <SupabaseStatusBadge />
              <UserChip user={user} role={role} onSignOut={signOut} />
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {view === "status" ? (
              // ===== Status view (both roles) =====
              <div className="mx-auto max-w-6xl">
                <SupabaseStatusView />
              </div>
            ) : isJamaah ? (
              // ===== Jamaah views =====
              <div className="mx-auto max-w-4xl">
                {view === "jamaah-dashboard" && <JamaahDashboard />}
                {view === "jamaah-riwayat" && <JamaahRiwayat />}
                {view === "jamaah-chat" && <JamaahChat />}
                {view === "jamaah-profil" && <JamaahProfil />}
              </div>
            ) : (
              // ===== Doctor views =====
              <>
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
              </>
            )}
          </main>
        </div>
      </div>

      {/* Footer sticky */}
      <footer className="mt-auto border-t border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">SiHaji Care</span> — Electronic Hajj Health Record ·
          Pendekatan Biopsikososial Spiritual Kedokteran Keluarga
        </p>
      </footer>

      {/* Mobile bottom nav — role-based */}
      <nav
        className="sticky bottom-0 z-30 grid border-t border-border bg-card/95 backdrop-blur lg:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map((n) => (
          <MobileNavBtn key={n.view} target={n.view} nav={nav} />
        ))}
      </nav>
    </div>
  );
}

function MobileNavBtn({
  target, nav,
}: {
  target: ViewName;
  nav: { view: ViewName; label: string; icon: LucideIcon; desc: string }[];
}) {
  const {
    view, goDashboard, goJamaahList, goMonitoring, goAI, goTelemedicine,
    goJamaahDashboard, goJamaahRiwayat, goJamaahChat, goJamaahProfil,
    goStatus,
  } = useApp();
  const meta = nav.find((n) => n.view === target)!;
  const active = view === target;

  const goMap: Partial<Record<ViewName, () => void>> = {
    dashboard: goDashboard,
    jamaah: goJamaahList,
    monitoring: goMonitoring,
    ai: goAI,
    telemedicine: () => goTelemedicine(),
    "jamaah-dashboard": goJamaahDashboard,
    "jamaah-riwayat": () => goJamaahRiwayat(),
    "jamaah-chat": goJamaahChat,
    "jamaah-profil": goJamaahProfil,
    status: goStatus,
  };

  const go = goMap[target];
  const Icon = meta.icon;

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

function SidebarContent({
  nav, isJamaah,
}: {
  nav: { view: ViewName; label: string; icon: LucideIcon; desc: string }[];
  isJamaah: boolean;
}) {
  const {
    view, goDashboard, goJamaahList, goMonitoring, goAI, goTelemedicine,
    goJamaahDashboard, goJamaahRiwayat, goJamaahChat, goJamaahProfil,
    goStatus,
  } = useApp();

  const goMap: Partial<Record<ViewName, () => void>> = {
    dashboard: goDashboard,
    jamaah: goJamaahList,
    monitoring: goMonitoring,
    ai: goAI,
    telemedicine: () => goTelemedicine(),
    "jamaah-dashboard": goJamaahDashboard,
    "jamaah-riwayat": () => goJamaahRiwayat(),
    "jamaah-chat": goJamaahChat,
    "jamaah-profil": goJamaahProfil,
    status: goStatus,
  };

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <HeartPulse className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold leading-tight">SiHaji Care</p>
          <p className="text-xs text-sidebar-foreground/60">
            {isJamaah ? "Portal Jamaah" : "EHHR · Pra → Pasca Haji"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          {isJamaah ? "Menu Saya" : "Menu Utama"}
        </p>
        {nav.map((n) => {
          const active = view === n.view;
          const Icon = n.icon;
          const go = goMap[n.view];
          return (
            <button
              key={n.view}
              onClick={go}
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
                <p className={cn("text-xs", active ? "text-sidebar-primary-foreground/70" : "text-sidebar-foreground/50")}>
                  {n.desc}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg bg-sidebar-accent/50 p-3">
          <p className="text-xs font-semibold text-sidebar-accent-foreground">
            {isJamaah ? "Kesehatan Anda" : "Pendekatan Holistik"}
          </p>
          <p className="mt-1 text-xs text-sidebar-foreground/60">
            {isJamaah
              ? "Pantau kesehatan Anda secara mandiri"
              : "Biologis · Psikologis · Sosial · Spiritual"}
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

function UserChip({
  user, role, onSignOut, compact,
}: {
  user: User;
  role: string | null;
  onSignOut: () => void;
  compact?: boolean;
}) {
  const name =
    (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Pengguna";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onSignOut}
        className="h-9 w-9"
        title={`Keluar (${name})`}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/30 px-2.5 py-1.5">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="max-w-[140px] truncate text-xs font-medium leading-tight">{name}</p>
        <p className="text-[10px] capitalize leading-tight text-muted-foreground">
          {role ?? "pengguna"}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onSignOut}
        className="h-7 w-7 shrink-0"
        title="Keluar"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
