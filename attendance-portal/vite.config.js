import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
    server: {
    // Proxy API requests to your Express server
    proxy: {
      '/api': {
        target: 'http://localhost:5173',
        changeOrigin: true
      }
    }
  }
})
