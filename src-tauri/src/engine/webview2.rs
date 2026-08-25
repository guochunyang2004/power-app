use std::collections::HashMap;
use std::fmt;

use tauri::{AppHandle, Manager, Webview, WebviewUrl, Rect, Position, Size, LogicalPosition, LogicalSize};
use tauri::webview::WebviewBuilder;

#[derive(Debug)]
pub enum EngineError {
    CreationFailed(String),
    ViewNotFound(String),
    NavigationFailed(String),
}

impl fmt::Display for EngineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EngineError::CreationFailed(msg) => write!(f, "Creation failed: {}", msg),
            EngineError::ViewNotFound(msg) => write!(f, "View not found: {}", msg),
            EngineError::NavigationFailed(msg) => write!(f, "Navigation failed: {}", msg),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)]
pub enum EngineType {
    WebView2,
    Chromium,
}

#[allow(dead_code)]
pub trait BrowserEngine: Send + Sync {
    fn create_view(
        &self,
        id: &str,
        url: &str,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
    ) -> Result<(), EngineError>;

    fn show_view(&self, id: &str) -> Result<(), EngineError>;

    fn navigate(&self, id: &str, url: &str) -> Result<(), EngineError>;

    fn reload(&self, id: &str) -> Result<(), EngineError>;

    fn destroy_view(&self, id: &str) -> Result<(), EngineError>;

    fn engine_type(&self) -> EngineType;

    fn resize_views(&self, x: f64, y: f64, width: f64, height: f64) -> Result<(), EngineError>;

    fn eval_js(&self, id: &str, js: &str) -> Result<String, EngineError>;

    fn hide_all_views(&self) -> Result<(), EngineError>;
}

pub struct WebView2Engine {
    app_handle: AppHandle,
    views: std::sync::Mutex<HashMap<String, Webview>>,
}

impl WebView2Engine {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            views: std::sync::Mutex::new(HashMap::new()),
        }
    }
}

impl BrowserEngine for WebView2Engine {
    fn create_view(
        &self,
        id: &str,
        url: &str,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
    ) -> Result<(), EngineError> {
        let window = self
            .app_handle
            .get_window("main")
            .ok_or_else(|| EngineError::CreationFailed("Main window not found".into()))?;

        let webview_url = WebviewUrl::External(
            url.parse().unwrap_or_else(|_| "https://www.google.com".parse().unwrap()),
        );

        let builder = WebviewBuilder::new(id, webview_url);

        let webview = window
            .add_child(
                builder,
                LogicalPosition::new(x, y),
                LogicalSize::new(width, height),
            )
            .map_err(|e| EngineError::CreationFailed(e.to_string()))?;

        // Start hidden, will be shown via show_view
        webview.hide().ok();

        let mut views = self.views.lock().unwrap();
        views.insert(id.to_string(), webview);

        Ok(())
    }

    fn show_view(&self, id: &str) -> Result<(), EngineError> {
        let views = self.views.lock().unwrap();

        // Show target view first (reduces flicker)
        let target = views.get(id);
        if let Some(view) = target {
            view.show()
                .map_err(|e| EngineError::ViewNotFound(e.to_string()))?;
        }

        // Then hide all other views
        for (vid, view) in views.iter() {
            if vid.as_str() != id {
                view.hide().ok();
            }
        }

        if target.is_some() {
            Ok(())
        } else {
            Err(EngineError::ViewNotFound(format!(
                "View '{}' not found",
                id
            )))
        }
    }

    fn navigate(&self, id: &str, url: &str) -> Result<(), EngineError> {
        let views = self.views.lock().unwrap();
        if let Some(view) = views.get(id) {
            view.eval(&format!("window.location.href = '{}'", url))
                .map_err(|e| EngineError::NavigationFailed(e.to_string()))?;
            Ok(())
        } else {
            Err(EngineError::ViewNotFound(format!(
                "View '{}' not found",
                id
            )))
        }
    }

    fn reload(&self, id: &str) -> Result<(), EngineError> {
        let views = self.views.lock().unwrap();
        if let Some(view) = views.get(id) {
            view.eval("window.location.reload()")
                .map_err(|e| EngineError::NavigationFailed(e.to_string()))?;
            Ok(())
        } else {
            Err(EngineError::ViewNotFound(format!(
                "View '{}' not found",
                id
            )))
        }
    }

    fn destroy_view(&self, id: &str) -> Result<(), EngineError> {
        let mut views = self.views.lock().unwrap();
        if let Some(webview) = views.remove(id) {
            // Hide and shrink to zero since child webview has no close() method
            webview.hide().ok();
            webview
                .set_bounds(Rect {
                    position: Position::Logical(LogicalPosition { x: 0.0, y: 0.0 }),
                    size: Size::Logical(LogicalSize {
                        width: 0.0,
                        height: 0.0,
                    }),
                })
                .ok();
        }
        Ok(())
    }

    fn engine_type(&self) -> EngineType {
        EngineType::WebView2
    }

    fn resize_views(&self, x: f64, y: f64, width: f64, height: f64) -> Result<(), EngineError> {
        let views = self.views.lock().unwrap();
        let bounds = Rect {
            position: Position::Logical(LogicalPosition { x, y }),
            size: Size::Logical(LogicalSize { width, height }),
        };
        for view in views.values() {
            view.set_bounds(bounds).ok();
        }
        Ok(())
    }

    fn eval_js(&self, id: &str, js: &str) -> Result<String, EngineError> {
        let views = self.views.lock().unwrap();
        if let Some(view) = views.get(id) {
            view.eval(js)
                .map_err(|e| EngineError::NavigationFailed(e.to_string()))?;
            Ok("ok".to_string())
        } else {
            Err(EngineError::ViewNotFound(format!(
                "View '{}' not found",
                id
            )))
        }
    }

    fn hide_all_views(&self) -> Result<(), EngineError> {
        let views = self.views.lock().unwrap();
        for view in views.values() {
            view.hide().ok();
        }
        Ok(())
    }
}
