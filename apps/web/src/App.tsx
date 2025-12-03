import { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'
import ScrollManager from './components/ScrollManager'
import DebugPanel from './components/DebugPanel'
import { debugLog } from './components/DebugPanel'
import { useTelegram } from './hooks/useTelegram'
import { queryClient } from './config/queryClient'

// Lazy load all pages for code splitting
const Home = lazy(() => import('./pages/Home'))
const Category = lazy(() => import('./pages/Category'))
const MaterialCategories = lazy(() => import('./pages/MaterialCategories'))
const Product = lazy(() => import('./pages/Product'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'))
const Orders = lazy(() => import('./pages/Orders'))

// Premium page loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-6">
      {/* Granite-style loading spinner */}
      <div className="relative w-12 h-12">
        {/* Outer ring */}
        <div 
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(139, 107, 63, 0.4) 50%, transparent 100%)',
            animationDuration: '1.2s',
          }}
        />
        {/* Inner circle */}
        <div 
          className="absolute inset-1 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)',
          }}
        />
        {/* Center dot */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
        >
          <div 
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{
              background: 'rgba(139, 107, 63, 0.6)',
              animationDuration: '1s',
            }}
          />
        </div>
      </div>
      
      {/* Loading text with shimmer effect */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-body text-white/40">Загрузка</span>
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  </div>
)

function AppContent() {
  const [isLoading, setIsLoading] = useState(true)
  const { isReady, sendDataToServer } = useTelegram()

  // Логируем начальную загрузку
  useEffect(() => {
    debugLog.info('🚀 App started', {
      isReady,
      userAgent: navigator.userAgent,
      platform: (window as any).Telegram?.WebApp?.platform,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    })
  }, [])

  useEffect(() => {
    // Минимальное время показа экрана загрузки - 1.5 секунды для красоты (уменьшено для мобильных)
    const minLoadingTime = 1500
    const startTime = Date.now()
    let timeoutTimer: ReturnType<typeof setTimeout>
    let browserTimer: ReturnType<typeof setTimeout>

    // Таймаут для гарантированного завершения загрузки (особенно для браузера без Telegram)
    timeoutTimer = setTimeout(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, minLoadingTime - elapsed)
      setTimeout(() => {
        console.log('Loading timeout reached, showing app')
        setIsLoading(false)
      }, remaining)
    }, 3000) // 3 секунды максимум

    if (isReady) {
      // Валидация initData на сервере (только в Telegram)
      sendDataToServer()
        .then((success) => {
          // Даже если валидация не прошла, продолжаем работу (для разработки)
          if (!success) {
            console.warn('InitData validation failed, but continuing...')
          }
        })
        .catch((error) => {
          console.error('Error during initData validation:', error)
        })
        .finally(() => {
          // Завершаем загрузку после валидации, но не раньше минимального времени
          const elapsed = Date.now() - startTime
          const remaining = Math.max(0, minLoadingTime - elapsed)
          clearTimeout(timeoutTimer)
          setTimeout(() => {
            setIsLoading(false)
          }, remaining)
        })
    } else {
      // Если Telegram не готов (браузер без Telegram), показываем экран минимум 1.5 секунды
      browserTimer = setTimeout(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, minLoadingTime - elapsed)
        clearTimeout(timeoutTimer)
        setTimeout(() => {
          console.log('Running in browser mode (no Telegram), showing app')
          setIsLoading(false)
        }, remaining)
      }, 100)
    }

    return () => {
      clearTimeout(timeoutTimer)
      if (browserTimer) clearTimeout(browserTimer)
    }
  }, [isReady, sendDataToServer])

  const handleLoadingComplete = () => {
    setIsLoading(false)
  }

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ScrollManager />
      <Layout>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/materials/:material" element={<MaterialCategories />} />
            <Route path="/c/:slug" element={<Category />} />
            <Route path="/p/:slug" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success/:id" element={<OrderSuccess />} />
            <Route path="/orders" element={<Orders />} />
          </Routes>
        </Suspense>
      </Layout>
      {/* Debug Panel - включаем везде для отладки проблемы с корзиной */}
      <DebugPanel />
    </BrowserRouter>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      {/* React Query Devtools - только в development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
            color: '#fff',
            border: '1px solid rgba(139, 107, 63, 0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  )
}

export default App

