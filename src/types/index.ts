export interface SiteGroup {
  kind: "ai_foreign" | "ai_domestic" | "tool" | "other";
}

export interface SiteConfig {
  id: string;
  name: string;
  url: string;
  icon: string | null;
  group: "ai_foreign" | "ai_domestic" | "tool" | "other";
  shortcut: string | null;
  enabled: boolean;
  order: number;
  /** 是否为用户自定义添加的站点 */
  custom: boolean;
}

export interface AppSettings {
  theme: "light" | "dark" | "system";
  sidebar_width: number;
  start_minimized: boolean;
  lazy_load: boolean;
  default_site_id: string;
}

export interface AppConfig {
  sites: SiteConfig[];
  settings: AppSettings;
}
