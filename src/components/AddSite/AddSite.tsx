import { useState, useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import { invoke } from "@tauri-apps/api/core";
import type { SiteConfig } from "../../types";
import { X } from "lucide-react";

export default function AddSite() {
  const { showAddSite, setShowAddSite, editingSite, setEditingSite, loadSites, currentSiteId } =
    useAppStore();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [group, setGroup] = useState<SiteConfig["group"]>("ai_foreign");
  const [shortcut, setShortcut] = useState("");

  useEffect(() => {
    if (editingSite) {
      setName(editingSite.name);
      setUrl(editingSite.url);
      setGroup(editingSite.group);
      setShortcut(editingSite.shortcut || "");
    } else {
      setName("");
      setUrl("");
      setGroup("ai_foreign");
      setShortcut("");
    }
  }, [editingSite, showAddSite]);

  // Hide child webviews when add/edit dialog opens, restore when closing
  useEffect(() => {
    if (showAddSite) {
      invoke("hide_all_views").catch(console.error);
    } else if (currentSiteId) {
      invoke("switch_view", { id: currentSiteId }).catch(console.error);
    }
  }, [showAddSite, currentSiteId]);

  if (!showAddSite) return null;

  const handleClose = () => {
    setShowAddSite(false);
    setEditingSite(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    const siteData: SiteConfig = {
      id: editingSite?.id || name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36),
      name: name.trim(),
      url: url.trim(),
      icon: null,
      group,
      shortcut: shortcut.trim() || null,
      enabled: true,
      order: editingSite?.order ?? 999,
      custom: editingSite?.custom ?? true,
    };

    try {
      if (editingSite) {
        // Update site config
        await invoke("update_site", {
          id: editingSite.id,
          site: siteData,
        });
        // If URL changed, navigate the webview
        if (editingSite.url !== siteData.url) {
          await invoke("navigate_view", {
            id: editingSite.id,
            url: siteData.url,
          }).catch(() => {
            // Webview may not exist yet, ignore
          });
        }
      } else {
        // Save to config
        await invoke("add_site", { site: siteData });
        // Create the child webview dynamically
        await invoke("create_view", {
          site: siteData,
          sidebarWidth: 160,
        });
      }
      await loadSites();
      handleClose();
    } catch (e) {
      console.error("Failed to save site:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative bg-gray-800 rounded-2xl shadow-2xl w-[460px] border border-gray-600/50">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {editingSite ? "编辑站点" : "添加站点"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          <div>
            <label className="block text-sm text-gray-300 mb-2 font-medium">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如: ChatGPT"
              className="w-full bg-gray-700 text-white text-sm rounded-lg px-4 py-2.5 border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2 font-medium">网址</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://chat.openai.com"
              className="w-full bg-gray-700 text-white text-sm rounded-lg px-4 py-2.5 border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2 font-medium">分组</label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as SiteConfig["group"])}
              className="w-full bg-gray-700 text-white text-sm rounded-lg px-4 py-2.5 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="ai_foreign">AI 国外</option>
              <option value="ai_domestic">AI 国内</option>
              <option value="tool">工具</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2 font-medium">
              快捷键 <span className="text-gray-500">(可选)</span>
            </label>
            <input
              type="text"
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value)}
              placeholder="如: Alt+5"
              className="w-full bg-gray-700 text-white text-sm rounded-lg px-4 py-2.5 border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!name.trim() || !url.trim()}
            >
              {editingSite ? "保存" : "添加"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
