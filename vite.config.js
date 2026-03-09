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
        try {
          copyFileSync(
            resolve(__dirname, 'landing.html'),
            resolve(__dirname, 'dist/landing.html')
          )
        } catch (e) {
          console.warn('copy-landing: landing.html not found, skipping')
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      }
    }
  }
})
