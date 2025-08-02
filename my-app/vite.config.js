import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',  // これでローカルネットワーク上の他の端末からアクセス可能に
    port: 5173        // 必要に応じて変更可能
  }
})
