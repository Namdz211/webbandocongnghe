import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api/products': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/api/categories': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/api/orders': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/api/customers': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api/roles': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
