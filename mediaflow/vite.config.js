import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3100,
    strictPort: true,
    cors: true,
    // When running Vite alone, proxy API/auth to Express (e.g. run Express on 3000)
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
