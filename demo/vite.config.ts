import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  /**
   * 坑点（docs 2.1）：mqtt.js 在浏览器构建里引用了全局 `global` 对象，
   * Vite 默认不做 Node polyfill，不注入会导致运行时 `global is not defined`。
   * 这里显式把它指到 `globalThis`。
   */
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
  },
})
