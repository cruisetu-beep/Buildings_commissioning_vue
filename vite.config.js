import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api/Equipment/getFile': {
        target: 'https://www.ttbems.com:14442/CarbonData4AIAgentAPI',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        // target: 'https://127.0.0.1:7023',
        target: 'https://www.ttbems.com:14440/HPManage',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
