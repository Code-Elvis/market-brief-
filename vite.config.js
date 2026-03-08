import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-app-html',
      closeBundle() {
        copyFileSync(
          resolve(__dirname, 'dist/app.html'),
          resolve(__dirname, 'dist/index.html')
        )
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'app.html'),
      }
    }
  }
})
