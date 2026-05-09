/**
 * 构建前删除 dist_electron，避免 electron-builder 清理 win-unpacked 时
 * 因 d3dcompiler_47.dll 等被占用而报 "Access is denied"。
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'dist_electron');
if (fs.existsSync(dir)) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('✓ 已清理 dist_electron');
  } catch (e) {
    console.warn('清理 dist_electron 失败（若有 Svideo 在运行请先关闭）:', e.message);
  }
}
