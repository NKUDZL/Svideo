# Svideo — Batch Video Label and Crop

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**English:** A keyboard-driven desktop app for **LabelMe-style binary labeling on videos** (yes / no → keep / discard), plus **interactive crop regions** and **FFmpeg-based export** — **Electron + React + Vite**. Built for quickly marking clips as good or bad across large folders.

**中文：** 同一套工具完成「像打标一样批量标好/坏（Y/N）、画裁剪框、导出批处理」——接近 LabelMe 那种**二分类标注**思路，但更偏过片效率。应用内产品名仍为 **Svideo**。

|  |  |
| --- | --- |
| **Stack** | Electron 25 · React 18 · Vite 4 · Tailwind · FFmpeg (bundled in Windows builds) |
| **Maintainer** | [NKUDZL](https://github.com/NKUDZL) · Deng Zelai · [nkudzl@mail.nankai.edu.cn](mailto:nkudzl@mail.nankai.edu.cn) |
| **License** | [MIT](LICENSE) |

**Suggested GitHub topics (for discovery):** `video` `electron` `ffmpeg` `batch-processing` `video-editing` `labeling` `annotation` `crop` `desktop-app` `windows`

---

## Download (Windows, pre-built)

源码仓库**不附带**安装包。请在本页 **Releases** 下载已构建的安装程序或便携压缩包（上传由维护者发布）。

**→ [打开 Releases 下载页](https://github.com/NKUDZL/Svideo/releases)**

若该页尚无任何版本，说明还没有发布构建产物，需要先按下面步骤**创建第一个 Release 并上传文件**；上传完成后，同一页面会出现可点击的 **Assets** 下载链接。

### 如何发布可下载的安装包

1. 在本机构建（见下文 **Build**），在 `svideo-app/dist_electron/` 中会得到（具体文件名以目录内为准）：
   - **安装程序**：如 `Svideo Setup 1.0.0.exe`
   - **便携版 ZIP**：如 `Svideo-1.0.0-win-x64.zip`（解压后运行 `Svideo.exe`）
2. 打开 GitHub：**[Releases](https://github.com/NKUDZL/Svideo/releases)** → **Create a new release**。
3. **Tag** 建议与版本一致，例如 `v1.0.0`；填写 Release 标题与说明 → 将上述 `.exe` / `.zip` **拖入 Assets** → **Publish release**。
4. 发布成功后：
   - 始终有效的入口仍是：**[Releases 列表](https://github.com/NKUDZL/Svideo/releases)**（推荐放在 README 里）。
   - **`/releases/latest`** 仅在「至少已有一个正式 Release」时才会指向最新版；从未发布时会打不开或显示异常，属正常现象。
   - 单个文件的**永久直链**可在已发布 Release 里，对某个 Asset 右键复制链接得到；格式为  
     `https://github.com/NKUDZL/Svideo/releases/download/<Tag>/<文件名>`  
     （`<Tag>`、`<文件名>` 必须与你上传时完全一致，含空格时需 URL 编码。）

也可上传自打包的 **RAR** 等格式，步骤相同。

---

## Screenshots

| Home | Label (Y / N) |
| --- | --- |
| ![Home](screenshots/首页.png) | ![Label pass](screenshots/视频筛选.png) |

| Crop | Export |
| --- | --- |
| ![Crop](screenshots/视频裁剪.png) | ![Export](screenshots/处理脚本与结果导出.png) |

---

## Features

- Import multiple files or a whole folder; common video extensions supported.
- **Label mode (Y / N):** mark keep / discard like a quick LabelMe-style pass, undo, save progress (`Ctrl+S`).
- **Crop mode:** draw regions, presets & custom sizes; works with your selections for batch export.
- Export filter lists, crop metadata, and FFmpeg-related batch helpers (see in-app options).
- **Windows:** FFmpeg is packaged via `electron-builder` `extraResources`.

---

## Keyboard shortcuts (labeling view)

When labeling clips (not typing in an input):

| Key | Action |
| --- | --- |
| `Y` | Keep |
| `N` | Discard |
| `A` / `←` | Previous |
| `D` / `→` | Next |
| `Z` / `Backspace` | Undo |
| `Space` | Play / Pause |
| `Ctrl+S` | Save progress |
| `Esc` | Close modal |

---

## Development

Requires **Node.js** (LTS recommended) and **npm**.

```bash
cd svideo-app
npm install
npm run electron:dev
```

Web-only (no Electron / limited file & FFmpeg features):

```bash
cd svideo-app
npm install
npm run dev
```

---

## Build

```bash
cd svideo-app
npm run electron:build
```

Artifacts are written to `svideo-app/dist_electron/` (ignored by Git). On Windows you should get both the **NSIS installer** and a **`.zip`** portable archive.

> **macOS:** `package.json` includes a `mac` target, but FFmpeg `extraResources` is currently wired for Windows; mac builds need separate FFmpeg bundling if you ship them.

---

## Repository layout

- Application source: `svideo-app/`
- Root `App.jsx` may diverge from `svideo-app/src/App.jsx` — treat **`svideo-app/src/App.jsx`** as the source of truth.

---

## Push to GitHub

If this folder is not yet connected to a remote:

```bash
cd "d:\vidio diffusion\video_select"
git remote add origin https://github.com/NKUDZL/Svideo.git
git branch -M main
git push -u origin main
```

Then publish **Releases** and add the download links above.

---

## Keywords (for search)

video labeling, yes-no annotation, batch review, video crop, labelme-like, electron app, ffmpeg, windows desktop, creator workflow, keyboard shortcuts, 视频筛选, 视频标注, 视频裁剪
