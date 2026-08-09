import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local/dev and Render single-service: /
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 5175,
    proxy: {
      '/v1': 'http://127.0.0.1:8000',
      '/healthz': 'http://127.0.0.1:8000',
    },
  },
})
