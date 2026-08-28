import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { SiteConfig, AppSettings } from "../types";

interface AppStore {
  sites: SiteConfig[];
  currentSiteId: string;
  settings: AppSettings;
  showSettings: boolean;
  showAddSite: boolean;
  showBroadcast: boolean;
  editingSite: SiteConfig | null;

  setSites: (sites: SiteConfig[]) => void;
  setCurrentSite: (id: string) => void;
  setShowSettings: (show: boolean) => void;
  setShowAddSite: (show: boolean) => void;
  setShowBroadcast: (show: boolean) => void;
  setEditingSite: (site: SiteConfig | null) => void;
  updateSettings: (settings: AppSettings) => void;
  loadSites: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  sites: [],
  currentSiteId: "",
  settings: {
    theme: "system",
    sidebar_width: 240,
    start_minimized: false,
    lazy_load: true,
    default_site_id: "chatgpt",
  },
  showSettings: false,
  showAddSite: false,
  showBroadcast: false,
  editingSite: null,

  setSites: (sites) => set({ sites }),
  setCurrentSite: (id) => set({ currentSiteId: id }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowAddSite: (show) => set({ showAddSite: show }),
  setShowBroadcast: (show) => set({ showBroadcast: show }),
  setEditingSite: (site) => set({ editingSite: site }),
  updateSettings: (settings) => set({ settings }),

  loadSites: async () => {
    try {
      const sites = await invoke<SiteConfig[]>("get_sites");
      const sorted = sites.sort((a, b) => a.order - b.order);
      set({ sites: sorted });
      // Keep the current site valid across all built-in and custom categories.
      const { currentSiteId } = get();
      const stillValid = sorted.some(
        (s) => s.id === currentSiteId && s.enabled
      );
      if (stillValid) return;
      const firstEnabled = sorted.find((s) => s.enabled);
      if (firstEnabled) {
        set({ currentSiteId: firstEnabled.id });
        await invoke("switch_view", { id: firstEnabled.id }).catch(() => {});
      } else {
        set({ currentSiteId: "" });
        await invoke("hide_all_views").catch(() => {});
      }
    } catch (e) {
      console.error("Failed to load sites:", e);
    }
  },
}));
