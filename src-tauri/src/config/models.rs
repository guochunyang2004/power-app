use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SiteConfig {
    pub id: String,
    pub name: String,
    pub url: String,
    pub icon: Option<String>,
    pub group: SiteGroup,
    pub shortcut: Option<String>,
    pub enabled: bool,
    pub order: u32,
    /// Whether this site was added by the user (custom sites are shown in the
    /// sidebar and can be edited/deleted; built-in presets are hidden there).
    #[serde(default)]
    pub custom: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SiteGroup {
    AiForeign,
    AiDomestic,
    Tool,
    Other,
}

impl std::fmt::Display for SiteGroup {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SiteGroup::AiForeign => write!(f, "AI 国外"),
            SiteGroup::AiDomestic => write!(f, "AI 国内"),
            SiteGroup::Tool => write!(f, "工具"),
            SiteGroup::Other => write!(f, "其他"),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub sites: Vec<SiteConfig>,
    pub settings: AppSettings,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            sites: vec![
                // AI 国内
                SiteConfig {
                    id: "deepseek".to_string(),
                    name: "DeepSeek".to_string(),
                    url: "https://chat.deepseek.com".to_string(),
                    icon: None,
                    group: SiteGroup::AiDomestic,
                    shortcut: Some("Alt+1".to_string()),
                    enabled: true,
                    order: 0,
                    custom: false,
                },
                SiteConfig {
                    id: "kimi".to_string(),
                    name: "Kimi".to_string(),
                    url: "https://kimi.moonshot.cn".to_string(),
                    icon: None,
                    group: SiteGroup::AiDomestic,
                    shortcut: Some("Alt+2".to_string()),
                    enabled: true,
                    order: 1,
                    custom: false,
                },
                SiteConfig {
                    id: "doubao".to_string(),
                    name: "豆包".to_string(),
                    url: "https://www.doubao.com".to_string(),
                    icon: None,
                    group: SiteGroup::AiDomestic,
                    shortcut: Some("Alt+3".to_string()),
                    enabled: true,
                    order: 2,
                    custom: false,
                },
                SiteConfig {
                    id: "tongyi".to_string(),
                    name: "通义千问".to_string(),
                    url: "https://www.qianwen.com/".to_string(),
                    icon: None,
                    group: SiteGroup::AiDomestic,
                    shortcut: Some("Alt+4".to_string()),
                    enabled: true,
                    order: 3,
                    custom: false,
                },
                SiteConfig {
                    id: "yiyan".to_string(),
                    name: "文心一言".to_string(),
                    url: "https://yiyan.baidu.com".to_string(),
                    icon: None,
                    group: SiteGroup::AiDomestic,
                    shortcut: Some("Alt+5".to_string()),
                    enabled: true,
                    order: 4,
                    custom: false,
                },
                SiteConfig {
                    id: "chatglm".to_string(),
                    name: "智谱清言".to_string(),
                    url: "https://chatglm.cn".to_string(),
                    icon: None,
                    group: SiteGroup::AiDomestic,
                    shortcut: Some("Alt+6".to_string()),
                    enabled: true,
                    order: 5,
                    custom: false,
                },
                // AI 国外
                SiteConfig {
                    id: "chatgpt".to_string(),
                    name: "ChatGPT".to_string(),
                    url: "https://chat.openai.com".to_string(),
                    icon: None,
                    group: SiteGroup::AiForeign,
                    shortcut: Some("Alt+7".to_string()),
                    enabled: true,
                    order: 10,
                    custom: false,
                },
                SiteConfig {
                    id: "claude".to_string(),
                    name: "Claude".to_string(),
                    url: "https://claude.ai".to_string(),
                    icon: None,
                    group: SiteGroup::AiForeign,
                    shortcut: Some("Alt+8".to_string()),
                    enabled: true,
                    order: 11,
                    custom: false,
                },
                SiteConfig {
                    id: "gemini".to_string(),
                    name: "Gemini".to_string(),
                    url: "https://gemini.google.com".to_string(),
                    icon: None,
                    group: SiteGroup::AiForeign,
                    shortcut: Some("Alt+9".to_string()),
                    enabled: true,
                    order: 12,
                    custom: false,
                },
                // 工具
                SiteConfig {
                    id: "youdao".to_string(),
                    name: "有道笔记".to_string(),
                    url: "https://note.youdao.com".to_string(),
                    icon: None,
                    group: SiteGroup::Tool,
                    shortcut: None,
                    enabled: true,
                    order: 20,
                    custom: false,
                },
            ],
            settings: AppSettings::default(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppSettings {
    pub theme: Theme,
    pub sidebar_width: u32,
    pub start_minimized: bool,
    pub lazy_load: bool,
    pub default_site_id: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            sidebar_width: 240,
            start_minimized: false,
            lazy_load: true,
            default_site_id: "deepseek".to_string(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    System,
}
