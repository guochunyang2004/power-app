import { useState, useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { RotateCw, ExternalLink, Radio, Minus, Square, X, Maximize2 } from "lucide-react";

const appWindow = getCurrentWindow();

export default function TitleBar() {
  const { sites, currentSiteId, setShowBroadcast } = useAppStore();
  const currentSite = sites.find((s) => s.id === currentSiteId);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized).catch(console.error);
    // Listen for window state changes
    let unlisten: (() => void) | null = null;
    appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized).catch(console.error);
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  const handleMinimize = () => {
    appWindow.minimize().catch(console.error);
  };

  const handleToggleMaximize = () => {
    appWindow.toggleMaximize().catch(console.error);
  };

  const handleClose = () => {
    appWindow.close().catch(console.error);
  };

  const handleRefresh = async () => {
    if (currentSiteId) {
      try {
        await invoke("reload_view", { id: currentSiteId });
      } catch (e) {
        console.error("Failed to reload:", e);
      }
    }
  };

  const handleOpenExternal = () => {
    if (currentSite) {
      openUrl(currentSite.url).catch(console.error);
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between select-none"
    >
      {/* Left: site info */}
      <div className="flex items-center gap-2 pl-4">
        <h2 className="text-sm font-medium text-gray-200">
          {currentSite?.name || "Power App"}
        </h2>
        {currentSite && (
          <span className="text-[11px] text-gray-500 max-w-[300px] truncate">
            {currentSite.url}
          </span>
        )}
      </div>

      {/* Right: action buttons + window controls */}
      <div className="flex items-center h-full">
        <button
          onClick={() => setShowBroadcast(true)}
          className="w-11 h-full flex items-center justify-center text-gray-400 hover:text-blue-400 hover:bg-gray-700 transition-colors"
          title="广播消息"
        >
          <Radio size={14} />
        </button>
        <button
          onClick={handleRefresh}
          className="w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="刷新页面"
        >
          <RotateCw size={14} />
        </button>
        <button
          onClick={handleOpenExternal}
          className="w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="在浏览器中打开"
        >
          <ExternalLink size={14} />
        </button>
        <div className="w-px h-5 bg-gray-700" />
        <button
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="最小化"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleToggleMaximize}
          className="w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title={isMaximized ? "恢复" : "最大化"}
        >
          {isMaximized ? (
            <Maximize2 size={13} />
          ) : (
            <Square size={12} />
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 transition-colors"
          title="关闭"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
