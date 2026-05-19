import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Repo is served from https://<user>.github.io/fraction-tutor/ on GitHub Pages,
// so assets must resolve under that sub-path. Local dev stays at "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/fraction-tutor/' : '/',
  plugins: [react()],
  server: { host: true },
}))
