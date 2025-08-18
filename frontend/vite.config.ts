import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Performance optimizations for production builds
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          icons: ['@heroicons/react']
        }
      }
    },
    // Enable source maps for debugging but optimize for production
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification (fallback to esbuild if terser not available)
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false
  },
  server: {
    // Development server optimizations
    hmr: {
      overlay: false // Disable error overlay for better performance
    }
  },
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev server startup
    include: ['react', 'react-dom', 'react-router-dom', '@heroicons/react']
  }
})
