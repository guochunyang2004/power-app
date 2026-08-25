import { useMemo, useState, useCallback, useRef } from "react";
import { useAppStore } from "../../stores/appStore";
import { invoke } from "@tauri-apps/api/core";
import type { SiteConfig } from "../../types";
import {
  Plus,
  Settings,
  Bot,
  Wrench,
  Globe,
  Edit2,
  Trash2,
} from "lucide-react";

const MIN_WIDTH = 160;
const MAX_WIDTH = 400;

interface SiteGroup {
  group: string;
  label: string;
  icon: React.ReactNode;
  sites: SiteConfig[];
}

const GROUP_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  ai_foreign: { label: "AI 国外", icon: <Bot size={14} /> },
  ai_domestic: { label: "AI 国内", icon: <Bot size={14} /> },
  tool: { label: "工具", icon: <Wrench size={14} /> },
  other: { label: "其他", icon: <Globe size={14} /> },
};

export default function Sidebar() {
  const {
    sites,
    currentSiteId,
    setCurrentSite,
    setShowAddSite,
    setShowSettings,
    setEditingSite,
    loadSites,
  } = useAppStore();

  const [width, setWidth] = useState(MIN_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const currentWidth = useRef(MIN_WIDTH);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    currentWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      currentWidth.current = newWidth;
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Notify backend to resize child webviews with the latest width
      invoke("update_sidebar_width", { sidebarWidth: currentWidth.current }).catch(console.error);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width]);

  const groups = useMemo<SiteGroup[]>(() => {
    const grouped: Record<string, SiteConfig[]> = {};
    for (const site of sites) {
      if (!site.enabled) continue;
      const group = site.group;
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(site);
    }

    const order = ["ai_domestic", "ai_foreign", "tool", "other"];
    return order
      .filter((g) => grouped[g] && grouped[g].length > 0)
      .map((g) => ({
        group: g,
        label: GROUP_CONFIG[g]?.label || g,
        icon: GROUP_CONFIG[g]?.icon || <Globe size={14} />,
        sites: grouped[g].sort((a, b) => a.order - b.order),
      }));
  }, [sites]);

  const handleSwitch = async (siteId: string) => {
    setCurrentSite(siteId);
    try {
      await invoke("switch_view", { id: siteId });
    } catch (e) {
      console.error("Failed to switch view:", e);
    }
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getFaviconUrl = (url: string) => {
    try {
      const u = new URL(url);
      return `${u.origin}/favicon.ico`;
    } catch {
      return null;
    }
  };

  const handleEdit = (site: SiteConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSite(site);
    setShowAddSite(true);
  };

  const handleDelete = async (siteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Hide child webviews first so confirm dialog is not blocked
    await invoke("hide_all_views").catch(() => {});
    const confirmed = confirm("确定删除此站点？");
    if (!confirmed) {
      // Restore current view if cancelled
      if (currentSiteId) {
        await invoke("switch_view", { id: currentSiteId }).catch(() => {});
      }
      return;
    }
    try {
      const newCurrentId = await invoke<string>("delete_site", { id: siteId });
      await loadSites();
      if (newCurrentId) {
        setCurrentSite(newCurrentId);
      }
    } catch (err) {
      console.error("Failed to delete site:", err);
    }
  };

  return (
    <div
      className="h-screen bg-gray-900 flex flex-col border-r border-gray-700 select-none relative"
      style={{ width: `${width}px`, minWidth: `${MIN_WIDTH}px`, maxWidth: `${MAX_WIDTH}px` }}
    >
      {/* Logo */}
      <div data-tauri-drag-region className="h-10 flex items-center px-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">P</span>
          </div>
          <span className="text-white font-semibold text-sm truncate">Power App</span>
        </div>
      </div>

      {/* Site groups */}
      <div className="flex-1 overflow-y-auto py-2">
        {groups.map((group) => (
          <div key={group.group} className="mb-2">
            <div className="px-4 py-1.5 text-[11px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              {group.icon}
              {group.label}
            </div>
            {group.sites.map((site) => (
              <SiteItem
                key={site.id}
                site={site}
                isActive={site.id === currentSiteId}
                onClick={() => handleSwitch(site.id)}
                onEdit={(e) => handleEdit(site, e)}
                onDelete={(e) => handleDelete(site.id, e)}
                getInitial={getInitial}
                getFaviconUrl={getFaviconUrl}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-gray-700 p-2 flex gap-1">
        <button
          onClick={() => setShowAddSite(true)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Plus size={14} />
          添加
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center justify-center px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Drag handle for resizing */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500/70 transition-colors z-10"
      />
    </div>
  );
}

interface SiteItemProps {
  site: SiteConfig;
  isActive: boolean;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  getInitial: (name: string) => string;
  getFaviconUrl: (url: string) => string | null;
}

function SiteItem({ site, isActive, onClick, onEdit, onDelete, getInitial, getFaviconUrl }: SiteItemProps) {
  const faviconUrl = getFaviconUrl(site.url);

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2.5 px-4 py-2 mx-2 rounded-lg cursor-pointer transition-all ${
        isActive
          ? "bg-blue-600/20 text-blue-400 border-l-2 border-blue-400"
          : "text-gray-300 hover:bg-gray-800 hover:text-white"
      }`}
    >
      <div
        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium flex-shrink-0 ${
          isActive ? "bg-blue-500/30 text-blue-300" : "bg-gray-700 text-gray-300"
        }`}
      >
        {site.icon ? (
          <img
            src={site.icon}
            alt={site.name}
            className="w-4 h-4 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : faviconUrl ? (
          <>
            <img
              src={faviconUrl}
              alt={site.name}
              className="w-4 h-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="hidden">{getInitial(site.name)}</span>
          </>
        ) : (
          getInitial(site.name)
        )}
      </div>
      <span className="text-sm truncate flex-1">{site.name}</span>
      {/* Action buttons - visible on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1 text-gray-500 hover:text-blue-400 rounded transition-colors"
          title="编辑"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
          title="删除"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {site.shortcut && (
        <span className="text-[10px] text-gray-500 font-mono flex-shrink-0 group-hover:hidden">
          {site.shortcut}
        </span>
      )}
    </div>
  );
}
