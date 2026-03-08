import { defineConfig } from ‘vite’
import react from ‘@vitejs/plugin-react’
import { resolve } from ‘path’
import { copyFileSync } from ‘fs’

export default defineConfig({
plugins: [
react(),
{
name: ‘copy-app-html’,
closeBundle() {
// Copy the built index.html to app.html so both serve the React app
copyFileSync(
resolve(__dirname, ‘dist/index.html’),
resolve(__dirname, ‘dist/app.html’)
)
}
}
],
build: {
rollupOptions: {
input: {
main: resolve(__dirname, ‘index.html’),
}
}
}
})
