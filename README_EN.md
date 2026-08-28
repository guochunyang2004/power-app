# Power App

**[中文](README.md)** | English

An all-in-one AI browser wrapper — manage multiple AI chat websites in a single window with fast switching, broadcast messaging, global hotkeys, and more.

## Features

- **Centralized Multi-Site Management** — Built-in support for DeepSeek, Kimi, Doubao, Qianwen, ChatGPT, Claude, Gemini, and other leading AI models, plus web tools like Youdao Notes and DeepSeek-Harness
- **Single-Window Multi-Page Switching** — Based on Tauri 2 Child Webview technology, all sites load as native sub-views within one window for instant switching without reopening
- **Broadcast Messaging** — Send a single message to multiple AI sites simultaneously with auto-fill and send (supports both textarea and contentEditable input modes)
- **Global Hotkeys** — Alt+1 ~ Alt+9 to quickly switch to the corresponding site
- **Custom Title Bar** — Frameless window with draggable title bar area, minimize/maximize/close buttons following Windows conventions
- **System Tray** — Close button minimizes to system tray; left-click tray icon to toggle show/hide
- **Resizable Sidebar** — Drag to freely adjust sidebar width between 160px and 400px
- **Site CRUD** — Add any web application (AI chat, search, translation, notes, dev tools, etc.), edit and delete existing sites
- **Site Groups** — Organized into AI Domestic, AI Foreign, Tools, and Other categories

## Screenshots

**Main Interface — Sidebar Site Switching + Kimi AI Chat**

![Power App Main Interface](docs/screenshots/main-interface.png)

**Tool Integration — DeepSeek Harness Local Dev Workspace**

![Power App Workspace](docs/screenshots/workspace-view.png)

> The screenshots show Power App managing multiple AI sites and web tools. The left sidebar organizes sites into AI Domestic, AI Foreign, and Tools groups with hotkey support, while the right content area renders third-party web apps (such as Kimi, DeepSeek Harness, etc.) as native Child Webviews.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | [Tauri](https://tauri.app/) | 2.x (unstable feature) |
| Frontend UI | [React](https://react.dev/) | 19 |
| Languages | TypeScript + Rust | TS 5.8 / Rust 2021 |
| Build Tool | [Vite](https://vite.dev/) | 7.x |
| Styling | [Tailwind CSS](https://tailwindcss.com/) | 4.x (Vite plugin) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) | 5.x |
| Icons | [Lucide React](https://lucide.dev/) | - |
| Backend Plugins | tauri-plugin-global-shortcut, tauri-plugin-opener, tauri-plugin-shell | 2.x |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Tauri Main Window                  │
│  ┌──────────────────────────────────────────────┐    │
│  │             Frontend React App                │    │
│  │  ┌──────────┐  ┌─────────────────────────┐   │    │
│  │  │ Sidebar  │  │       TitleBar          │   │    │
│  │  │          │  ├─────────────────────────┤   │    │
│  │  │ Site List│  │                         │   │    │
│  │  │ Groups   │  │   Content Area          │   │    │
│  │  │ Drag     │  │   (HTML layer)          │   │    │
│  │  │ Resize   │  │                         │   │    │
│  │  │          │  │                         │   │    │
│  │  └──────────┘  │                         │   │    │
│  │  ┌──────────┐  │   ┌─────────────────┐   │   │    │
│  │  │ Modals   │  │   │ Child Webview   │   │    │
│  │  │ Settings │  │   │ (Native layer,  │   │    │
│  │  │ Add/Bcast│  │   │  above HTML)    │   │    │
│  │  └──────────┘  │   └─────────────────┘   │   │    │
│  │                └─────────────────────────┘   │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  Rust Backend (WebView2Engine + WebviewManager)      │
│  ├── config/     JSON config persistence              │
│  ├── engine/     Browser engine abstraction layer     │
│  ├── manager/    Webview lifecycle management         │
│  ├── commands/   Tauri IPC commands                  │
│  ├── tray.rs     System tray                         │
│  └── shortcuts   Global hotkey registration           │
└─────────────────────────────────────────────────────┘
```

### Core Design: Single Window + Child Webview

Traditional multi-window approaches (one OS window per site) suffer from taskbar clutter and high resource usage. Power App adopts a **Single Window + Tauri 2 Child Webview** architecture:

1. The app creates only one Tauri `Window` (main window); the frontend React renders the sidebar and title bar
2. Each AI site is added as a **Child Webview** via `Window::add_child()` into the main window's content area
3. When switching sites, `show()` / `hide()` controls Child Webview visibility for **instant switching without page loss**
4. Adding/removing sites dynamically creates/destroys Child Webviews — no app restart required

### Data Flow

```
Frontend React ──invoke()──▶ Tauri IPC ──▶ Rust Commands ──▶ WebviewManager ──▶ WebView2Engine
      │                                                       │
      └────────────── loadSites() ◀── get_sites ──────────────┘
```

## Project Structure

```
power-app/
├── src/                          # Frontend React app
│   ├── App.tsx                   # Root component (sidebar + titlebar + modals)
│   ├── main.tsx                  # Entry point
│   ├── index.css                 # Tailwind entry
│   ├── types/index.ts            # TypeScript type definitions
│   ├── stores/appStore.ts        # Zustand global state
│   ├── hooks/useShortcuts.ts     # Keyboard shortcut hook
│   └── components/
│       ├── Sidebar/              # Sidebar (site list, groups, drag resize)
│       ├── TitleBar/             # Custom title bar (site info, actions, window controls)
│       ├── Settings/             # Settings modal (theme, site management)
│       ├── AddSite/              # Add/edit site modal
│       └── Broadcast/            # Broadcast message modal
│
├── src-tauri/                    # Backend Rust app
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Tauri config (window, bundling)
│   ├── capabilities/default.json # Permission config
│   └── src/
│       ├── lib.rs                # App entry, initialization, event listeners
│       ├── main.rs               # Binary entry
│       ├── tray.rs               # System tray (left-click toggle, right-click menu)
│       ├── shortcuts.rs          # Global hotkey registration
│       ├── config/
│       │   ├── mod.rs            # ConfigManager (JSON read/write persistence)
│       │   └── models.rs         # Data models (SiteConfig, AppConfig)
│       ├── engine/
│       │   ├── mod.rs            # BrowserEngine trait abstraction
│       │   └── webview2.rs       # WebView2 engine implementation
│       ├── manager/
│       │   ├── mod.rs
│       │   └── webview_manager.rs # Webview lifecycle manager
│       └── commands/
│           ├── mod.rs
│           ├── site_commands.rs   # Site CRUD commands
│           └── view_commands.rs   # View operation commands
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) >= 1.70
- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/) (Windows: WebView2 Runtime, MSVC)

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run tauri dev
```

### Build Release

```bash
npm run tauri build
```

Build output is located at `src-tauri/target/release/bundle/`:
- `msi/` — Windows MSI installer
- `nsis/` — NSIS setup wizard

## Configuration

App configuration is stored at:

```
Windows: C:\Users\<username>\AppData\Roaming\com.gcyai.power-app\config.json
```

### Built-in Sites

| Site | Hotkey | Group |
|------|--------|-------|
| DeepSeek | Alt+1 | AI Domestic |
| Kimi | Alt+2 | AI Domestic |
| Doubao | Alt+3 | AI Domestic |
| Qianwen | Alt+4 | AI Domestic |
| Yiyan (ERNIE Bot) | Alt+5 | AI Domestic |
| ChatGLM (Zhipu) | Alt+6 | AI Domestic |
| ChatGPT | Alt+7 | AI Foreign |
| Claude | Alt+8 | AI Foreign |
| Gemini | Alt+9 | AI Foreign |
| Youdao Notes | - | Tools |

### Recommended Sites to Integrate

Power App is not limited to AI chat — any web application can be integrated as a site. Here are some recommended additions:

| Category | Site | URL | Description |
|----------|------|-----|-------------|
| Search | Google | `https://www.google.com` | General search engine |
| Search | Perplexity | `https://www.perplexity.ai` | AI-powered search engine |
| Translation | DeepL | `https://www.deepl.com/translator` | High-quality AI translation |
| Translation | Google Translate | `https://translate.google.com` | Multi-language translation |
| Translation | Baidu Translate | `https://fanyi.baidu.com` | Chinese-English translation |
| Notes | Notion | `https://www.notion.so` | Collaborative notes & knowledge base |
| Notes | Youdao Notes | `https://note.youdao.com` | Cloud note-taking (built-in) |
| Diagrams | Excalidraw | `https://excalidraw.com` | Hand-drawn style whiteboard |
| Diagrams | draw.io | `https://app.diagrams.net` | Flowcharts & architecture diagrams |
| Dev | GitHub | `https://github.com` | Code hosting platform |
| Dev | Stack Overflow | `https://stackoverflow.com` | Technical Q&A |
| Dev | DeepSeek-Harness | `http://127.0.0.1:3080` | Local development tool |
| Writing | Biling | `https://ibiling.cn` | AI writing assistant |
| Design | Canva | `https://www.canva.com` | Online design tool |

> **Tip**: Click the "Add" button at the bottom of the sidebar, enter a name and URL to integrate any web application.

### Tauri Commands (IPC)

| Command | Description |
|---------|-------------|
| `get_sites` | Get all site configurations |
| `add_site` | Add a new site |
| `update_site` | Update site information |
| `delete_site` | Delete site and destroy its webview |
| `switch_view` | Switch to a specific site's webview |
| `create_view` | Dynamically create a new child webview |
| `navigate_view` | Navigate a webview to a new URL |
| `reload_view` | Reload the current webview |
| `broadcast_message` | Broadcast a message to multiple sites |
| `hide_all_views` | Hide all child webviews |
| `update_sidebar_width` | Update sidebar width and adjust webview layout |

## License

This project is licensed under the [Apache License 2.0](LICENSE).
