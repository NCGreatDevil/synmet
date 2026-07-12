import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@vicons/ionicons5': path.resolve(__dirname, './node_modules/@vicons/ionicons5')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://synmet.ma.cloud-ip.cc',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
