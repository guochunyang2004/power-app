use crate::config::models::SiteConfig;
use crate::config::ConfigManager;
use crate::engine::BrowserEngine;
use std::sync::Mutex;

pub struct WebviewManager {
    engine: Box<dyn BrowserEngine>,
    config: Mutex<ConfigManager>,
}

impl WebviewManager {
    pub fn new(engine: Box<dyn BrowserEngine>, config: ConfigManager) -> Self {
        Self {
            engine,
            config: Mutex::new(config),
        }
    }

    pub fn config_manager(&self) -> &Mutex<ConfigManager> {
        &self.config
    }

    /// Initialize webviews for all enabled sites
    pub fn init(
        &self,
        content_x: f64,
        content_y: f64,
        content_width: f64,
        content_height: f64,
    ) -> Result<(), String> {
        let config = self.config.lock().unwrap();
        let sites: Vec<SiteConfig> = config.config().sites.clone();
        let default_id = config.settings().default_site_id.clone();
        drop(config);

        // Create views for all enabled sites
        for site in &sites {
            if site.enabled {
                self.engine
                    .create_view(&site.id, &site.url, content_x, content_y, content_width, content_height)
                    .map_err(|e| e.to_string())?;
            }
        }

        // Show default site
        if let Some(site) = sites.iter().find(|s| s.id == default_id && s.enabled) {
            self.engine.show_view(&site.id).map_err(|e| e.to_string())?;
        } else if let Some(site) = sites.iter().find(|s| s.enabled) {
            self.engine.show_view(&site.id).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    pub fn switch_view(&self, id: &str) -> Result<(), String> {
        self.engine.show_view(id).map_err(|e| e.to_string())
    }

    /// Create a new child webview for a site at runtime
    pub fn create_view(
        &self,
        site: &SiteConfig,
        content_x: f64,
        content_y: f64,
        content_width: f64,
        content_height: f64,
    ) -> Result<(), String> {
        self.engine
            .create_view(&site.id, &site.url, content_x, content_y, content_width, content_height)
            .map_err(|e| e.to_string())
    }

    /// Destroy a child webview (used when deleting a site)
    pub fn destroy_view(&self, id: &str) -> Result<(), String> {
        self.engine.destroy_view(id).map_err(|e| e.to_string())
    }

    /// Navigate an existing webview to a new URL
    pub fn navigate_view(&self, id: &str, url: &str) -> Result<(), String> {
        self.engine.navigate(id, url).map_err(|e| e.to_string())
    }

    #[allow(dead_code)]
    pub fn create_site_view(
        &self,
        site: &SiteConfig,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
    ) -> Result<(), String> {
        self.engine
            .create_view(&site.id, &site.url, x, y, width, height)
            .map_err(|e| e.to_string())?;
        self.engine.show_view(&site.id).map_err(|e| e.to_string())
    }

    pub fn reload_current(&self, id: &str) -> Result<(), String> {
        self.engine.reload(id).map_err(|e| e.to_string())
    }

    pub fn resize_views(
        &self,
        x: f64,
        y: f64,
        width: f64,
        height: f64,
    ) -> Result<(), String> {
        self.engine
            .resize_views(x, y, width, height)
            .map_err(|e| e.to_string())
    }

    /// Broadcast a message to multiple sites by injecting JS
    pub fn broadcast_message(&self, site_ids: &[String], message: &str) -> Result<Vec<(String, String)>, String> {
        let js = build_broadcast_js(message);
        let mut results = Vec::new();
        for id in site_ids {
            match self.engine.eval_js(id, &js) {
                Ok(result) => results.push((id.clone(), result)),
                Err(e) => results.push((id.clone(), format!("error: {}", e))),
            }
        }
        Ok(results)
    }

    /// Hide all child webviews (so HTML modals can be seen)
    pub fn hide_all_views(&self) -> Result<(), String> {
        self.engine.hide_all_views().map_err(|e| e.to_string())
    }
}

/// Build JavaScript code to inject a message into an AI chat interface
fn build_broadcast_js(message: &str) -> String {
    let escaped = message
        .replace('\\', "\\\\")
        .replace('`', "\\`")
        .replace('$', "\\$");
    format!(
        r#"(function() {{
  var msg = `{escaped}`;

  // Strategy 1: textarea
  var input = document.querySelector('textarea');
  if (input) {{
    input.focus();
    // Use native setter to bypass React/Vue controlled input
    var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeSetter.call(input, msg);
    input.dispatchEvent(new Event('input', {{ bubbles: true }}));
    // Try to find send button
    var sendBtn = document.querySelector(
      '[data-testid="send-button"], ' +
      'button[type="submit"], ' +
      'button[aria-label*="end"], ' +
      'button[aria-label*="Send"], ' +
      'button[aria-label*="发送"]'
    );
    if (sendBtn && !sendBtn.disabled) {{
      setTimeout(function() {{ sendBtn.click(); }}, 100);
      return 'sent:button';
    }}
    // Fallback: Enter key
    setTimeout(function() {{
      input.dispatchEvent(new KeyboardEvent('keydown', {{ key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }}));
    }}, 100);
    return 'sent:enter';
  }}

  // Strategy 2: contenteditable div
  var ce = document.querySelector('[contenteditable="true"]');
  if (ce) {{
    ce.focus();
    ce.textContent = msg;
    ce.dispatchEvent(new Event('input', {{ bubbles: true }}));
    var sendBtn = document.querySelector(
      'button[type="submit"], ' +
      'button[aria-label*="end"], ' +
      'button[aria-label*="Send"], ' +
      'button[aria-label*="发送"]'
    );
    if (sendBtn && !sendBtn.disabled) {{
      setTimeout(function() {{ sendBtn.click(); }}, 100);
      return 'sent:button';
    }}
    setTimeout(function() {{
      ce.dispatchEvent(new KeyboardEvent('keydown', {{ key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }}));
    }}, 100);
    return 'sent:enter';
  }}

  return 'error:no_input_found';
}})()"#
    )
}
