import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'https://course-allocation-02wj.onrender.com',
        changeOrigin: true,
        secure: true,
        timeout: 30000
      }
    }
  },
  define: {
    global: 'globalThis',
  },
})