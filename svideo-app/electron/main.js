const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 判断是否是开发环境
const isDev = process.env.NODE_ENV === 'development';

// 开发环境日志
if (isDev) {
  console.log('Electron 主进程启动...');
  console.log('开发模式:', isDev);
}

// 获取 FFmpeg 路径
function getFfmpegPath() {
  if (isDev) {
    // 开发环境：从 resources 目录读取
    const devPath = path.join(__dirname, '../resources/ffmpeg.exe');
    if (fs.existsSync(devPath)) {
      return devPath;
    }
    return null;
  } else {
    // 生产环境：从 extraResources 目录读取
    // electron-builder 会将 extraResources 放在应用根目录
    const prodPath = path.join(process.resourcesPath, 'ffmpeg.exe');
    if (fs.existsSync(prodPath)) {
      return prodPath;
    }
    // 备用路径：某些情况下可能在 app.getAppPath() 的 resources 目录
    const altPath = path.join(app.getAppPath(), '..', 'ffmpeg.exe');
    if (fs.existsSync(altPath)) {
      return altPath;
    }
    return null;
  }
}

function createWindow() {
  if (isDev) {
    console.log('正在创建 Electron 窗口...');
  }
  
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Sv", // 软件左上角的标题
    icon: path.join(__dirname, '../public/icon.ico'), // 软件图标路径
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // 关键设置：允许软件读取你电脑里的视频文件
    }
  });

  // 隐藏上方默认的菜单栏 (File, Edit, View...)
  Menu.setApplicationMenu(null);

  // 加载页面
  if (isDev) {
    // 开发模式下，加载 Vite 启动的本地服务
    const devUrl = 'http://localhost:5173';
    console.log('正在加载开发服务器:', devUrl);
    win.loadURL(devUrl);
    
    // 监听加载完成
    win.webContents.on('did-finish-load', () => {
      console.log('页面加载完成');
    });
    
    // 监听加载错误
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('页面加载失败:', errorCode, errorDescription);
    });
    
    // 开发模式下可以打开开发者工具
    // win.webContents.openDevTools();
  } else {
    // 生产模式下（打包后），加载打包好的 index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('正在加载生产文件:', indexPath);
    win.loadFile(indexPath);
  }
  
  if (isDev) {
    console.log('Electron 窗口已创建');
  }
}

// IPC 处理：获取 FFmpeg 路径
ipcMain.handle('get-ffmpeg-path', () => {
  const ffmpegPath = getFfmpegPath();
  return ffmpegPath;
});

// IPC 处理：导出 FFmpeg 文件（保存对话框方式）
ipcMain.handle('export-ffmpeg', async () => {
  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    return { success: false, error: 'FFmpeg 文件未找到' };
  }
  
  try {
    const { dialog } = require('electron');
    const result = await dialog.showSaveDialog({
      title: '保存 FFmpeg',
      defaultPath: 'ffmpeg.exe',
      filters: [
        { name: '可执行文件', extensions: ['exe'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      fs.copyFileSync(ffmpegPath, result.filePath);
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理：自动复制 FFmpeg 到下载目录
ipcMain.handle('copy-ffmpeg-to-downloads', async () => {
  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    return { success: false, error: 'FFmpeg 文件未找到' };
  }
  
  try {
    const os = require('os');
    const downloadsPath = path.join(os.homedir(), 'Downloads', 'ffmpeg.exe');
    
    // 如果已存在，先删除
    if (fs.existsSync(downloadsPath)) {
      fs.unlinkSync(downloadsPath);
    }
    
    // 复制文件
    fs.copyFileSync(ffmpegPath, downloadsPath);
    return { success: true, path: downloadsPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理：保存暂存数据到 txt 文件
ipcMain.handle('save-progress-to-file', async (event, data) => {
  try {
    const { dialog } = require('electron');
    const result = await dialog.showSaveDialog({
      title: '保存暂存文件',
      defaultPath: `Svideo_暂存_${new Date().toISOString().split('T')[0]}.txt`,
      filters: [
        { name: '文本文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC 处理：保存单个文本文件（筛选清单 / 裁剪清单）- 保存对话框
ipcMain.handle('save-text-file', async (event, { defaultName, content, title }) => {
  try {
    const { dialog } = require('electron');
    const result = await dialog.showSaveDialog({
      title: title || '保存文件',
      defaultPath: defaultName || 'export.txt',
      filters: [
        { name: '文本文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message, canceled: false };
  }
});

// IPC 处理：导出处理脚本 + FFmpeg 到用户选择的文件夹（仅 bat + ffmpeg，不含清单）
ipcMain.handle('export-script-and-ffmpeg-to-folder', async (event, { batContent }) => {
  const ffmpegPath = getFfmpegPath();
  const hasFfmpeg = ffmpegPath && fs.existsSync(ffmpegPath);
  try {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      title: '选择导出文件夹（请选视频所在文件夹，或即将放置视频的文件夹）',
      properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    const folder = result.filePaths[0];
    fs.writeFileSync(path.join(folder, 'Svideo_处理脚本.bat'), batContent, 'utf-8');
    let ffmpegCopied = false;
    if (hasFfmpeg) {
      fs.copyFileSync(ffmpegPath, path.join(folder, 'ffmpeg.exe'));
      ffmpegCopied = true;
    }
    return { success: true, folderPath: folder, ffmpegCopied };
  } catch (error) {
    return { success: false, error: error.message, canceled: false };
  }
});

// IPC 处理：从 txt 文件加载暂存数据
ipcMain.handle('load-progress-from-file', async () => {
  try {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      title: '加载暂存文件',
      filters: [
        { name: '文本文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      return { success: true, data };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  if (isDev) {
    console.log('Electron app 已就绪');
  }
  createWindow();
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

// 处理未捕获的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});