import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/rest': 'http://localhost:8080',
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    }
  },
  preview: {
    port: 4173,
    proxy: {
      '/rest': 'http://localhost:8080',
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    }
  }
})
