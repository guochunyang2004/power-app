use crate::config::models::SiteConfig;
use crate::manager::WebviewManager;
use tauri::State;

#[tauri::command]
pub fn get_sites(manager: State<'_, WebviewManager>) -> Result<Vec<SiteConfig>, String> {
    let config = manager.config_manager().lock().unwrap();
    Ok(config.config().sites.clone())
}

#[tauri::command]
pub fn add_site(
    manager: State<'_, WebviewManager>,
    site: SiteConfig,
) -> Result<SiteConfig, String> {
    let mut config = manager.config_manager().lock().unwrap();
    config.add_site(site.clone())?;
    Ok(site)
}

#[tauri::command]
pub fn update_site(
    manager: State<'_, WebviewManager>,
    id: String,
    site: SiteConfig,
) -> Result<(), String> {
    let mut config = manager.config_manager().lock().unwrap();
    config.update_site(&id, site)
}

#[tauri::command]
pub fn delete_site(
    manager: State<'_, WebviewManager>,
    id: String,
) -> Result<String, String> {
    let mut config = manager.config_manager().lock().unwrap();
    config.delete_site(&id)?;

    // Destroy the webview for this site
    let _ = manager.destroy_view(&id);

    // Switch to first remaining enabled site
    let sites = config.config().sites.clone();
    drop(config);

    if let Some(site) = sites.iter().find(|s| s.enabled) {
        let _ = manager.switch_view(&site.id);
        Ok(site.id.clone())
    } else {
        let _ = manager.hide_all_views();
        Ok(String::new())
    }
}

#[tauri::command]
pub fn reorder_sites(
    manager: State<'_, WebviewManager>,
    ids: Vec<String>,
) -> Result<(), String> {
    let mut config = manager.config_manager().lock().unwrap();
    config.reorder_sites(ids)
}
