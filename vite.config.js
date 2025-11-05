import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  envDir: path.resolve(__dirname, 'src'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),   // מאפשר לייבא "@/..."
    },
  },
  server: {
    port: 3000,   // הפורט שתריץ עליו את ה-CRM
    open: true    // יפתח אוטומטית בדפדפן
  }
})
