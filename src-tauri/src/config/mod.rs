pub mod models;

use self::models::{AppConfig, SiteConfig};
use std::fs;
use std::path::PathBuf;

pub struct ConfigManager {
    config_path: PathBuf,
    config: AppConfig,
}

impl ConfigManager {
    pub fn new(config_dir: PathBuf) -> Self {
        let config_path = config_dir.join("config.json");

        // Ensure config directory exists
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent).ok();
        }

        let config = if config_path.exists() {
            match fs::read_to_string(&config_path) {
                Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
                Err(_) => AppConfig::default(),
            }
        } else {
            AppConfig::default()
        };

        let manager = Self {
            config_path,
            config,
        };
        // Save default config if it didn't exist
        if !manager.config_path.exists() {
            manager.save().ok();
        }
        manager
    }

    pub fn config(&self) -> &AppConfig {
        &self.config
    }

    pub fn settings(&self) -> &models::AppSettings {
        &self.config.settings
    }

    pub fn add_site(&mut self, site: SiteConfig) -> Result<(), String> {
        self.config.sites.push(site);
        self.save()
    }

    pub fn update_site(&mut self, id: &str, updates: SiteConfig) -> Result<(), String> {
        if let Some(site) = self.config.sites.iter_mut().find(|s| s.id == id) {
            *site = updates;
            self.save()
        } else {
            Err(format!("Site with id '{}' not found", id))
        }
    }

    pub fn delete_site(&mut self, id: &str) -> Result<(), String> {
        self.config.sites.retain(|s| s.id != id);
        self.save()
    }

    pub fn reorder_sites(&mut self, ids: Vec<String>) -> Result<(), String> {
        for (index, id) in ids.iter().enumerate() {
            if let Some(site) = self.config.sites.iter_mut().find(|s| s.id == *id) {
                site.order = index as u32;
            }
        }
        self.config.sites.sort_by_key(|s| s.order);
        self.save()
    }

    #[allow(dead_code)]
    pub fn update_settings(
        &mut self,
        settings: models::AppSettings,
    ) -> Result<(), String> {
        self.config.settings = settings;
        self.save()
    }

    fn save(&self) -> Result<(), String> {
        let json = serde_json::to_string_pretty(&self.config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        fs::write(&self.config_path, json).map_err(|e| format!("Failed to write config: {}", e))
    }
}
