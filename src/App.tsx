import { useEffect } from "react";
import { useAppStore } from "./stores/appStore";
import { initShortcuts } from "./hooks/useShortcuts";
import Sidebar from "./components/Sidebar";
import TitleBar from "./components/TitleBar";
import Settings from "./components/Settings";
import AddSite from "./components/AddSite";
import Broadcast from "./components/Broadcast";

export default function App() {
  const { loadSites, currentSiteId } = useAppStore();

  useEffect(() => {
    loadSites().then(() => {
      initShortcuts();
    });
  }, [loadSites]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Title bar */}
        <TitleBar />

        {/* Content area - webviews are positioned here by Rust backend */}
        <div className="flex-1 relative bg-gray-950 overflow-hidden">
          {/* When no site is selected, show welcome screen */}
          {!currentSiteId && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">P</span>
                </div>
                <h2 className="text-lg text-gray-400 font-medium">
                  欢迎使用 Power App
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  从左侧选择一个站点开始使用
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Settings />
      <AddSite />
      <Broadcast />
    </div>
  );
}
