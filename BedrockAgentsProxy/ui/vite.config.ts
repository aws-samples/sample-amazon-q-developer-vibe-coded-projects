import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true, // This will make Vite fail if port 3000 is not available
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  // Ensure CSS is properly processed and included in the build
  css: {
    // Enable CSS modules for all CSS files
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  // Optimize the build to include all necessary styles
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1500, // Increase the warning limit to avoid warnings for large chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Group Amplify UI styles together
          'amplify-ui': ['@aws-amplify/ui-react/styles.css'],
          // Split vendor code
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-aws': ['aws-amplify', '@aws-amplify/ui-react'],
          'vendor-utils': ['react-transition-group', 'framer-motion']
        },
      },
    },
  },
})
