import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-landing',
      closeBundle() {
        fs.copyFileSync(
          resolve(__dirname, 'landing.html'),
          resolve(__dirname, 'dist/landing.html')
        )
      }
    }
  ]
})
