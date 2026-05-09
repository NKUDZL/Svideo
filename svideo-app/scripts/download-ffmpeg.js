const fs = require('fs');
const path = require('path');

// 创建 resources 目录（如果不存在）
const resourcesDir = path.join(__dirname, '../resources');
let canWriteToResources = true;
try {
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }
} catch (e) {
  console.warn('无法创建 resources 目录:', e.message);
  console.log('将使用 node_modules 中的 FFmpeg（构建时会自动包含）');
  canWriteToResources = false;
}

const ffmpegPath = path.join(resourcesDir, 'ffmpeg.exe');

// 如果已存在，跳过下载
if (canWriteToResources && fs.existsSync(ffmpegPath)) {
  console.log('✓ FFmpeg 已存在，跳过下载');
  console.log('文件位置:', ffmpegPath);
  process.exit(0);
}

// 方法1: 检查 @ffmpeg-installer/ffmpeg（如果已安装）
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  const installerPath = ffmpegInstaller.path;
  if (fs.existsSync(installerPath)) {
    console.log('✓ 找到 @ffmpeg-installer/ffmpeg');
    console.log('FFmpeg 位置:', installerPath);
    console.log('构建时会自动从此位置包含 FFmpeg（无需复制）');
    // 直接退出，不进行复制操作，避免文件锁定问题
    process.exit(0);
  }
} catch (e) {
  // 忽略错误，继续尝试其他方法
  console.log('@ffmpeg-installer/ffmpeg 不可用，尝试其他方法...');
}

// 方法2: 尝试使用 ffbinaries
try {
  const ffbinaries = require('ffbinaries');
  console.log('使用 ffbinaries 下载...');
  
  ffbinaries.downloadFiles(
    ['ffmpeg'],
    {
      platform: 'win-64',
      destination: resourcesDir,
      force: false
    },
    (err, data) => {
      if (err) {
        console.error('ffbinaries 下载失败:', err.message);
        showManualInstructions();
        process.exit(1);
      }
      
      const finalPath = path.join(resourcesDir, 'ffmpeg.exe');
      if (fs.existsSync(finalPath)) {
        console.log('✓ FFmpeg 下载完成！');
        console.log('文件位置:', finalPath);
        process.exit(0);
      } else {
        console.error('✗ FFmpeg 文件未找到');
        showManualInstructions();
        process.exit(1);
      }
    }
  );
} catch (e) {
  console.error('无法使用 ffbinaries:', e.message);
  showManualInstructions();
  process.exit(1);
}

function showManualInstructions() {
  console.log('');
  console.log('==========================================');
  console.log('请手动下载 FFmpeg:');
  console.log('==========================================');
  console.log('方法1（推荐）:');
  console.log('1. 访问: https://www.gyan.dev/ffmpeg/builds/');
  console.log('2. 下载 "ffmpeg-release-essentials.zip"');
  console.log('3. 解压后将 bin/ffmpeg.exe 复制到:', resourcesDir);
  console.log('');
  console.log('方法2:');
  console.log('npm install @ffmpeg-installer/ffmpeg');
  console.log('然后重新运行构建命令');
  console.log('');
  console.log('方法3:');
  console.log('如果已安装 FFmpeg 到系统 PATH，可以跳过此步骤');
  console.log('脚本会在运行时自动查找系统 PATH 中的 ffmpeg');
  console.log('');
}
