/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  
  // Build optimizations for 8GB RAM systems
  build: {
    // Reduce chunk size for better loading performance
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'google-ai': ['@google/generative-ai'],
          'dexie': ['dexie'],
          
          // Feature-based chunks
          'audio-services': [
            './src/services/AudioCapture.ts',
            './src/services/GeminiTranscription.ts',
            './src/utils/MemoryManager.ts'
          ],
          'database': [
            './src/dbs/db.ts',
            './src/dbs/repo.ts',
            './src/dbs/optimizedDb.ts'
          ],
          'components-dashboard': [
            './src/components/dashboard/BusinessDashboard.tsx'
          ],
          'components-chat': [
            './src/components/chat/ChatPage.tsx',
            './src/components/chat/ChatInterface.tsx'
          ],
          'components-inventory': [
            './src/components/inventory/InventoryPage.tsx'
          ],
          'components-transactions': [
            './src/components/transactions/TransactionPage.tsx',
            './src/components/transaction/TransactionConfirmationModal.tsx'
          ]
        }
      }
    },
    
    // Optimize for production
    minify: 'esbuild',
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    
    // Target modern browsers for better optimization
    target: 'es2020'
  },
  
  // Development optimizations
  server: {
    // Reduce memory usage during development
    hmr: {
      overlay: false // Disable error overlay to reduce memory usage
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@google/generative-ai',
      'dexie'
    ],
    exclude: [
      'vitest' // Exclude vitest from optimization to prevent it from being loaded in dev
    ]
  },
  
  // Performance settings
  esbuild: {
    // Drop console and debugger in production
    drop: mode === 'production' ? ['console', 'debugger'] : []
  },

  // Test configuration
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Exclude test files from dev server
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
    ]
  }
}))