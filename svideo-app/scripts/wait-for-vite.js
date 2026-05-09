const http = require('http');
const net = require('net');

const MAX_RETRIES = 30; // 最多尝试30次
const RETRY_INTERVAL = 500; // 每次间隔0.5秒（更快检测）

// 方法1: 检查端口是否开放
function checkPort() {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    
    socket.setTimeout(1000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve();
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('端口连接超时'));
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });
    
    socket.connect(5173, 'localhost');
  });
}

// 方法2: HTTP 请求检查
function checkHttp() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5173', { timeout: 2000 }, (res) => {
      // 任何响应都表示服务器在运行
      res.on('data', () => {}); // 消费数据
      res.on('end', () => {
        resolve();
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTP 请求超时'));
    });

    req.setTimeout(2000);
  });
}

async function waitForVite() {
  console.log('等待 Vite 开发服务器启动...');
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      // 先检查端口
      await checkPort();
      // 再检查 HTTP
      await checkHttp();
      console.log('\n✓ Vite 服务器已就绪');
      // 额外等待一小段时间确保完全就绪
      await new Promise(resolve => setTimeout(resolve, 300));
      process.exit(0);
    } catch (error) {
      if (i < MAX_RETRIES - 1) {
        // 每5次显示一次进度
        if (i % 5 === 0 || i < 3) {
          process.stdout.write(`\r尝试 ${i + 1}/${MAX_RETRIES}...`);
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
      } else {
        console.error('\n✗ 等待超时：无法连接到 Vite 服务器');
        console.error('错误:', error.code || error.message);
        console.error('提示: 请确认 http://localhost:5173 可以在浏览器中正常访问');
        console.error('如果浏览器可以访问，请尝试手动启动: npm run electron:dev:manual');
        process.exit(1);
      }
    }
  }
}

waitForVite();
