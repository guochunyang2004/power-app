import { useState, useMemo, useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import { invoke } from "@tauri-apps/api/core";
import type { SiteConfig } from "../../types";
import { X, Send, CheckSquare, Square } from "lucide-react";

interface BroadcastResult {
  siteId: string;
  siteName: string;
  result: string;
}

export default function Broadcast() {
  const { sites, currentSiteId, showBroadcast, setShowBroadcast } = useAppStore();

  const aiSites = useMemo(
    () => sites.filter((s) => s.enabled && (s.group === "ai_domestic" || s.group === "ai_foreign")),
    [sites]
  );

  const domesticSites = useMemo(() => aiSites.filter((s) => s.group === "ai_domestic"), [aiSites]);
  const foreignSites = useMemo(() => aiSites.filter((s) => s.group === "ai_foreign"), [aiSites]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<BroadcastResult[]>([]);

  // When broadcast opens, hide all child webviews so the modal is visible
  useEffect(() => {
    if (showBroadcast) {
      invoke("hide_all_views").catch(console.error);
    } else if (currentSiteId) {
      // Restore current view when closing
      invoke("switch_view", { id: currentSiteId }).catch(console.error);
    }
  }, [showBroadcast, currentSiteId]);

  const toggleSite = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectPreset = (preset: "domestic" | "foreign" | "all") => {
    switch (preset) {
      case "domestic":
        setSelectedIds(new Set(domesticSites.map((s) => s.id)));
        break;
      case "foreign":
        setSelectedIds(new Set(foreignSites.map((s) => s.id)));
        break;
      case "all":
        setSelectedIds(new Set(aiSites.map((s) => s.id)));
        break;
    }
  };

  const selectNone = () => setSelectedIds(new Set());

  const handleSend = async () => {
    if (!message.trim() || selectedIds.size === 0) return;
    setSending(true);
    setResults([]);

    try {
      const res = await invoke<[string, string][]>("broadcast_message", {
        siteIds: Array.from(selectedIds),
        message: message.trim(),
      });

      const siteMap = new Map(sites.map((s) => [s.id, s.name]));
      const broadcastResults: BroadcastResult[] = res.map(([siteId, result]) => ({
        siteId,
        siteName: siteMap.get(siteId) || siteId,
        result,
      }));
      setResults(broadcastResults);

      // Clear message after successful send
      if (broadcastResults.every((r) => !r.result.startsWith("error"))) {
        setMessage("");
      }
    } catch (e) {
      console.error("Broadcast failed:", e);
      setResults([{ siteId: "", siteName: "系统", result: `error: ${e}` }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!showBroadcast) return null;

  const selectedCount = selectedIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowBroadcast(false)}>
      <div
        className="bg-gray-800 rounded-2xl shadow-2xl w-[620px] max-h-[85vh] flex flex-col border border-gray-600/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/30 rounded-lg flex items-center justify-center">
              <Send size={16} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">广播消息</h2>
          </div>
          <button
            onClick={() => setShowBroadcast(false)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-7">
          {/* Presets */}
          <div>
            <div className="text-sm text-gray-300 mb-3 font-semibold">快速选择</div>
            <div className="flex gap-3">
              <PresetButton label="全部国内" onClick={() => selectPreset("domestic")} count={domesticSites.length} />
              <PresetButton label="全部国外" onClick={() => selectPreset("foreign")} count={foreignSites.length} />
              <PresetButton label="全部" onClick={() => selectPreset("all")} count={aiSites.length} />
              <button
                onClick={selectNone}
                className="px-5 py-2.5 text-sm text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
              >
                清除
              </button>
            </div>
          </div>

          {/* Site selection */}
          <div>
            <div className="text-sm text-gray-300 mb-4 font-semibold">
              已选择 <span className="text-blue-400 font-semibold">{selectedCount}</span> 个模型
            </div>

            {domesticSites.length > 0 && (
              <SiteGroup
                label="AI 国内"
                sites={domesticSites}
                selectedIds={selectedIds}
                onToggle={toggleSite}
              />
            )}

            {foreignSites.length > 0 && (
              <SiteGroup
                label="AI 国外"
                sites={foreignSites}
                selectedIds={selectedIds}
                onToggle={toggleSite}
              />
            )}
          </div>

          {/* Message input */}
          <div>
            <div className="text-sm text-gray-300 mb-3 font-semibold">消息内容</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入要发送的消息... (Ctrl+Enter 发送)"
              className="w-full h-36 bg-gray-900 text-gray-100 text-base rounded-xl px-5 py-4 border border-gray-600 focus:border-blue-500 focus:outline-none resize-none placeholder-gray-500 leading-relaxed"
              disabled={sending}
            />
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div>
              <div className="text-sm text-gray-300 mb-3 font-semibold">发送结果</div>
              <div className="space-y-2.5">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 text-sm px-5 py-3 rounded-lg ${
                      r.result.startsWith("error")
                        ? "bg-red-900/30 text-red-300"
                        : "bg-green-900/30 text-green-300"
                    }`}
                  >
                    <span className="font-medium">{r.siteName}</span>
                    <span className="text-gray-500">—</span>
                    <span>{r.result.startsWith("error") ? r.result : "发送成功"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {selectedCount === 0 ? "请选择至少一个模型" : `${selectedCount} 个模型待发送`}
          </span>
          <button
            onClick={handleSend}
            disabled={sending || selectedCount === 0 || !message.trim()}
            className="flex items-center gap-2.5 px-6 py-2.5 bg-blue-600 text-white text-base font-medium rounded-xl hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
            {sending ? "发送中..." : "发送广播"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PresetButton({ label, onClick, count }: { label: string; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 text-sm text-blue-400 border border-blue-500/40 rounded-lg hover:bg-blue-500/20 hover:text-blue-300 transition-colors font-medium"
    >
      {label} ({count})
    </button>
  );
}

function SiteGroup({
  label,
  sites,
  selectedIds,
  onToggle,
}: {
  label: string;
  sites: SiteConfig[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mb-4">
      <div className="text-sm text-gray-400 mb-2.5 font-medium">{label}</div>
      <div className="flex flex-wrap gap-2.5">
        {sites.map((site) => {
          const isSelected = selectedIds.has(site.id);
          return (
            <button
              key={site.id}
              onClick={() => onToggle(site.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border transition-colors ${
                isSelected
                  ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                  : "bg-gray-900 border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white"
              }`}
            >
              {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
              {site.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
