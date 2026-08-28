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
    // JSON encoding keeps newlines, quotes and backslashes valid in the injected script.
    let escaped = serde_json::to_string(message).unwrap_or_else(|_| "\"\"".to_string());
    format!(
        r#"(function() {{
  var msg = {escaped};
  var visible = function(el) {{
    var style = window.getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      rect.width > 0 && rect.height > 0 && !el.disabled;
  }};
  var dispatchInput = function(el) {{
    try {{
      el.dispatchEvent(new InputEvent('beforeinput', {{ bubbles: true, composed: true,
        inputType: 'insertText', data: msg }}));
    }} catch (_) {{}}
    el.dispatchEvent(new Event('input', {{ bubbles: true, composed: true }}));
    el.dispatchEvent(new Event('change', {{ bubbles: true, composed: true }}));
  }};
  var buttonVisible = function(el) {{
    var style = window.getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      rect.width > 0 && rect.height > 0;
  }};
  var buttonEnabled = function(el) {{
    var cls = (el.className || '').toString().toLowerCase();
    return buttonVisible(el) && !el.disabled &&
      el.getAttribute('aria-disabled') !== 'true' && !/disabled/.test(cls);
  }};
  var send = function(el) {{
    var findButton = function() {{
      var buttons = Array.prototype.slice.call(document.querySelectorAll(
        'button, [role="button"], input[type="submit"], ' +
        '[data-testid*="send"], [data-testid*="Send"], ' +
        '[class*="send"], [class*="Send"]'
      ));
      var inputRect = el.getBoundingClientRect();
      var scored = buttons.map(function(button) {{
        var label = ((button.getAttribute('aria-label') || '') + ' ' +
          (button.getAttribute('title') || '') + ' ' + (button.textContent || '') + ' ' +
          (button.getAttribute('data-testid') || '') + ' ' + (button.className || '')).toLowerCase();
        var rect = button.getBoundingClientRect();
        var distance = Math.abs(rect.left - inputRect.right) + Math.abs(rect.top - inputRect.bottom);
        var score = distance;
        if (button.type === 'submit') score -= 1000;
        if (/send|发送|提交|arrow-up|paper-plane/.test(label)) score -= 500;
        return {{ button: button, score: score }};
      }}).filter(function(item) {{ return buttonEnabled(item.button); }});
      scored.sort(function(a, b) {{ return a.score - b.score; }});
      return scored.length ? scored[0].button : null;
    }};
    var attempts = 0;
    var trySend = function() {{
      var button = findButton();
      if (button) {{
        button.click();
        return;
      }}
      if (++attempts < 8) setTimeout(trySend, 150);
      else {{
        el.dispatchEvent(new KeyboardEvent('keydown', {{ key: 'Enter', code: 'Enter',
          keyCode: 13, which: 13, bubbles: true, composed: true }}));
        el.dispatchEvent(new KeyboardEvent('keyup', {{ key: 'Enter', code: 'Enter',
          keyCode: 13, which: 13, bubbles: true, composed: true }}));
      }}
    }};
    // Tongyi enables its icon-only send button after the editor state commits.
    setTimeout(trySend, 250);
    return 'queued';
  }};

  // Kimi uses a textarea/contenteditable editor that can be hidden during layout.
  var candidates = Array.prototype.slice.call(document.querySelectorAll(
    'textarea, [contenteditable="true"], [role="textbox"]'
  )).filter(visible);
  var input = candidates.find(function(el) {{
    return el.matches('textarea') || el.getAttribute('contenteditable') === 'true';
  }}) || candidates[0];
  if (!input) return 'error:no_input_found';

  input.focus();
  if (input.matches('textarea, input')) {{
    var proto = input.matches('textarea') ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    var descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor && descriptor.set) descriptor.set.call(input, msg);
    else input.value = msg;
  }} else {{
    // Use the browser editing command so ProseMirror/Slate receives a real edit.
    input.focus();
    var inserted = false;
    try {{ inserted = document.execCommand('insertText', false, msg); }} catch (_) {{}}
    if (!inserted) {{
      input.innerHTML = '';
      input.appendChild(document.createTextNode(msg));
    }}
  }}
  dispatchInput(input);
  return send(input);
}})()"#
    )
}
