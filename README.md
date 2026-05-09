# Batch Video Label and Crop

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **简介：** Windows 小工具：视频打标签、筛选、裁剪；安装包见 Releases。

**English:** **Batch video labeling**, **quick screening / select**, and **video crop** in one **Windows** desktop app — keyboard-friendly pass over a folder of clips (keep / skip), then **crop** and export with **FFmpeg**. **Electron + React**. (Display name in the installer remains **Svideo**.)

**中文：** 这是一个放在电脑上的**小工具**，用来**尽快给视频打标签、过一遍做筛选，以及做画面裁剪**——适合手里一堆素材时要快速做决定，不必开很重的剪辑软件。

|  |  |
| --- | --- |
| **Stack** | Electron 25 · React 18 · Vite 4 · Tailwind · FFmpeg（Windows 打包） |
| **作者** | [NKUDZL](https://github.com/NKUDZL) · Deng Zelai · [nkudzl@mail.nankai.edu.cn](mailto:nkudzl@mail.nankai.edu.cn) |
| **License** | [MIT](LICENSE) |

**想在 GitHub 搜索里更容易被看到（必做）：**

1. 打开仓库主页右侧 **About** 笔形编辑：**Description** 建议用英文首句（全站搜索更常匹配英文），例如粘贴：  
   `Batch video label, screen/select, and crop — Windows desktop tool (Electron + FFmpeg). See Releases for downloads.`  
2. 仍在 **About** 里添加 **Topics**（不设就几乎少一大截曝光），建议至少包含：  
   `video` `video-crop` `video-editing` `labeling` `batch-processing` `electron` `ffmpeg` `windows` `desktop` `open-source` `footage` `screening`  
3. **仓库名（URL）** 若仍是 `Svideo`，搜 `video crop` 时**相关度会偏低**；可在 **Settings → General → Repository name** 改成带关键词的短名，例如 **`batch-video-label-crop`** 或 **`video-label-crop-win`**（只能字母、数字、`-`）。改名后旧链接通常会跳转，Release 链接需用新路径更新 README 里 `github.com/NKUDZL/...` 部分。

说明：**Best match** 前排多为高 Star 老仓库；新项目更现实的目标是占住 **video label / video crop / batch video** 等**长尾**排序，并靠 Topics + 描述 + 仓库名对齐关键词。

---

## 下载（Windows）

安装包不在源码里，在 **Releases** 里下载即可。

**当前已发布：** [v1.0 — svideo v1.0 win](https://github.com/NKUDZL/Svideo/releases/tag/v1.0)

|  |  |
| --- | --- |
| **安装程序** | [Svideo.Setup.1.0.0.exe](https://github.com/NKUDZL/Svideo/releases/download/v1.0/Svideo.Setup.1.0.0.exe) |
| **免安装压缩包** | 解压后运行 `Svideo.exe` → [Svideo-1.0.0-win.zip](https://github.com/NKUDZL/Svideo/releases/download/v1.0/Svideo-1.0.0-win.zip) |
| **最新版入口** | [Releases / Latest](https://github.com/NKUDZL/Svideo/releases/latest) |

若以后换了文件名或新版本，以上直链可能失效，请直接打开 [Releases](https://github.com/NKUDZL/Svideo/releases)，在对应版本下的 **Assets** 里点文件名下载（最稳妥）。

---

## 界面预览

| 首页 | 筛选（Y / N） |
| --- | --- |
| ![首页](screenshots/首页.png) | ![筛选](screenshots/视频筛选.png) |

| 裁剪 | 导出 |
| --- | --- |
| ![裁剪](screenshots/视频裁剪.png) | ![导出](screenshots/处理脚本与结果导出.png) |

---

## 能做什么

- 导入多个文件或整个文件夹，常见视频后缀都认得。
- **打标签 / 筛选：** 逐条看，**Y** 保留、**N** 丢掉，可撤销，**Ctrl+S** 暂存进度。
- **裁剪：** 在画面上框选区域，有比例和自定义尺寸，和上面的结果一起参与导出。
- 可导出清单、裁剪信息和 FFmpeg 相关批处理（具体见软件里按钮）。
- 仅 **Windows** 安装包内已带 FFmpeg；Mac 相关配置未完整，需自行改打包再发版。

---

## 快捷键（筛选界面）

焦点不在输入框里时：

| 按键 | 作用 |
| --- | --- |
| `Y` | 保留 |
| `N` | 丢掉 |
| `A` / `←` | 上一个 |
| `D` / `→` | 下一个 |
| `Z` / `Backspace` | 撤销 |
| `Space` | 播放 / 暂停 |
| `Ctrl+S` | 暂存 |
| `Esc` | 关弹窗 |

---

## 开发（从源码跑）

需要 **Node.js（建议 LTS）** 和 **npm**。

```bash
cd svideo-app
npm install
npm run electron:dev
```

只调界面、不跑 Electron（部分读写和 FFmpeg 能力不可用）：

```bash
cd svideo-app
npm install
npm run dev
```

---

## 打包（维护者）

```bash
cd svideo-app
npm run electron:build
```

产物在 `svideo-app/dist_electron/`（已 `.gitignore`，不会进仓库）。  
**发新版时：** 在 [Releases](https://github.com/NKUDZL/Svideo/releases) 新建版本、上传 `.exe` 与 `.zip`，再把本 README 里「下载」表格中的 **Tag** 和 **文件名** 改成与 Assets 完全一致（有空格的文件名在 URL 里要编码）。

> **macOS：** `package.json` 里有 `mac` 目标，但 FFmpeg 资源目前按 Windows 配的，要发 Mac 包需另改资源路径。

---

## 仓库结构

- 程序源码在 **`svideo-app/`**。
- 根目录的 `App.jsx` 若和 `svideo-app/src/App.jsx` 不一致，以 **`svideo-app/src/App.jsx`** 为准。

---

## License Agreement

本仓库源码与文档在 **[MIT License](LICENSE)** 下发布。你可以按许可条款自由使用、修改和再分发；使用时请遵守许可全文（含版权声明与免责声明），并确保用途合法合规。安装包内若包含第三方组件（如 Electron、FFmpeg 等），亦需遵守其各自许可。

---

## Contact Us

使用问题、建议或合作意向，欢迎发邮件：[1412793081@qq.com](mailto:1412793081@qq.com)。
