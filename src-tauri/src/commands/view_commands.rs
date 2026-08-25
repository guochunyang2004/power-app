use crate::config::models::SiteConfig;
use crate::manager::WebviewManager;
use tauri::{Manager, State};

#[tauri::command]
pub fn switch_view(
    manager: State<'_, WebviewManager>,
    id: String,
) -> Result<(), String> {
    manager.switch_view(&id)
}

#[tauri::command]
pub fn create_view(
    manager: State<'_, WebviewManager>,
    app: tauri::AppHandle,
    site: SiteConfig,
    sidebar_width: f64,
) -> Result<(), String> {
    let title_bar_height = 40.0;
    if let Some(window) = app.get_window("main") {
        let scale = window.scale_factor().unwrap_or(1.0);
        let size = window.inner_size().unwrap();
        let logical_w = size.width as f64 / scale;
        let logical_h = size.height as f64 / scale;
        manager.create_view(
            &site,
            sidebar_width,
            title_bar_height,
            (logical_w - sidebar_width).max(0.0),
            (logical_h - title_bar_height).max(0.0),
        )
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
pub fn navigate_view(
    manager: State<'_, WebviewManager>,
    id: String,
    url: String,
) -> Result<(), String> {
    manager.navigate_view(&id, &url)
}

#[tauri::command]
pub fn reload_view(
    manager: State<'_, WebviewManager>,
    id: String,
) -> Result<(), String> {
    manager.reload_current(&id)
}

#[tauri::command]
pub fn broadcast_message(
    manager: State<'_, WebviewManager>,
    site_ids: Vec<String>,
    message: String,
) -> Result<Vec<(String, String)>, String> {
    manager.broadcast_message(&site_ids, &message)
}

#[tauri::command]
pub fn hide_all_views(
    manager: State<'_, WebviewManager>,
) -> Result<(), String> {
    manager.hide_all_views()
}

#[tauri::command]
pub async fn update_sidebar_width(
    manager: State<'_, WebviewManager>,
    app: tauri::AppHandle,
    sidebar_width: f64,
) -> Result<(), String> {
    let title_bar_height = 40.0;
    if let Some(window) = app.get_window("main") {
        let scale = window.scale_factor().unwrap_or(1.0);
        let size = window.inner_size().unwrap();
        let logical_w = size.width as f64 / scale;
        let logical_h = size.height as f64 / scale;
        manager.resize_views(
            sidebar_width,
            title_bar_height,
            (logical_w - sidebar_width).max(0.0),
            (logical_h - title_bar_height).max(0.0),
        )
    } else {
        Err("Main window not found".to_string())
    }
}
