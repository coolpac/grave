import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { imagetools } from 'vite-imagetools'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    imagetools({
      // Generate multiple sizes for responsive images
      defaultDirectives: (url) => {
        if (url.searchParams.has('optimized')) {
          return new URLSearchParams({
            format: 'webp',
            quality: '80',
          })
        }
        return new URLSearchParams()
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Ritual Goods - Мрамор и Гранит',
        short_name: 'Ritual Goods',
        description: 'Оптовые продажи изделий из мрамора и гранита',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/vite.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      // Отключаем генерацию иконок если файлы отсутствуют
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  build: {
    // Code splitting configuration
    chunkSizeWarningLimit: 500,
    // Ensure proper module preloading order
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps) => {
        // Ensure vendor-react is always preloaded first
        const reactChunk = deps.find(dep => dep.includes('vendor-react'))
        if (reactChunk) {
          return [reactChunk, ...deps.filter(dep => !dep.includes('vendor-react'))]
        }
        return deps
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk - React and core libraries (MUST be loaded first)
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router')
          ) {
            return 'vendor-react'
          }

          // UI library chunk
          if (id.includes('@monorepo/ui') || id.includes('packages/ui')) {
            return 'vendor-ui'
          }

          // Heavy libraries chunk
          if (
            id.includes('node_modules/framer-motion') ||
            id.includes('node_modules/react-zoom-pan-pinch')
          ) {
            return 'vendor-animations'
          }

          // React Query and state management
          if (
            id.includes('node_modules/@tanstack/react-query') ||
            id.includes('node_modules/zustand')
          ) {
            return 'vendor-state'
          }

          // Form libraries
          if (
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/@hookform/resolvers') ||
            id.includes('node_modules/zod')
          ) {
            return 'vendor-forms'
          }

          // Markdown and content
          if (
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/remark-gfm')
          ) {
            return 'vendor-markdown'
          }

          // Telegram SDK
          if (id.includes('node_modules/@twa-dev/sdk')) {
            return 'vendor-telegram'
          }

          // Utilities
          if (
            id.includes('node_modules/axios') ||
            id.includes('node_modules/clsx') ||
            id.includes('node_modules/lucide-react') ||
            id.includes('node_modules/react-hot-toast')
          ) {
            return 'vendor-utils'
          }

          // Page-specific chunks
          if (id.includes('/pages/Home')) {
            return 'page-home'
          }
          if (id.includes('/pages/Product')) {
            return 'page-product'
          }
          if (id.includes('/pages/Category') || id.includes('/pages/MaterialCategories')) {
            return 'page-category'
          }
          if (id.includes('/pages/Cart')) {
            return 'page-cart'
          }
          if (id.includes('/pages/Checkout')) {
            return 'page-checkout'
          }
          if (id.includes('/pages/Order') || id.includes('/pages/Orders')) {
            return 'page-orders'
          }

          // Other node_modules go to vendor-other (but only if not React-related)
          if (id.includes('node_modules') && 
              !id.includes('react') && 
              !id.includes('react-dom') && 
              !id.includes('react-router')) {
            return 'vendor-other'
          }
        },
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk'
          return `js/${chunkInfo.name || facadeModuleId}-[hash].js`
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `img/[name]-[hash][extname]`
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
      },
    },
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // Minification
    minify: 'esbuild',
    // Target modern browsers for smaller bundle
    target: 'esnext',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Для разработки можно использовать dev эндпоинт
        // rewrite: (path) => path.replace(/^\/api/, '/api-dev')
      }
    }
  }
})
