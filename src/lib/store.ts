import { create } from "zustand";
import type { JenisSkrining } from "./types";

// ===== Doctor views =====
// ===== Jamaah views (prefixed with jamaah-) =====
export type ViewName =
  | "dashboard"        // doctor dashboard
  | "jamaah"           // doctor: jamaah list
  | "detail"           // doctor: jamaah detail (EHHR)
  | "monitoring"       // doctor: monitoring schedule
  | "ai"               // doctor: AI analysis
  | "telemedicine"     // doctor: telemedicine chat list
  // Jamaah views
  | "jamaah-dashboard" // jamaah: simplified dashboard
  | "jamaah-riwayat"   // jamaah: riwayat kesehatan (read-only)
  | "jamaah-chat"      // jamaah: telemedicine chat with assigned doctor
  | "jamaah-profil";   // jamaah: profil saya

// Tab utama halaman Detail Jamaah (EHHR)
export type DetailMainTab = "profil" | "pra-haji" | "pasca-haji" | "riwayat";

interface AppState {
  view: ViewName;
  selectedJamaahId: string | null;
  telemedicineJamaahId: string | null;
  detailTab: DetailMainTab;
  pascaTab: string;
  screeningOpen: JenisSkrining | null;
  refreshKey: number;
  // Doctor navigation
  goDashboard: () => void;
  goJamaahList: () => void;
  goDetail: (id: string, tab?: DetailMainTab) => void;
  goMonitoring: () => void;
  goAI: () => void;
  goTelemedicine: (jamaahId?: string) => void;
  // Jamaah navigation
  goJamaahDashboard: () => void;
  goJamaahRiwayat: (tab?: string) => void;
  goJamaahChat: () => void;
  goJamaahProfil: () => void;
  // Shared
  setDetailTab: (tab: DetailMainTab) => void;
  setPascaTab: (tab: string) => void;
  openScreening: (jenis: JenisSkrining | null) => void;
  bumpRefresh: () => void;
}

export const useApp = create<AppState>((set) => ({
  view: "dashboard",
  selectedJamaahId: null,
  telemedicineJamaahId: null,
  detailTab: "profil",
  pascaTab: "ringkasan",
  screeningOpen: null,
  refreshKey: 0,
  // Doctor
  goDashboard: () => set({ view: "dashboard", selectedJamaahId: null }),
  goJamaahList: () => set({ view: "jamaah", selectedJamaahId: null }),
  goDetail: (id, tab = "profil") =>
    set({ view: "detail", selectedJamaahId: id, detailTab: tab }),
  goMonitoring: () => set({ view: "monitoring" }),
  goAI: () => set({ view: "ai" }),
  goTelemedicine: (jamaahId) =>
    set({ view: "telemedicine", telemedicineJamaahId: jamaahId ?? null }),
  // Jamaah
  goJamaahDashboard: () => set({ view: "jamaah-dashboard" }),
  goJamaahRiwayat: (tab) => set({ view: "jamaah-riwayat", pascaTab: tab ?? "ringkasan" }),
  goJamaahChat: () => set({ view: "jamaah-chat" }),
  goJamaahProfil: () => set({ view: "jamaah-profil" }),
  // Shared
  setDetailTab: (tab) => set({ detailTab: tab }),
  setPascaTab: (tab) => set({ pascaTab: tab }),
  openScreening: (jenis) => set({ screeningOpen: jenis }),
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
