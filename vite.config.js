import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-landing',
      writeBundle() {
        const src = resolve(__dirname, 'landing.html')
        const dest = resolve(__dirname, 'dist/landing.html')
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest)
          console.log('✓ landing.html copied to dist/')
        } else {
          console.warn('⚠ landing.html not found at', src)
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.html')
    }
  }
})
