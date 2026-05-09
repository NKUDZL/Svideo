// 简单的延迟脚本 - 等待固定时间后启动 Electron
const DELAY = 3000; // 3秒延迟

console.log(`等待 ${DELAY/1000} 秒让 Vite 服务器启动...`);

setTimeout(() => {
  console.log('✓ 延迟完成，启动 Electron');
  process.exit(0);
}, DELAY);
