import { useState, useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import { invoke } from "@tauri-apps/api/core";
import type { SiteConfig, AppSettings } from "../../types";
import {
  X,
  Trash2,
  Edit2,
  GripVertical,
} from "lucide-react";

export default function Settings() {
  const {
    sites,
    settings,
    currentSiteId,
    showSettings,
    setShowSettings,
    setEditingSite,
    setShowAddSite,
    loadSites,
    updateSettings: setStoreSettings,
  } = useAppStore();

  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Hide child webviews when settings opens, restore when closing
  useEffect(() => {
    if (showSettings) {
      invoke("hide_all_views").catch(console.error);
    } else if (currentSiteId) {
      invoke("switch_view", { id: currentSiteId }).catch(console.error);
    }
  }, [showSettings, currentSiteId]);

  if (!showSettings) return null;

  const handleDeleteSite = async (id: string) => {
    if (!confirm("确定删除此站点？")) return;
    try {
      const newCurrentId = await invoke<string>("delete_site", { id });
      await loadSites();
      if (newCurrentId) {
        useAppStore.getState().setCurrentSite(newCurrentId);
      }
    } catch (e) {
      console.error("Failed to delete site:", e);
    }
  };

  const handleEditSite = (site: SiteConfig) => {
    setEditingSite(site);
    setShowAddSite(true);
  };

  const handleSaveSettings = async () => {
    try {
      // Save settings through the update_site command for each changed setting
      // For MVP, we just update the local store
      setStoreSettings(localSettings);
      setShowSettings(false);
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setShowSettings(false)}
      />

      {/* Dialog */}
      <div className="relative bg-gray-800 rounded-2xl shadow-2xl w-[620px] max-h-[85vh] flex flex-col border border-gray-600/50">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">设置</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          {/* General settings */}
          <section>
            <h3 className="text-sm font-semibold text-gray-200 mb-4">常规设置</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">主题</label>
                <select
                  value={localSettings.theme}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      theme: e.target.value as AppSettings["theme"],
                    })
                  }
                  className="bg-gray-700 text-white text-sm rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="system">跟随系统</option>
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">启动时最小化到托盘</label>
                <input
                  type="checkbox"
                  checked={localSettings.start_minimized}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      start_minimized: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded accent-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">懒加载页面</label>
                <input
                  type="checkbox"
                  checked={localSettings.lazy_load}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      lazy_load: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded accent-blue-500"
                />
              </div>
            </div>
          </section>

          {/* Sites list */}
          <section>
            <h3 className="text-sm font-semibold text-gray-200 mb-4">
              站点管理 ({sites.length})
            </h3>
            <div className="space-y-2">
              {sites
                .sort((a, b) => a.order - b.order)
                .map((site) => (
                  <div
                    key={site.id}
                    className="flex items-center gap-3 px-4 py-3 bg-gray-700/50 rounded-lg group"
                  >
                    <GripVertical
                      size={14}
                      className="text-gray-500 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {site.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {site.url}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                      {site.shortcut || "-"}
                    </span>
                    <span className="text-[11px] text-gray-400 px-2 py-0.5 bg-gray-600/50 rounded flex-shrink-0">
                      {site.group}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditSite(site)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 rounded hover:bg-gray-600 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteSite(site.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-gray-600 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 px-8 py-5 flex justify-end gap-3">
          <button
            onClick={() => setShowSettings(false)}
            className="px-5 py-2.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-5 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
