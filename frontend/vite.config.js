import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to FastAPI so we avoid CORS issues in dev
    proxy: {
      '/urls': 'http://localhost:8000',
      '/health-checks': 'http://localhost:8000',
    },
  },
})
