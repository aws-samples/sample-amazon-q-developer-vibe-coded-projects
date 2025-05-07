import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true, 
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        ws: false, 
      },
      '/novasonic': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        ws: true, 
      },
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1500, 
    rollupOptions: {
      output: {
        manualChunks: {
          'amplify-ui': ['@aws-amplify/ui-react/styles.css'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-aws': ['aws-amplify', '@aws-amplify/ui-react'],
          'vendor-utils': ['react-transition-group', 'framer-motion']
        },
      },
    },
  },
})
