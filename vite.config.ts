import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (
            id.includes('recharts') ||
            id.includes('/d3-') ||
            id.includes('victory-vendor') ||
            id.includes('react-is')
          ) {
            return 'charts'
          }
          if (id.includes('i18next')) return 'i18n'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'react'
          }
          return 'vendor'
        },
      },
    },
  },
})
