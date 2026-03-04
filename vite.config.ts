import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: 'localhost',
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core and routing
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/') ||
              id.includes('node_modules/use-sync-external-store/')
            ) {
              return 'react-vendor';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // UI primitives (Radix + lucide + cmdk + sonner + vaul)
            if (id.includes('@radix-ui') || id.includes('lucide') || id.includes('cmdk') || id.includes('sonner') || id.includes('vaul')) {
              return 'ui-vendor';
            }
            // i18n
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n-vendor';
            }
            // Charting
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charting-vendor';
            }
            // Animation
            if (id.includes('gsap')) {
              return 'animation-vendor';
            }
            // HTML2Canvas (heavy, rarely used)
            if (id.includes('html2canvas')) {
              return 'html2canvas-vendor';
            }
            // CSS/utility libs
            if (id.includes('tailwind-merge') || id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwindcss-animate')) {
              return 'css-utils-vendor';
            }
            // Date libs
            if (id.includes('date-fns') || id.includes('react-day-picker')) {
              return 'date-vendor';
            }
            // CSV parsing
            if (id.includes('papaparse')) {
              return 'csv-vendor';
            }
            // Carousel / resizable
            if (id.includes('embla') || id.includes('react-resizable')) {
              return 'layout-vendor';
            }
            // Forms
            if (id.includes('react-hook-form')) {
              return 'forms-vendor';
            }
            // Remaining node_modules
            return 'vendor';
          }
        },
      },
    },
  },
})
