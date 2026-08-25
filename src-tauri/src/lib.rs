mod commands;
mod config;
mod engine;
mod manager;
mod shortcuts;
mod tray;

use config::ConfigManager;
use engine::WebView2Engine;
use manager::WebviewManager;
use tauri::{Manager, WindowEvent};

const SIDEBAR_WIDTH: f64 = 160.0;
const TITLE_BAR_HEIGHT: f64 = 40.0;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let config_dir = app.path().app_config_dir().unwrap();

            // Load configuration
            let config_manager = ConfigManager::new(config_dir);

            // Create browser engine and webview manager
            let engine = WebView2Engine::new(app.handle().clone());
            let webview_manager = WebviewManager::new(Box::new(engine), config_manager);

            // Manage state
            app.manage(webview_manager);

            // Setup system tray
            tray::setup_tray(app.handle()).ok();

            // Register global shortcuts
            shortcuts::register_shortcuts(app.handle()).ok();

            // Initialize child webviews in the main window after frontend renders
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(800));
                let manager = handle.state::<WebviewManager>();
                if let Some(window) = handle.get_window("main") {
                    let scale = window.scale_factor().unwrap_or(1.0);
                    let size = window.inner_size().unwrap();
                    let logical_w = size.width as f64 / scale;
                    let logical_h = size.height as f64 / scale;
                    if let Err(e) = manager.init(
                        SIDEBAR_WIDTH,
                        TITLE_BAR_HEIGHT,
                        (logical_w - SIDEBAR_WIDTH).max(0.0),
                        (logical_h - TITLE_BAR_HEIGHT).max(0.0),
                    ) {
                        eprintln!("Failed to initialize webviews: {}", e);
                    }
                }
            });

            // Listen for window resize and close events
            let resize_handle = app.handle().clone();
            let main_window = app
                .get_window("main")
                .expect("Main window not found");
            main_window.on_window_event(move |event| match event {
                WindowEvent::Resized(_) => {
                    if let Some(window) = resize_handle.get_window("main") {
                        let scale = window.scale_factor().unwrap_or(1.0);
                        let size = window.inner_size().unwrap();
                        let logical_w = size.width as f64 / scale;
                        let logical_h = size.height as f64 / scale;
                        let manager = resize_handle.state::<WebviewManager>();
                        let _ = manager.resize_views(
                            SIDEBAR_WIDTH,
                            TITLE_BAR_HEIGHT,
                            (logical_w - SIDEBAR_WIDTH).max(0.0),
                            (logical_h - TITLE_BAR_HEIGHT).max(0.0),
                        );
                    }
                }
                WindowEvent::CloseRequested { api, .. } => {
                    // Prevent closing, hide to tray instead
                    api.prevent_close();
                    if let Some(window) = resize_handle.get_window("main") {
                        window.hide().ok();
                    }
                }
                _ => {}
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_sites,
            commands::add_site,
            commands::update_site,
            commands::delete_site,
            commands::reorder_sites,
            commands::switch_view,
            commands::create_view,
            commands::navigate_view,
            commands::reload_view,
            commands::broadcast_message,
            commands::hide_all_views,
            commands::update_sidebar_width,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
