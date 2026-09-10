import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * GitHub Pages 部署在 https://<user>.github.io/<repo>/ 这个子路径下，
 * 所以打包时 base 必须是 `/<仓库名>/`，否则所有 JS/CSS/图片都会 404。
 *
 * 仓库名改了这里也要跟着改 —— 两者必须完全一致。
 *
 * 只在 build 时加前缀；dev 保持 `/`，本地照旧访问 http://localhost:5173/
 */
const REPO_NAME = 'kfps-ai-report'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/${REPO_NAME}/` : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
