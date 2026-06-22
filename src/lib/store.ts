import { create } from "zustand";
import type { JenisSkrining } from "./types";

export type ViewName = "dashboard" | "jamaah" | "detail" | "monitoring" | "ai";

interface AppState {
  view: ViewName;
  selectedJamaahId: string | null;
  detailTab: string;
  screeningOpen: JenisSkrining | null;
  refreshKey: number; // increment to trigger data refetch across views
  goDashboard: () => void;
  goJamaahList: () => void;
  goDetail: (id: string, tab?: string) => void;
  goMonitoring: () => void;
  goAI: () => void;
  setDetailTab: (tab: string) => void;
  openScreening: (jenis: JenisSkrining | null) => void;
  bumpRefresh: () => void;
}

export const useApp = create<AppState>((set) => ({
  view: "dashboard",
  selectedJamaahId: null,
  detailTab: "overview",
  screeningOpen: null,
  refreshKey: 0,
  goDashboard: () => set({ view: "dashboard", selectedJamaahId: null }),
  goJamaahList: () => set({ view: "jamaah", selectedJamaahId: null }),
  goDetail: (id, tab = "overview") =>
    set({ view: "detail", selectedJamaahId: id, detailTab: tab }),
  goMonitoring: () => set({ view: "monitoring" }),
  goAI: () => set({ view: "ai" }),
  setDetailTab: (tab) => set({ detailTab: tab }),
  openScreening: (jenis) => set({ screeningOpen: jenis }),
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
