# Power App：把常用 AI 和 Web 工具，装进一个窗口

> 一站式 AI 大模型浏览器：集中管理多个 AI 对话网站和 Web 应用，让频繁切换工具变成一次点击。

![Power App 封面图](screenshots/main-interface.png)

在日常工作中，我们经常需要同时使用 DeepSeek、Kimi、ChatGPT、Claude、Gemini、通义千问，以及搜索、翻译、笔记和开发工具。

浏览器标签页越来越多、窗口越来越乱，不同站点之间反复切换，同一个问题还要复制粘贴到多个 AI 中进行比较。

**Power App** 正是为这个场景打造的桌面应用。

它把多个 AI 网站和 Web 工具集中到一个 Windows 窗口中，通过侧边栏、快捷键和消息广播，构建一个更适合实际工作的 AI 工具箱。

## 一个窗口，管理多个 AI 站点

Power App 基于 Tauri 2 构建，采用“单窗口 + Child Webview”的设计。每个站点作为独立的原生子 WebView 加载在主窗口中，切换站点时只显示目标页面并隐藏其他页面。

- 已登录的页面可以持续保留
- 不需要反复打开和关闭浏览器窗口
- 切换时不必重新加载整个应用
- 多个站点共享一个统一的操作入口

目前项目内置了 DeepSeek、Kimi、豆包、通义千问、文心一言、智谱清言、ChatGPT、Claude、Gemini 和有道笔记，也支持添加任意 Web 应用。

## 自定义你的 AI 工作台

点击左侧的“添加”按钮，填写站点名称、网址、分组和可选快捷键，即可添加新的 Web 应用。

自定义站点支持修改名称、网址、分组和快捷键，也可以删除站点。删除前会弹出确认提示，确认后才会移除配置并销毁对应的 WebView，避免误操作。

## 一条消息，同时发给多个 AI

Power App 提供“广播消息”功能。输入一次问题，就可以同时发送到多个 AI 站点，适合写作、方案设计、代码排查和资料整理中的答案对比。

广播功能支持常见的 `textarea` 输入框、`contenteditable` 编辑区域、发送按钮以及 Enter 键发送等交互方式。

> 广播功能依赖第三方站点页面结构。由于不同网站会持续更新页面，个别站点可能需要后续适配。

## 快捷键切换，减少鼠标操作

Power App 支持全局快捷键，可以使用 `Alt+1` 到 `Alt+9` 快速切换站点。快捷键可以在站点配置中按需设置，也可以通过设置面板管理。

## 为桌面工作流准备的细节

### 系统托盘

关闭窗口时可以最小化到系统托盘，需要继续工作时快速恢复，不必重新启动应用。

### 自定义标题栏

采用无边框窗口搭配自定义标题栏，支持拖拽、最小化、最大化和关闭操作。

### 侧边栏宽度调整

侧边栏支持在 `160px` 到 `400px` 之间拖拽调整，适配不同长度的站点名称和个人使用习惯。

### 配置持久化

站点、快捷键和应用设置会保存到本地配置文件中。重新打开应用后，之前添加的站点仍然可以继续使用。

## 技术实现

Power App 的前端使用 React + TypeScript，后端使用 Rust，桌面容器采用 Tauri 2。

| 模块 | 技术 |
| --- | --- |
| 桌面框架 | Tauri 2 |
| 前端 | React 19 + TypeScript |
| 后端 | Rust 2021 |
| 构建工具 | Vite + Tailwind CSS |
| 状态管理 | Zustand |
| 浏览器内核 | Windows WebView2 |

前端通过 Tauri IPC 调用 Rust 命令，由 WebviewManager 负责站点 WebView 的创建、显示、隐藏、导航和销毁。

```text
React 前端
    │
    │ Tauri IPC invoke()
    ▼
Rust Commands
    ▼
WebviewManager
    ▼
WebView2 Child Webview
```

## 适合哪些人使用？

- 经常使用多个 AI 模型进行对比和协作的人
- 需要同时使用国内外 AI 服务的开发者和创作者
- 经常在 AI、搜索、翻译、笔记和代码工具之间切换的人
- 希望减少浏览器标签页和窗口数量的用户
- 想把常用 Web 工具整理成专属工作台的人

Power App 不是一个新的 AI 模型，而是一个帮助你更高效使用现有 AI 工具的入口。

## 快速开始

### 环境要求

- Windows
- Node.js 18 或更高版本
- Rust 1.70 或更高版本
- WebView2 Runtime
- Tauri Windows 开发环境

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run tauri dev
```

### 构建安装包

```bash
npm run tauri build
```

## 开源地址

项目已开源，欢迎 Star、Fork 和参与贡献：

- Gitee：<https://gitee.com/gcyai/power-app>
- GitHub：<https://github.com/guochunyang2004/power-app>

欢迎将项目分享给同样需要管理多个 AI 工具的朋友。

---

**Power App：让 AI 工具少一点切换，多一点专注。**

> 本项目仅提供统一的桌面访问入口，不存储或托管第三方站点账号信息。使用各项服务时，请遵守对应平台的服务条款和隐私政策。
