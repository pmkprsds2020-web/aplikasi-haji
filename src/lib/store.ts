import { create } from "zustand";
import type { JenisSkrining } from "./types";

export type ViewName = "dashboard" | "jamaah" | "detail" | "monitoring" | "ai" | "telemedicine";

// Tab utama halaman Detail Jamaah (EHHR)
export type DetailMainTab = "profil" | "pra-haji" | "pasca-haji" | "riwayat";

interface AppState {
  view: ViewName;
  selectedJamaahId: string | null;
  telemedicineJamaahId: string | null; // jamaah yang dipilih saat masuk telemedicine
  detailTab: DetailMainTab;
  pascaTab: string;
  screeningOpen: JenisSkrining | null;
  refreshKey: number;
  goDashboard: () => void;
  goJamaahList: () => void;
  goDetail: (id: string, tab?: DetailMainTab) => void;
  goMonitoring: () => void;
  goAI: () => void;
  goTelemedicine: (jamaahId?: string) => void;
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
  pascaTab: "overview",
  screeningOpen: null,
  refreshKey: 0,
  goDashboard: () => set({ view: "dashboard", selectedJamaahId: null }),
  goJamaahList: () => set({ view: "jamaah", selectedJamaahId: null }),
  goDetail: (id, tab = "profil") =>
    set({ view: "detail", selectedJamaahId: id, detailTab: tab }),
  goMonitoring: () => set({ view: "monitoring" }),
  goAI: () => set({ view: "ai" }),
  goTelemedicine: (jamaahId) =>
    set({ view: "telemedicine", telemedicineJamaahId: jamaahId ?? null }),
  setDetailTab: (tab) => set({ detailTab: tab }),
  setPascaTab: (tab) => set({ pascaTab: tab }),
  openScreening: (jenis) => set({ screeningOpen: jenis }),
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
