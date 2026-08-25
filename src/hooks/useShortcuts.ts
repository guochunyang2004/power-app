import { register } from "@tauri-apps/plugin-global-shortcut";
import { useAppStore } from "../stores/appStore";
import { invoke } from "@tauri-apps/api/core";

export async function initShortcuts() {
  const store = useAppStore.getState();

  for (const site of store.sites) {
    if (site.shortcut && site.enabled) {
      try {
        await register(site.shortcut, (event: { state: string }) => {
          if (event.state === "Pressed") {
            useAppStore.getState().setCurrentSite(site.id);
            invoke("switch_view", { id: site.id }).catch(console.error);
          }
        });
      } catch (e) {
        console.error(`Failed to register shortcut ${site.shortcut}:`, e);
      }
    }
  }
}
