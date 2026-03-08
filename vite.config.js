import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync } from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-landing',
      closeBundle() {
        copyFileSync(
          resolve(__dirname, 'index.html'),
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
