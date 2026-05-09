import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 关键修复：将基础路径设置为相对路径 './'
  // 这样 Electron 才能在 file:// 协议下正确找到 css 和 js 文件
  base: './', 
})
