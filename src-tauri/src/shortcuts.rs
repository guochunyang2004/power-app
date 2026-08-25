use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::manager::WebviewManager;

/// Register global shortcuts for site switching
pub fn register_shortcuts(app: &AppHandle) -> Result<(), String> {
    let manager = app.state::<WebviewManager>();
    let config = manager.config_manager().lock().unwrap();
    let sites = config.config().sites.clone();
    drop(config);

    for site in &sites {
        if let Some(ref shortcut) = site.shortcut {
            if site.enabled {
                let site_id = site.id.clone();
                let app_handle = app.clone();
                let shortcut_str = shortcut.clone();

                app.global_shortcut()
                    .on_shortcut(shortcut_str.as_str(), move |_app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            let manager = app_handle.state::<WebviewManager>();
                            let _ = manager.switch_view(&site_id);
                        }
                    })
                    .map_err(|e| format!("Failed to register shortcut '{}': {}", shortcut, e))?;
            }
        }
    }

    // Register Ctrl+Tab / Ctrl+Shift+Tab for cycling
    // (These require more complex state tracking, omitted for MVP)

    Ok(())
}
